import { DailyCashAuditFilter, DailyCashAuditResult } from '../types';
import { CurrencyService } from './currency.service';
import { prisma } from '../prisma';

export class CashService {
  /**
   * Generar la consulta del arqueo de caja diario con resumen multimoneda real.
   *
   * - Desglose de ingresos por billetes/divisa (Total Gs., Total R$, Total US$).
   * - Desglose por método (Efectivo, POS/Tarjeta, Transferencia, Crédito/Fiado emitido).
   * - Ganancia Neta Real: Utilidad_Neta = Sum(Precio_Venta_Gs - Costo_Gs_Real).
   * - Total de abonos recaudados en el día.
   */
  public static async getDailyCashAudit(
    filter: DailyCashAuditFilter = {},
    dbClient?: any
  ): Promise<DailyCashAuditResult> {
    const client = dbClient || prisma;
    const targetDateStr = filter.date || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' }).format(new Date());
    
    // Rango completo del día en zona horaria de Paraguay (-03:00)
    const startOfDay = new Date(`${targetDateStr}T00:00:00-03:00`);
    const endOfDay = new Date(`${targetDateStr}T23:59:59.999-03:00`);

    // 1. Obtener todas las ventas del día
    const sales = await client.sale.findMany({
      where: {
        saleDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        items: true,
      },
    });

    // 2. Obtener todos los abonos de deudas del día
    const debtPayments = await client.debtPayment.findMany({
      where: {
        paymentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    let totalVentasGs = 0;
    let totalCostoGsReal = 0;
    let efectivoGs = 0;
    let efectivoBrl = 0;
    let efectivoUsd = 0;

    let tarjetaGs = 0;
    let transferenciaGs = 0;
    let creditoFiadoGs = 0;

    for (const s of sales) {
      totalVentasGs += s.totalVentaGs;
      totalCostoGsReal += s.totalCostoGsReal;

      if (s.paymentMethod === 'CREDITO_FIADO') {
        creditoFiadoGs += s.totalVentaGs;
      } else if (s.paymentMethod === 'TARJETA' || s.paymentMethod === 'TARJETA_POS') {
        tarjetaGs += s.totalVentaGs;
      } else if (s.paymentMethod === 'TRANSFERENCIA') {
        transferenciaGs += s.totalVentaGs;
      } else {
        // Cobros en efectivo multimoneda
        efectivoGs += (s.montoRecibidoGs || 0) - (s.vueltoGs || 0);
        efectivoBrl += s.montoRecibidoBrl || 0;
        efectivoUsd += s.montoRecibidoUsd || 0;
      }
    }

    // Sumar los abonos recibidos al efectivo o banco
    let totalAbonosCobradosGs = 0;
    for (const p of debtPayments) {
      totalAbonosCobradosGs += p.amountAppliedGs;
      if (p.currency === 'GS') efectivoGs += p.amountPaid;
      else if (p.currency === 'BRL') efectivoBrl += p.amountPaid;
      else if (p.currency === 'USD') efectivoUsd += p.amountPaid;
    }

    const rates = await CurrencyService.getDailyRates();
    const brlInGs = efectivoBrl * rates.BRL_TO_GS;
    const usdInGs = efectivoUsd * rates.USD_TO_GS;
    const totalEfectivoConvertidoGs = Math.round(efectivoGs + brlInGs + usdInGs);

    const utilidadNetaGs = totalVentasGs - totalCostoGsReal;
    const margenUtilidadPct =
      totalVentasGs > 0 ? Number(((utilidadNetaGs / totalVentasGs) * 100).toFixed(1)) : 0;

    return {
      date: targetDateStr,
      totalVentasGs,
      totalCostoGsReal,
      utilidadNetaGs,
      margenUtilidadPct,
      desgloseMonedas: {
        efectivoGs,
        efectivoBrl,
        efectivoUsd,
        totalEfectivoConvertidoGs,
      },
      desgloseMetodosGs: {
        efectivoTotalGs: totalEfectivoConvertidoGs,
        tarjetaGs,
        transferenciaGs,
        creditoFiadoGs,
      },
      ventasPorCobrarCount: sales.filter((s: any) => s.paymentMethod === 'CREDITO_FIADO').length,
      totalCreditosEmitidosGs: creditoFiadoGs,
      totalAbonosCobradosGs,
    };
  }

  /**
   * Reporte de Cuentas por Cobrar (Lista de Clientes Deudores real)
   */
  public static async getDebtorsReport(dbClient?: any): Promise<any[]> {
    const client = dbClient || prisma;
    return await client.customer.findMany({
      where: {
        saldoPendienteGs: { gt: 0 },
      },
      orderBy: {
        saldoPendienteGs: 'desc',
      },
      include: {
        debts: {
          where: { status: { in: ['PENDIENTE', 'PARCIAL'] } },
        },
      },
    });
  }
}
