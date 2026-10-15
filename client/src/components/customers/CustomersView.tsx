import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, AlertTriangle, Phone, Check, X,
  HandCoins, UserCheck, Loader2, RefreshCw, Pencil, Trash2
} from 'lucide-react';
import { Customer, CurrencyRates, Currency } from '../../types';
import { api } from '../../services/api';

interface CustomersViewProps { rates: CurrencyRates; }

const EMPTY_FORM = { name: '', documentId: '', phone: '', email: '', creditLimitGs: 1000000 };

export const CustomersView: React.FC<CustomersViewProps> = ({ rates }) => {
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast]           = useState<{ msg: string; type: 'ok'|'error' } | null>(null);

  // Modal nuevo/editar cliente
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  // Modal abono
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentCurrency, setPaymentCurrency] = useState<Currency>('GS');
  const [amountPaid, setAmountPaid] = useState('');

  const showToast = (msg: string, type: 'ok'|'error' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Cargar clientes desde la API ───────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api.get<Customer[]>('/api/customers');
      setCustomers(data);
    } catch (e: any) {
      setError('No se pudo cargar el listado de clientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm)) ||
    (c.documentId && c.documentId.includes(searchTerm))
  );

  const totalDeudaGs = customers.reduce((acc, c) => acc + c.saldoPendienteGs, 0);

  // ── Abrir modal nuevo / editar ─────────────────────────────────────────────
  const handleOpenNew = () => {
    setEditingCustomer(null);
    setForm(EMPTY_FORM);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setForm({
      name: c.name,
      documentId: c.documentId || '',
      phone: c.phone || '',
      email: (c as any).email || '',
      creditLimitGs: c.creditLimitGs,
    });
    setIsAddModalOpen(true);
  };

  // ── Guardar cliente ────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingCustomer) {
        await api.put(`/api/customers/${editingCustomer.id}`, form);
        showToast(`Cliente ${form.name} actualizado.`);
      } else {
        await api.post('/api/customers', form);
        showToast(`¡Cliente ${form.name} registrado!`);
      }
      setIsAddModalOpen(false);
      fetchCustomers();
    } catch (e: any) {
      showToast(e.message || 'Error al guardar cliente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar (desactivar) ──────────────────────────────────────────────────
  const handleDelete = async (c: Customer) => {
    if (!confirm(`¿Eliminar a "${c.name}"? No aparecerá más en el sistema.`)) return;
    try {
      await api.delete(`/api/customers/${c.id}`);
      showToast(`Cliente ${c.name} eliminado.`);
      fetchCustomers();
    } catch (e: any) {
      showToast(e.message || 'Error al eliminar.', 'error');
    }
  };

  // ── Abono ──────────────────────────────────────────────────────────────────
  const calculatedAbonoGs = () => {
    const raw = Number(amountPaid) || 0;
    if (paymentCurrency === 'GS')  return raw;
    if (paymentCurrency === 'BRL') return Math.round(raw * rates.BRL_TO_GS);
    if (paymentCurrency === 'USD') return Math.round(raw * rates.USD_TO_GS);
    return raw;
  };

  const handleConfirmPayment = async () => {
    if (!selectedCustomer) return;
    const abonoGs = calculatedAbonoGs();
    if (abonoGs <= 0) { alert('Ingrese un monto válido'); return; }
    try {
      await api.post('/api/debts/payment', {
        customerId: selectedCustomer.id,
        currency: paymentCurrency,
        rateApplied: paymentCurrency === 'GS' ? 1 : paymentCurrency === 'BRL' ? rates.BRL_TO_GS : rates.USD_TO_GS,
        amountPaid: Number(amountPaid),
        amountAppliedGs: abonoGs,
        paymentMethod: `EFECTIVO_${paymentCurrency}`,
      });
      setIsPaymentModalOpen(false);
      setAmountPaid('');
      showToast(`Abono de Gs. ${abonoGs.toLocaleString()} acreditado a ${selectedCustomer.name}.`);
      fetchCustomers();
    } catch (e: any) {
      showToast(e.message || 'Error al registrar abono.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Clientes & Cuentas Corrientes
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Control de créditos, deudas y cobranzas multimoneda.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchCustomers} className="p-2 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Actualizar">
            <RefreshCw className="w-4 h-4" />
          </button>
          {totalDeudaGs > 0 && (
            <div className="px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-right">
              <span className="text-[10px] text-red-500 font-bold uppercase block">Total Fiados</span>
              <span className="font-mono font-bold text-red-600 dark:text-red-400 text-sm">
                Gs. {totalDeudaGs.toLocaleString()}
              </span>
            </div>
          )}
          <button onClick={handleOpenNew}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 border ${
          toast.type === 'ok'
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-700'
            : 'bg-red-50 dark:bg-red-950/20 border-red-200 text-red-600'
        }`}>
          {toast.type === 'ok' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Buscador */}
      <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, CI/RUC o teléfono..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm text-zinc-500">Cargando clientes...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-semibold text-red-500">{error}</p>
            <button onClick={fetchCustomers} className="text-xs text-indigo-600 underline">Reintentar</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-10 h-10 text-zinc-200 dark:text-zinc-700 mx-auto" />
            <p className="text-sm font-semibold text-zinc-500">
              {customers.length === 0 ? 'No hay clientes registrados aún.' : 'Sin resultados para esa búsqueda.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 text-zinc-500 uppercase font-semibold text-[11px]">
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Doc. CI/RUC</th>
                  <th className="py-3 px-3">Teléfono</th>
                  <th className="py-3 px-3 text-right">Límite Crédito</th>
                  <th className="py-3 px-3 text-right">Saldo Deudor</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filtered.map(c => {
                  const isDebtor = c.saldoPendienteGs > 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800 dark:text-zinc-200">{c.name}</p>
                        <span className="text-[10px] text-zinc-400">{(c as any).email || '—'}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-600 dark:text-zinc-400">{c.documentId || '—'}</td>
                      <td className="py-3 px-3 font-mono text-zinc-600 dark:text-zinc-400">{c.phone || '—'}</td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                        Gs. {c.creditLimitGs.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span className={isDebtor ? 'text-red-600 dark:text-red-400' : 'text-zinc-400'}>
                          Gs. {c.saldoPendienteGs.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isDebtor ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-950/60 px-2.5 py-0.5 rounded-full animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> Deudor
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
                            <UserCheck className="w-3 h-3" /> Al Día
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleOpenEdit(c)} title="Editar"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {isDebtor && (
                            <button onClick={() => { setSelectedCustomer(c); setAmountPaid(''); setPaymentCurrency('GS'); setIsPaymentModalOpen(true); }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors">
                              <HandCoins className="w-3.5 h-3.5" /> Abonar
                            </button>
                          )}
                          <button onClick={() => handleDelete(c)} title="Eliminar"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: Nuevo / Editar Cliente ─────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                {editingCustomer ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {[
                { label: 'Nombre Completo *', key: 'name', type: 'text', placeholder: 'Ej: Laura Benítez', required: true },
                { label: 'C.I. o RUC', key: 'documentId', type: 'text', placeholder: '4.123.456-7', required: false },
                { label: 'Teléfono', key: 'phone', type: 'text', placeholder: '0981 123 456', required: false },
                { label: 'Correo electrónico', key: 'email', type: 'email', placeholder: 'cliente@gmail.com', required: false },
              ].map(({ label, key, type, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">{label}</label>
                  <input type={type} required={required} value={(form as any)[key]}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Límite de Crédito (Gs.)
                </label>
                <input type="number" step="50000" value={form.creditLimitGs}
                  onChange={e => setForm(prev => ({ ...prev, creditLimitGs: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm font-bold font-mono focus:ring-2 focus:ring-indigo-500 outline-none" />
                <span className="text-[10px] text-zinc-400">Monto máximo que se le puede fiar.</span>
              </div>
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingCustomer ? 'Guardar cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Abono ─────────────────────────────────────────────────── */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">Registrar Abono</h3>
                <p className="text-xs text-zinc-500">Cliente: <span className="font-semibold">{selectedCustomer.name}</span></p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-3.5 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl flex justify-between items-center">
              <span className="text-xs font-medium text-zinc-600">Saldo pendiente:</span>
              <span className="font-mono font-bold text-red-600">Gs. {selectedCustomer.saldoPendienteGs.toLocaleString()}</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Moneda Recibida</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['GS','BRL','USD'] as Currency[]).map(curr => (
                    <button key={curr} type="button" onClick={() => setPaymentCurrency(curr)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        paymentCurrency === curr ? 'bg-indigo-600 text-white' : 'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                      }`}>
                      {curr === 'GS' ? 'Gs.' : curr === 'BRL' ? 'R$' : 'US$'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Monto ({paymentCurrency})</label>
                <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                  placeholder="0" autoFocus
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 font-mono text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              {paymentCurrency !== 'GS' && Number(amountPaid) > 0 && (
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-xs flex justify-between font-bold">
                  <span className="text-zinc-600">Se acredita:</span>
                  <span className="font-mono text-emerald-600">Gs. {calculatedAbonoGs().toLocaleString()}</span>
                </div>
              )}
            </div>
            <button onClick={handleConfirmPayment} disabled={calculatedAbonoGs() <= 0}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-bold text-sm shadow-md transition-colors">
              Confirmar Abono
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
