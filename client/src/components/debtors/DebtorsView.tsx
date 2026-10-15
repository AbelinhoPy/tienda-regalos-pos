import React, { useState } from 'react';
import { Users, AlertTriangle, CheckCircle2, DollarSign, HandCoins, X } from 'lucide-react';
import { CurrencyRates, Customer, Currency } from '../../types';

interface DebtorsViewProps {
  rates: CurrencyRates;
}

const INITIAL_DEBTORS: Customer[] = [
  { id: 2, name: 'María González', phone: '0981 123 456', creditLimitGs: 1500000, saldoPendienteGs: 450000 },
  { id: 3, name: 'Carlos Benítez', phone: '0971 654 321', creditLimitGs: 800000, saldoPendienteGs: 230000 },
  { id: 5, name: 'Silvia Ferreira', phone: '0982 555 777', creditLimitGs: 2500000, saldoPendienteGs: 920000 }
];

export const DebtorsView: React.FC<DebtorsViewProps> = ({ rates }) => {
  const [debtors, setDebtors] = useState<Customer[]>(INITIAL_DEBTORS);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Modal de Abono
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentCurrency, setPaymentCurrency] = useState<Currency>('GS');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  const totalDeudaGlobalGs = debtors.reduce((acc, c) => acc + c.saldoPendienteGs, 0);

  // Conversión del abono a Guaraníes
  const calculatedAbonoGs = () => {
    const raw = Number(amountPaid) || 0;
    if (paymentCurrency === 'GS') return raw;
    if (paymentCurrency === 'BRL') return Math.round(raw * rates.BRL_TO_GS);
    if (paymentCurrency === 'USD') return Math.round(raw * rates.USD_TO_GS);
    return raw;
  };

  const handleOpenPayment = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPaymentCurrency('GS');
    setAmountPaid('');
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedCustomer) return;
    const abonoGs = calculatedAbonoGs();

    if (abonoGs <= 0) {
      alert('Ingrese un monto válido mayor a 0');
      return;
    }

    // Actualizar cliente en la lista
    setDebtors(
      debtors.map((c) => {
        if (c.id === selectedCustomer.id) {
          const nuevoSaldo = Math.max(0, c.saldoPendienteGs - abonoGs);
          return { ...c, saldoPendienteGs: nuevoSaldo };
        }
        return c;
      })
    );

    setIsPaymentModalOpen(false);
    setPaymentSuccess(
      `¡Abono de Gs. ${abonoGs.toLocaleString()} registrado para ${selectedCustomer.name}!`
    );
    setTimeout(() => setPaymentSuccess(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Control de Deudores (Cuentas por Cobrar)
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Seguimiento de clientes morosos, límites de crédito y recepción de entregas parciales multimoneda.
          </p>
        </div>

        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl flex items-center gap-4">
          <div>
            <span className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wider block">
              Total Cuentas por Cobrar
            </span>
            <p className="text-xl font-extrabold font-mono text-red-600 dark:text-red-400">
              Gs. {totalDeudaGlobalGs.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {paymentSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {paymentSuccess}
        </div>
      )}

      {/* Tabla de Clientes Deudores */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase font-semibold text-[11px]">
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Teléfono</th>
                <th className="py-3 px-3 text-right">Límite de Crédito</th>
                <th className="py-3 px-3 text-right">Saldo Pendiente (Gs.)</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {debtors.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-800 dark:text-zinc-200">
                    {customer.name}
                  </td>
                  <td className="py-3 px-3 text-zinc-500 font-mono">
                    {customer.phone || 'Sin teléfono'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                    Gs. {customer.creditLimitGs.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-red-600 dark:text-red-400">
                    Gs. {customer.saldoPendienteGs.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {customer.saldoPendienteGs > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> Deudor Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                        Al Día
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleOpenPayment(customer)}
                      disabled={customer.saldoPendienteGs === 0}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    >
                      <HandCoins className="w-3.5 h-3.5" />
                      Registrar Abono
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Registrar Abono Multimoneda */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                  Registrar Abono a Cuenta
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Cliente: <span className="font-semibold text-slate-800 dark:text-zinc-200">{selectedCustomer.name}</span>
                </p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl flex justify-between items-center">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Saldo pendiente actual:</span>
              <span className="font-mono font-bold text-red-600 dark:text-red-400">
                Gs. {selectedCustomer.saldoPendienteGs.toLocaleString()}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Moneda en que Entrega el Cliente
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['GS', 'BRL', 'USD'] as Currency[]).map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setPaymentCurrency(curr)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        paymentCurrency === curr
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {curr === 'GS' ? 'Gs.' : curr === 'BRL' ? 'R$' : 'US$'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Monto Entregado ({paymentCurrency})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 font-mono text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
              </div>

              {/* Conversión del abono a Gs */}
              {paymentCurrency !== 'GS' && (
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Cotización aplicada:</span>
                    <span className="font-mono font-bold text-indigo-600">
                      Gs. {paymentCurrency === 'BRL' ? rates.BRL_TO_GS : rates.USD_TO_GS}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 dark:text-zinc-200">
                    <span>Acreditación a deuda:</span>
                    <span className="font-mono text-emerald-600">
                      Gs. {calculatedAbonoGs().toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl text-xs flex justify-between items-center">
                <span className="text-zinc-500">Nuevo Saldo Pendiente:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                  Gs. {Math.max(0, selectedCustomer.saldoPendienteGs - calculatedAbonoGs()).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={calculatedAbonoGs() <= 0}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white rounded-xl font-bold text-sm shadow-md transition-colors"
            >
              Confirmar Abono y Actualizar Saldo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
