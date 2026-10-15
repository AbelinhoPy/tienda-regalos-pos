import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign, TrendingUp, CreditCard, Banknote, Calendar,
  ShieldCheck, PieChart, RefreshCw, Receipt,
  CheckCircle2, ChevronDown, ChevronUp, Trash2, Loader2,
  Pencil, X, Check
} from 'lucide-react';
import { CurrencyRates } from '../../types';
import { api } from '../../services/api';

function parseGuaraniInput(val: string): number {
  if (!val) return 0;
  const clean = val.toLowerCase().trim().replace(/\s+/g, '');
  if (clean.endsWith('mil') || clean.endsWith('k')) {
    const num = parseFloat(clean.replace(/mil|k/g, '').replace(/\./g, '').replace(/,/g, '.'));
    return isNaN(num) ? 0 : Math.round(num * 1000);
  }
  const digits = clean.replace(/[^0-9]/g, '');
  return parseInt(digits, 10) || 0;
}

interface DailySaleItem {
  id: number;
  quantity: number;
  precioUnitarioGs: number;
  costoUnitarioGs: number;
  subtotalVentaGs: number;
  utilidadItemGs: number;
  variant: { barcode: string; size: string; color: string; product: { name: string; category: string } };
}

interface DailySale {
  id: number;
  invoiceNumber: string;
  paymentMethod: string;
  totalVentaGs: number;
  totalCostoGsReal: number;
  utilidadNetaGs: number;
  saleDate: string;
  montoRecibidoGs: number;
  montoRecibidoBrl: number;
  montoRecibidoUsd: number;
  vueltoGs: number;
  customer?: { id: number; name: string; phone?: string };
  items: DailySaleItem[];
}

interface DailySummary {
  fecha: string;
  ventas: DailySale[];
  resumen: {
    totalVentasGs: number;
    totalCostoGs: number;
    totalUtilidadGs: number;
    cantidadVentas: number;
    ticketPromedio: number;
    ventasPorMetodo: Record<string, { count: number; total: number }>;
  };
}

interface CashAuditViewProps { rates: CurrencyRates; }

