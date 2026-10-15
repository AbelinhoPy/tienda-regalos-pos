import { RegisterPurchaseInput } from '../types';
import { CurrencyService } from './currency.service';
import { ProductService } from './product.service';
import { prisma } from '../prisma';

export interface ProcessedPurchaseItem {
  variantId: number;
  quantity: number;
  costoMonedaOrigen: number;
  costoGsReal: number;
  margenGananciaPct: number;
  precioVentaGs: number;
  subtotalMonedaOrigen: number;
  subtotalGsReal: number;
}

export interface ProcessedPurchaseResult {
  purchaseNumber: string;
  supplierName?: string;
  currency: string;
  cotizacionCompraReal: number;
  totalMonedaOrigen: number;
  totalGsReal: number;
  items: ProcessedPurchaseItem[];
}

export class PurchaseService {
  public static async registerPurchase(
    input: RegisterPurchaseInput
  ): Promise<ProcessedPurchaseResult> {
    if (!input.items || input.items.length === 0) {
      throw new Error('La compra debe contener al menos un producto.');
    }

    let cotizacionCompraReal = 1.0;
    if (input.currency !== 'GS') {
      if (input.customRate && input.customRate > 0) {
        cotizacionCompraReal = input.customRate;
      } else {
        const rates = await CurrencyService.getDailyRates();
        cotizacionCompraReal = input.currency === 'BRL' ? rates.BRL_TO_GS : rates.USD_TO_GS;
      }
    }

    const computed = input.items.map((item) => {
      const costoGsReal = Math.round(item.costoMonedaOrigen * cotizacionCompraReal);
      const margenMultiplier = 1 + (item.margenGananciaPct || 0) / 100;
      const precioVentaGs = Math.round((costoGsReal * margenMultiplier) / 1000) * 1000;
      const subtotalMonedaOrigen = Number((item.costoMonedaOrigen * item.quantity).toFixed(2));
      const subtotalGsReal = costoGsReal * item.quantity;
      return { item, costoGsReal, precioVentaGs, subtotalMonedaOrigen, subtotalGsReal };
    });

    const totalMonedaOrigen = computed.reduce((s, r) => s + r.subtotalMonedaOrigen, 0);
    const totalGsReal = computed.reduce((s, r) => s + r.subtotalGsReal, 0);

    const processedItems: ProcessedPurchaseItem[] = [];

    for (const row of computed) {
      const variant = await ProductService.upsertVariantFromPurchase({
        variantId: row.item.variantId,
        barcode: row.item.barcode,
        productName: row.item.productName,
        category: row.item.category,
        size: row.item.size,
        color: row.item.color,
        quantity: row.item.quantity,
        costoGsReal: row.costoGsReal,
        precioVentaGs: row.precioVentaGs,
      });

      processedItems.push({
        variantId: variant.id,
        quantity: row.item.quantity,
        costoMonedaOrigen: row.item.costoMonedaOrigen,
        costoGsReal: row.costoGsReal,
        margenGananciaPct: row.item.margenGananciaPct,
        precioVentaGs: row.precioVentaGs,
        subtotalMonedaOrigen: row.subtotalMonedaOrigen,
        subtotalGsReal: row.subtotalGsReal,
      });
    }

    await prisma.purchase.create({
      data: {
        purchaseNumber: input.purchaseNumber,
        supplierName: input.supplierName,
        currency: input.currency,
        cotizacionCompraReal,
        totalMonedaOrigen,
        totalGsReal,
        notes: input.notes,
        items: {
          create: processedItems.map((it) => ({
            variantId: it.variantId,
            quantity: it.quantity,
            costoMonedaOrigen: it.costoMonedaOrigen,
            costoGsReal: it.costoGsReal,
            margenGananciaPct: it.margenGananciaPct,
            precioVentaGs: it.precioVentaGs,
          })),
        },
      },
    });

    return {
      purchaseNumber: input.purchaseNumber,
      supplierName: input.supplierName,
      currency: input.currency,
      cotizacionCompraReal,
      totalMonedaOrigen: Number(totalMonedaOrigen.toFixed(2)),
      totalGsReal,
      items: processedItems,
    };
  }
}
