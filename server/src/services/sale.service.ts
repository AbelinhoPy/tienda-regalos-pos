import { ProcessSaleInput } from '../types';
import { CurrencyService } from './currency.service';
import { prisma } from '../prisma';

export interface ProcessedSaleResult {
  invoiceNumber: string;
  customerId?: number;
  paymentMethod: string;
  totalVentaGs: number;
  totalCostoGsReal: number;
  utilidadNetaGs: number;
  totalRecibidoConvertidoGs: number;
  vueltoGs: number;
  isCredit: boolean;
  debtCreatedId?: number;
  items: Array<{
    variantId: number;
    barcode: string;
    productName: string;
    size: string;
    color: string;
    quantity: number;
    precioUnitarioGs: number;
    costoUnitarioGs: number;
    subtotalVentaGs: number;
    utilidadItemGs: number;
  }>;
}

export class SaleService {
  public static async processSale(input: ProcessSaleInput): Promise<ProcessedSaleResult> {
    if (!input.items || input.items.length === 0) {
      throw new Error('La venta debe tener al menos un producto.');
    }

    const rates = await CurrencyService.getDailyRates();
    const rateBrl = input.appliedRateBrl || input.cotizacionBrl || rates.BRL_TO_GS;
    const rateUsd = input.appliedRateUsd || input.cotizacionUsd || rates.USD_TO_GS;
    const invoiceNumber = input.invoiceNumber || `TK-${Date.now().toString().slice(-8)}`;
    const isCredit = input.paymentMethod === 'CREDITO_FIADO';

    return prisma.$transaction(async (tx) => {
      let customer: { id: number; creditLimitGs: number; saldoPendienteGs: number } | null = null;
      if (input.customerId) {
        customer = await tx.customer.findUnique({ where: { id: input.customerId } });
        if (!customer) {
          throw new Error(`Cliente ID ${input.customerId} no encontrado.`);
        }
      }

      if (isCredit && !customer) {
        throw new Error('Para ventas a Crédito / Fiado es obligatorio seleccionar un Cliente.');
      }

      let totalVentaGs = 0;
      let totalCostoGsReal = 0;
      const processedItems: ProcessedSaleResult['items'] = [];

      for (const item of input.items) {
        let variant = null;
        if (item.barcode) {
          variant = await tx.productVariant.findUnique({
            where: { barcode: item.barcode.trim() },
            include: { product: true },
          });
        } else if (item.variantId) {
          variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            include: { product: true },
          });
        }

        if (!variant) {
          throw new Error(`Producto no encontrado: ${item.barcode || item.variantId}`);
        }

        if (variant.stock < item.quantity) {
          throw new Error(
            `Stock insuficiente para ${variant.product.name} (${variant.size} - ${variant.color}). Stock: ${variant.stock}`
          );
        }

        const precioUnitarioGs =
          item.precioUnitarioGs !== undefined ? item.precioUnitarioGs : variant.precioVentaGs;
        const costoUnitarioGs = variant.costoGsReal;
        const subtotalVentaGs = precioUnitarioGs * item.quantity;
        const utilidadItemGs = subtotalVentaGs - costoUnitarioGs * item.quantity;

        totalVentaGs += subtotalVentaGs;
        totalCostoGsReal += costoUnitarioGs * item.quantity;

        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: { decrement: item.quantity } },
        });

        processedItems.push({
          variantId: variant.id,
          barcode: variant.barcode,
          productName: variant.product.name,
          size: variant.size,
          color: variant.color,
          quantity: item.quantity,
          precioUnitarioGs,
          costoUnitarioGs,
          subtotalVentaGs,
          utilidadItemGs,
        });
      }

      const utilidadNetaGs = totalVentaGs - totalCostoGsReal;
      let vueltoGs = 0;
      let totalRecibidoConvertidoGs = 0;
      let createdDebtId: number | undefined;

      if (isCredit && customer) {
        if (
          customer.creditLimitGs > 0 &&
          customer.saldoPendienteGs + totalVentaGs > customer.creditLimitGs
        ) {
          throw new Error(
            `Límite de crédito excedido. Saldo: Gs. ${customer.saldoPendienteGs.toLocaleString()}, Compra: Gs. ${totalVentaGs.toLocaleString()}, Límite: Gs. ${customer.creditLimitGs.toLocaleString()}`
          );
        }

        await tx.customer.update({
          where: { id: customer.id },
          data: { saldoPendienteGs: { increment: totalVentaGs } },
        });
      } else {
        const gAmount = input.tenderedGs || input.montoRecibidoGs || 0;
        const brlConverted = Math.round((input.tenderedBrl || input.montoRecibidoBrl || 0) * rateBrl);
        const usdConverted = Math.round((input.tenderedUsd || input.montoRecibidoUsd || 0) * rateUsd);
        totalRecibidoConvertidoGs = gAmount + brlConverted + usdConverted;

        if (totalRecibidoConvertidoGs < totalVentaGs) {
          throw new Error(
            `Monto recibido insuficiente. Total: Gs. ${totalVentaGs.toLocaleString()} — Recibido: Gs. ${totalRecibidoConvertidoGs.toLocaleString()}`
          );
        }
        vueltoGs = Math.max(0, totalRecibidoConvertidoGs - totalVentaGs);
      }

      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: input.customerId || null,
          paymentMethod: input.paymentMethod,
          totalVentaGs,
          totalCostoGsReal,
          utilidadNetaGs,
          montoRecibidoGs: input.tenderedGs || input.montoRecibidoGs || 0,
          montoRecibidoBrl: input.tenderedBrl || input.montoRecibidoBrl || 0,
          montoRecibidoUsd: input.tenderedUsd || input.montoRecibidoUsd || 0,
          cotizacionBrl: rateBrl,
          cotizacionUsd: rateUsd,
          vueltoGs,
          items: {
            create: processedItems.map((pi) => ({
              variantId: pi.variantId,
              quantity: pi.quantity,
              precioUnitarioGs: pi.precioUnitarioGs,
              costoUnitarioGs: pi.costoUnitarioGs,
              subtotalVentaGs: pi.subtotalVentaGs,
              utilidadItemGs: pi.utilidadItemGs,
            })),
          },
        },
      });

      if (isCredit && customer) {
        const debt = await tx.debt.create({
          data: {
            customerId: customer.id,
            saleId: sale.id,
            montoOriginalGs: totalVentaGs,
            saldoRestanteGs: totalVentaGs,
            status: 'PENDIENTE',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        createdDebtId = debt.id;
      }

      return {
        invoiceNumber,
        customerId: input.customerId,
        paymentMethod: input.paymentMethod,
        totalVentaGs,
        totalCostoGsReal,
        utilidadNetaGs,
        totalRecibidoConvertidoGs,
        vueltoGs,
        isCredit,
        debtCreatedId: createdDebtId,
        items: processedItems,
      };
    });
  }

  public static async getDailySales(options: { date?: string } = {}) {
    const { date } = options;
    const dateStr = date || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' }).format(new Date());
    
    // Rango completo del día en zona horaria de Paraguay (-03:00)
    const startOfDay = new Date(`${dateStr}T00:00:00-03:00`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999-03:00`);

    const sales = await prisma.sale.findMany({
      where: { saleDate: { gte: startOfDay, lte: endOfDay } },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    name: true,
                    categoryName: true,
                    category: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { saleDate: 'desc' },
    });

    const totals = sales.reduce(
      (acc, sale) => {
        acc.totalVentas += sale.totalVentaGs;
        acc.totalCosto += sale.totalCostoGsReal;
        acc.totalUtilidad += sale.utilidadNetaGs;
        acc.cantidadVentas += 1;
        if (!acc.ventasPorMetodo[sale.paymentMethod]) {
          acc.ventasPorMetodo[sale.paymentMethod] = { count: 0, total: 0 };
        }
        acc.ventasPorMetodo[sale.paymentMethod].count += 1;
        acc.ventasPorMetodo[sale.paymentMethod].total += sale.totalVentaGs;
        return acc;
      },
      {
        totalVentas: 0,
        totalCosto: 0,
        totalUtilidad: 0,
        cantidadVentas: 0,
        ventasPorMetodo: {} as Record<string, { count: number; total: number }>,
      }
    );

    const mapped = sales.map((sale) => ({
      ...sale,
      items: sale.items.map((it) => ({
        ...it,
        variant: {
          ...it.variant,
          product: {
            name: it.variant.product.name,
            category: it.variant.product.category?.name || it.variant.product.categoryName || '',
          },
        },
      })),
    }));

    return {
      fecha: dateStr,
      ventas: mapped,
      resumen: {
        totalVentasGs: totals.totalVentas,
        totalCostoGs: totals.totalCosto,
        totalUtilidadGs: totals.totalUtilidad,
        cantidadVentas: totals.cantidadVentas,
        ticketPromedio: totals.cantidadVentas > 0 ? totals.totalVentas / totals.cantidadVentas : 0,
        ventasPorMetodo: totals.ventasPorMetodo,
      },
    };
  }

  public static async updateSale(
    id: number,
    data: {
      totalVentaGs?: number;
      paymentMethod?: string;
      items?: Array<{
        id: number;
        precioUnitarioGs: number;
        quantity?: number;
      }>;
    }
  ) {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true, debt: true },
    });
    if (!sale) throw new Error('Venta no encontrada');

    return prisma.$transaction(async (tx) => {
      let newTotalVentaGs = sale.totalVentaGs;

      if (data.items && data.items.length > 0) {
        let sumSubtotales = 0;
        for (const it of data.items) {
          const existingItem = sale.items.find((i) => i.id === it.id);
          if (existingItem) {
            const qty = it.quantity !== undefined ? it.quantity : existingItem.quantity;
            const unitPrice = Number(it.precioUnitarioGs);
            const subtotal = unitPrice * qty;
            const utilidad = subtotal - existingItem.costoUnitarioGs * qty;
            sumSubtotales += subtotal;

            await tx.saleItem.update({
              where: { id: it.id },
              data: {
                precioUnitarioGs: unitPrice,
                quantity: qty,
                subtotalVentaGs: subtotal,
                utilidadItemGs: utilidad,
              },
            });
          }
        }
        newTotalVentaGs = sumSubtotales;
      } else if (data.totalVentaGs !== undefined) {
        newTotalVentaGs = Number(data.totalVentaGs);
        if (sale.items.length === 1) {
          const it = sale.items[0];
          const newUnitPrice = Math.round(newTotalVentaGs / it.quantity);
          const newUtilidad = newTotalVentaGs - it.costoUnitarioGs * it.quantity;
          await tx.saleItem.update({
            where: { id: it.id },
            data: {
              precioUnitarioGs: newUnitPrice,
              subtotalVentaGs: newTotalVentaGs,
              utilidadItemGs: newUtilidad,
            },
          });
        }
      }

      const newUtilidadNetaGs = newTotalVentaGs - sale.totalCostoGsReal;
      const updated = await tx.sale.update({
        where: { id },
        data: {
          totalVentaGs: newTotalVentaGs,
          utilidadNetaGs: newUtilidadNetaGs,
          montoRecibidoGs: sale.paymentMethod !== 'CREDITO_FIADO' ? newTotalVentaGs : sale.montoRecibidoGs,
          paymentMethod: data.paymentMethod || sale.paymentMethod,
        },
        include: { items: { include: { variant: { include: { product: true } } } }, customer: true },
      });

      if (sale.debt) {
        await tx.debt.update({
          where: { id: sale.debt.id },
          data: {
            montoOriginalGs: newTotalVentaGs,
            saldoRestanteGs: newTotalVentaGs,
          },
        });
      }

      return updated;
    });
  }

  public static async deleteSale(id: number) {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true, debt: { include: { payments: true } } },
    });
    if (!sale) throw new Error('Venta no encontrada');

    // Restaurar el stock vendido de cada variante
    for (const item of sale.items) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      }).catch(() => {});
    }

    // Si tiene deuda vinculada, eliminar abonos y deuda
    if (sale.debt) {
      await prisma.debtPayment.deleteMany({ where: { debtId: sale.debt.id } });
      await prisma.debt.delete({ where: { id: sale.debt.id } });
    }

    // Eliminar items de venta y la venta
    await prisma.saleItem.deleteMany({ where: { saleId: id } });
    await prisma.sale.delete({ where: { id } });

    return { id, message: `Venta #${id} eliminada exitosamente y stock restaurado.` };
  }

  public static async clearAllSales() {
    await prisma.debtPayment.deleteMany();
    await prisma.debt.deleteMany();
    await prisma.saleItem.deleteMany();
    const result = await prisma.sale.deleteMany();
    return { count: result.count, message: 'Todas las ventas y cuentas asociadas han sido eliminadas.' };
  }
}