export const CashAuditView: React.FC<CashAuditViewProps> = ({ rates }) => {
  const [salesData, setSalesData]         = useState<DailySummary | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [selectedDate, setSelectedDate]   = useState(new Date().toISOString().split('T')[0]);
  const [expandedId, setExpandedId]       = useState<number | null>(null);
  const [toast, setToast]                 = useState('');
  const [openCashier, setOpenCashier]     = useState('');
  const [shiftOpen, setShiftOpen]         = useState(false);
  const [initialGs, setInitialGs]         = useState('');
  const [initialBrl, setInitialBrl]       = useState('');
  const [initialUsd, setInitialUsd]       = useState('');

  // Edición de venta
  const [editingSale, setEditingSale]     = useState<DailySale | null>(null);
  const [editAmountInput, setEditAmountInput] = useState('');
  const [savingEdit, setSavingEdit]       = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchDailySales = useCallback(async (date: string) => {
    setLoading(true); setError('');
    try {
      const data = await api.get<DailySummary>(`/api/sales/daily?date=${date}`);
      setSalesData(data);
    } catch (e: any) {
      setError('No se pudo cargar el arqueo. ¿Está corriendo el backend?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDailySales(selectedDate); }, [fetchDailySales, selectedDate]);

  const metrics = useMemo(() => {
    if (!salesData) return null;
    const { resumen } = salesData;
    const efectivoBrl = salesData.ventas.reduce((s, v) => s + v.montoRecibidoBrl, 0);
    const efectivoUsd = salesData.ventas.reduce((s, v) => s + v.montoRecibidoUsd, 0);
    const efectivoGs  = salesData.ventas.filter(v => v.paymentMethod !== 'CREDITO_FIADO').reduce((s, v) => s + v.montoRecibidoGs, 0);
    const totalFiado  = salesData.ventas.filter(v => v.paymentMethod === 'CREDITO_FIADO').reduce((s, v) => s + v.totalVentaGs, 0);
    return { ...resumen, efectivoBrl, efectivoUsd, efectivoGs, totalFiado };
  }, [salesData]);

  const PAYMENT_LABELS: Record<string, string> = {
    EFECTIVO_GS: 'Efectivo Gs.', EFECTIVO_BRL: 'Efectivo R$', EFECTIVO_USD: 'Efectivo US$',
    TARJETA_POS: 'Tarjeta POS', TRANSFERENCIA: 'Transferencia',
    CREDITO_FIADO: 'Crédito/Fiado', CONTADO: 'Contado', MIXTO: 'Pago Mixto',
  };

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!openCashier.trim()) return;
    setShiftOpen(true);
    showToast(`Turno abierto para ${openCashier}.`);
  };

  const handleCloseShift = () => {
    if (!confirm('¿Cerrar el turno de caja?')) return;
    setShiftOpen(false);
    setOpenCashier('');
    showToast('Turno cerrado.');
  };

  const handleOpenEditSale = (sale: DailySale) => {
    setEditingSale(sale);
    setEditAmountInput(sale.totalVentaGs.toString());
  };

  const handleSaveEditSale = async () => {
    if (!editingSale) return;
    const num = parseGuaraniInput(editAmountInput);
    if (num <= 0) {
      showToast('Por favor ingresá un monto válido mayor a 0.');
      return;
    }
    setSavingEdit(true);
    try {
      await api.put(`/api/sales/${editingSale.id}`, { totalVentaGs: num });
      showToast(`Venta ${editingSale.invoiceNumber} corregida a Gs. ${num.toLocaleString()}.`);
      setEditingSale(null);
      fetchDailySales(selectedDate);
    } catch (e: any) {
      showToast(e.message || 'Error al actualizar la venta.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteSale = async (sale: DailySale) => {
    const ok = confirm(`¿Estás seguro de anular la venta "${sale.invoiceNumber}" por Gs. ${sale.totalVentaGs.toLocaleString()}?\n\nEsta acción devolverá automáticamente los productos vendidos al stock.`);
    if (!ok) return;
    try {
      await api.delete(`/api/sales/${sale.id}`);
      showToast(`Venta ${sale.invoiceNumber} anulada y stock devuelto.`);
      fetchDailySales(selectedDate);
    } catch (e: any) {
      showToast(e.message || 'Error al anular la venta.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-semibold shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-indigo-600" /> Arqueo de Caja & Utilidad Real
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Datos reales desde el servidor, sincronizados en todos los dispositivos.</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
          <button onClick={() => fetchDailySales(selectedDate)}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Apertura de turno */}
      {!shiftOpen ? (
        <form onSubmit={handleOpenShift}
          className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/10 flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">Abrir Turno de Caja</label>
            <input type="text" value={openCashier} onChange={e => setOpenCashier(e.target.value)}
              placeholder="Nombre del cajero/a"
              className="w-full px-3 py-2 border border-indigo-200 dark:border-indigo-800 rounded-xl text-sm bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          {[
            { label: 'Fondo Gs.', val: initialGs, set: setInitialGs },
            { label: 'Fondo R$', val: initialBrl, set: setInitialBrl },
            { label: 'Fondo US$', val: initialUsd, set: setInitialUsd },
          ].map(({ label, val, set }) => (
            <div key={label} className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-semibold block">{label}</label>
              <input type="number" min={0} value={val} onChange={e => set(e.target.value)} placeholder="0"
                className="w-24 px-2 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono bg-white dark:bg-zinc-900 text-right outline-none" />
            </div>
          ))}
          <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md whitespace-nowrap">
            Abrir Turno
          </button>
        </form>
      ) : (
        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <div>
              <p className="text-sm font-bold">Turno abierto — {openCashier}</p>
              <p className="text-xs text-emerald-600/70">Fondo: Gs. {Number(initialGs||0).toLocaleString()} · R$ {initialBrl||0} · US$ {initialUsd||0}</p>
            </div>
          </div>
          <button onClick={handleCloseShift}
            className="px-4 py-2 border border-red-200 dark:border-red-800 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors">
            Cerrar Turno
          </button>
        </div>
      )}

      {/* KPIs */}
      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm text-zinc-500">Cargando datos del arqueo...</p>
        </div>
      ) : error ? (
        <div className="py-12 text-center space-y-2">
          <p className="text-sm font-semibold text-red-500">{error}</p>
          <button onClick={() => fetchDailySales(selectedDate)} className="text-xs text-indigo-600 underline">Reintentar</button>
        </div>
      ) : metrics && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Ventas del Día', value: `Gs. ${metrics.totalVentasGs.toLocaleString()}`, sub: `${metrics.cantidadVentas} venta${metrics.cantidadVentas !== 1 ? 's' : ''}`, icon: <DollarSign className="w-4 h-4 text-indigo-500" />, color: 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900' },
              { label: 'Costo Mercaderías', value: `Gs. ${metrics.totalCostoGs.toLocaleString()}`, sub: 'Costo real', icon: <PieChart className="w-4 h-4 text-amber-500" />, color: 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900' },
              { label: 'Utilidad Neta', value: `Gs. ${metrics.totalUtilidadGs.toLocaleString()}`, sub: metrics.totalVentasGs > 0 ? `Margen: ${((metrics.totalUtilidadGs / metrics.totalVentasGs)*100).toFixed(1)}%` : '0%', icon: <TrendingUp className="w-4 h-4 text-emerald-500" />, color: 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10' },
              { label: 'Crédito / Fiado', value: `Gs. ${metrics.totalFiado.toLocaleString()}`, sub: 'Cuentas por cobrar', icon: <ShieldCheck className="w-4 h-4 text-amber-500" />, color: 'border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10' },
            ].map(({ label, value, sub, icon, color }) => (
              <div key={label} className={`p-5 rounded-2xl border shadow-sm ${color}`}>
                <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold uppercase mb-2">
                  <span>{label}</span>{icon}
                </div>
                <p className="text-2xl font-black font-mono text-slate-900 dark:text-zinc-100">{value}</p>
                <p className="text-[11px] text-zinc-400 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Desglose caja */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-indigo-600" /> Efectivo Recibido (Gaveta)
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Guaraníes (Gs.)', value: `Gs. ${metrics.efectivoGs.toLocaleString()}`, color: 'text-slate-800 dark:text-zinc-200' },
                  { label: `Reales (R$) · cotiz. ${rates.BRL_TO_GS}`, value: `R$ ${metrics.efectivoBrl.toFixed(2)} ≈ Gs. ${(metrics.efectivoBrl * rates.BRL_TO_GS).toLocaleString()}`, color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: `Dólares (US$) · cotiz. ${rates.USD_TO_GS}`, value: `US$ ${metrics.efectivoUsd.toFixed(2)} ≈ Gs. ${(metrics.efectivoUsd * rates.USD_TO_GS).toLocaleString()}`, color: 'text-indigo-600 dark:text-indigo-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    <span className="text-xs text-zinc-500">{label}</span>
                    <span className={`font-mono font-bold text-sm ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" /> Por Método de Cobro
              </h3>
              <div className="space-y-2.5">
                {Object.entries(metrics.ventasPorMetodo).map(([method, data]) => (
                  <div key={method} className="flex items-center justify-between py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    <span className="text-xs text-zinc-500">{PAYMENT_LABELS[method] || method} ({data.count})</span>
                    <span className="font-mono font-bold text-sm text-slate-800 dark:text-zinc-200">Gs. {data.total.toLocaleString()}</span>
                  </div>
                ))}
                {Object.keys(metrics.ventasPorMetodo).length === 0 && (
                  <p className="text-xs text-zinc-400 text-center py-4">Sin ventas registradas este día.</p>
                )}
              </div>
            </div>
          </div>

          {/* Listado de ventas */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-600" />
                Detalle de Ventas — {salesData?.ventas.length || 0} registro{salesData?.ventas.length !== 1 ? 's' : ''}
              </h3>
            </div>

            {!salesData?.ventas.length ? (
              <div className="py-16 text-center">
                <Receipt className="w-10 h-10 text-zinc-200 dark:text-zinc-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-zinc-400">Sin ventas para este día.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {salesData.ventas.map(sale => {
                  const isExpanded = expandedId === sale.id;
                  return (
                    <div key={sale.id}>
                      <div className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : sale.id)}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${sale.paymentMethod === 'CREDITO_FIADO' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-800 dark:text-zinc-200">{sale.invoiceNumber}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sale.paymentMethod === 'CREDITO_FIADO' ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700'}`}>
                                {PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400">
                              {sale.customer?.name || 'Consumidor Final'} · {new Date(sale.saleDate).toLocaleString('es-PY')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                          <span className="font-mono font-bold text-sm text-slate-900 dark:text-zinc-100">Gs. {sale.totalVentaGs.toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSale(sale)}
                            className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                            title="Editar monto de esta venta"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSale(sale)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                            title="Anular venta y devolver stock"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                            className="p-1 text-zinc-400 hover:text-zinc-600"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-5 py-3 bg-slate-50/60 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                          {sale.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                              <span>{item.quantity}x {item.variant.product.name} ({item.variant.size} · {item.variant.color})</span>
                              <span className="font-mono font-semibold">Gs. {item.subtotalVentaGs.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 grid grid-cols-3 gap-2 text-xs">
                            <div><span className="text-zinc-400 block">Costo real</span><span className="font-mono font-bold text-zinc-600">Gs. {sale.totalCostoGsReal.toLocaleString()}</span></div>
                            <div><span className="text-zinc-400 block">Utilidad</span><span className="font-mono font-bold text-emerald-600">Gs. {sale.utilidadNetaGs.toLocaleString()}</span></div>
                            {sale.vueltoGs > 0 && (
                              <div><span className="text-zinc-400 block">Vuelto</span><span className="font-mono font-bold text-indigo-600">Gs. {sale.vueltoGs.toLocaleString()}</span></div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── MODAL: Corregir / Editar Monto de Venta ───────────────────────── */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                Corregir Venta {editingSale.invoiceNumber}
              </h3>
              <button onClick={() => setEditingSale(null)} className="p-1 text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl space-y-1.5 border border-zinc-100 dark:border-zinc-800">
                <p className="text-zinc-500">
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">Cliente:</span> {editingSale.customer?.name || 'Consumidor Final'}
                </p>
                <p className="text-zinc-500">
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">Hora:</span> {new Date(editingSale.saleDate).toLocaleString('es-PY')}
                </p>
                <p className="text-zinc-500">
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">Ítems:</span> {editingSale.items.map(i => `${i.quantity}x ${i.variant.product.name} (${i.variant.size})`).join(', ')}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Monto Real de la Venta (Gs.) *
                </label>
                <input
                  type="text"
                  value={editAmountInput}
                  onChange={e => setEditAmountInput(e.target.value)}
                  placeholder="Ej: 350000 o 350mil"
                  className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm font-bold font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />

                {(() => {
                  const num = parseGuaraniInput(editAmountInput);
                  return (
                    <div className="mt-2 space-y-1">
                      {num < 1000 && num > 0 && (
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between gap-2">
                          <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                            ⚠️ ¿Escribiste {num} en vez de {num * 1000}?
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditAmountInput((num * 1000).toString())}
                            className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg whitespace-nowrap shadow-sm"
                          >
                            Poner Gs. {(num * 1000).toLocaleString()}
                          </button>
                        </div>
                      )}
                      {num > 0 && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                          ✓ Monto que se guardará: Gs. {num.toLocaleString()}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEditSale}
                disabled={savingEdit || parseGuaraniInput(editAmountInput) <= 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Guardar corrección
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
