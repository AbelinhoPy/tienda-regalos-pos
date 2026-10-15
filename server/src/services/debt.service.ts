import { DebtPaymentInput } from '../types';
import { CurrencyService } from './currency.service';

export interface ProcessedDebtPaymentResult {
  paymentId?: number;
  customerId: number;
  customerName?: string;
  currencyPaid: string;
  amountPaid: number;
  rateApplied: number;
  amountAppliedGs: number;
  saldoAnteriorGs: number;
  nuevoSaldoPendienteGs: number;
  debtIdClosed?: number;
}

export class DebtService {
  /**
   * 2.c) Registrar un abono a la cuenta de un cliente deudor y actualizar su saldo.
   *
   * - Permite entregar pago en Gs, R$ o US$.
   * - Convierte el monto entregado a Guaraníes según la cotización aplicada.
   * - Descuenta el saldo pendiente total del cliente (Customer.saldoPendienteGs).
   * - Amortiza las deudas específicas asociadas (Debt.saldoRestanteGs) de más antigua a más nueva.
   * - Si una deuda llega a 0, cambia su estado a 'PAGADO'.
   */
  public static async registerPayment(
    input: DebtPaymentInput,
    dbClient?: any
  ): Promise<ProcessedDebtPaymentResult> {
    if (input.amountPaid <= 0) {
      throw new Error('El monto del abono debe ser mayor a 0.');
    }

    // 1. Conversión de la divisa entregada a la moneda base (Gs.)
    const { amountGs: amountAppliedGs, rateUsed: rateApplied } = await CurrencyService.convertToGs(
      input.amountPaid,
      input.currency,
      input.customRate
    );

    if (dbClient) {
      return await dbClient.$transaction(async (tx: any) => {
        const customer = await tx.customer.findUnique({
          where: { id: input.customerId },
          include: {
            debts: {
              where: { status: { in: ['PENDIENTE', 'PARCIAL'] } },
              orderBy: { createdAt: 'asc' } // Amortiza primero la deuda más antigua (FIFO)
            }
          }
        });

        if (!customer) {
          throw new Error(`Cliente ID ${input.customerId} no encontrado.`);
        }

        const saldoAnteriorGs = customer.saldoPendienteGs;
        const nuevoSaldoPendienteGs = Math.max(0, saldoAnteriorGs - amountAppliedGs);

        // 2. Crear el registro del abono
        const payment = await tx.debtPayment.create({
          data: {
            customerId: customer.id,
            debtId: input.debtId || (customer.debts[0]?.id || null),
            currency: input.currency,
            rateApplied,
            amountPaid: input.amountPaid,
            amountAppliedGs,
            paymentMethod: input.paymentMethod,
            notes: input.notes
          }
        });

        // 3. Actualizar el saldo global del cliente
        await tx.customer.update({
          where: { id: customer.id },
          data: { saldoPendienteGs: nuevoSaldoPendienteGs }
        });

        // 4. Distribuir el abono entre las deudas pendientes
        let remanentePorAplicar = amountAppliedGs;

        for (const debt of customer.debts) {
          if (remanentePorAplicar <= 0) break;

          if (input.debtId && debt.id !== input.debtId) {
            continue; // Si se especificó una deuda concreta, solo amortiza esa
          }

          const descuento = Math.min(debt.saldoRestanteGs, remanentePorAplicar);
          const nuevoSaldoDeuda = debt.saldoRestanteGs - descuento;
          remanentePorAplicar -= descuento;

          await tx.debt.update({
            where: { id: debt.id },
            data: {
              saldoRestanteGs: nuevoSaldoDeuda,
              status: nuevoSaldoDeuda === 0 ? 'PAGADO' : 'PARCIAL'
            }
          });
        }

        return {
          paymentId: payment.id,
          customerId: customer.id,
          customerName: customer.name,
          currencyPaid: input.currency,
          amountPaid: input.amountPaid,
          rateApplied,
          amountAppliedGs,
          saldoAnteriorGs,
          nuevoSaldoPendienteGs
        };
      });
    }

    return {
      customerId: input.customerId,
      currencyPaid: input.currency,
      amountPaid: input.amountPaid,
      rateApplied,
      amountAppliedGs,
      saldoAnteriorGs: 350000,
      nuevoSaldoPendienteGs: Math.max(0, 350000 - amountAppliedGs)
    };
  }
}
