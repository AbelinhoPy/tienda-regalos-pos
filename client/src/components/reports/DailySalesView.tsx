import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, DollarSign, ShoppingCart, ArrowUp, ArrowDown, RefreshCw, Pencil, Trash2, X, Check, Loader2 } from 'lucide-react';

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

interface SaleItem {
  id: number;
  variantId: number;
  quantity: number;
  precioUnitarioGs: number;
  costoUnitarioGs: number;
  subtotalVentaGs: number;
  utilidadItemGs: number;
  variant: {
    id: number;
    barcode: string;
    size: string;
    color: string;
    product: {
      name: string;
      category: string;
    };
  };
}

interface Sale {
  id: number;
  invoiceNumber: string;
  customerId?: number;
  paymentMethod: string;
  totalVentaGs: number;
  totalCostoGsReal: number;
  utilidadNetaGs: number;
  saleDate: string;
  customer?: {
    id: number;
    name: string;
    phone?: string;
  };
  items: SaleItem[];
}

interface DailySalesData {
  fecha: string;
  ventas: Sale[];
  resumen: {
    totalVentasGs: number;
    totalCostoGs: number;
    totalUtilidadGs: number;
    cantidadVentas: number;
    ticketPromedio: number;
    ventasPorMetodo: Record<string, { count: number; total: number }>;
  };
}

interface DailySalesViewProps {
  rates?: { BRL_TO_GS: number; USD_TO_GS: number };
}

export function DailySalesView({ rates }: DailySalesViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesData, setSalesData] = useState<DailySalesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edición y anulación de ventas
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editAmountInput, setEditAmountInput] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'error' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDailySales = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/sales/daily?date=${date}`);
      if (!response.ok) throw new Error('Error al obtener ventas del día');
      const data = await response.json();
      if (data.success) {
        setSalesData(data.data);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setEditAmountInput(sale.totalVentaGs.toString());
  };

  const handleSaveEditSale = async () => {
    if (!editingSale) return;
    const num = parseGuaraniInput(editAmountInput);
    if (num <= 0) {
      showToast('Ingresá un monto mayor a 0', 'error');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/sales/${editingSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalVentaGs: num })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Error al actualizar');
      }
      showToast(`Venta ${editingSale.invoiceNumber} corregida a Gs. ${num.toLocaleString()}`);
      setEditingSale(null);
      fetchDailySales(selectedDate);
    } catch (e: any) {
      showToast(e.message || 'Error al actualizar venta', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteSale = async (sale: Sale) => {
    const ok = confirm(`¿Estás seguro de anular la venta "${sale.invoiceNumber}" de Gs. ${sale.totalVentaGs.toLocaleString()}?\n\nEl stock de las prendas se restaurará automáticamente.`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/sales/${sale.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || 'Error al anular');
      showToast(`Venta ${sale.invoiceNumber} anulada y stock devuelto.`);
      fetchDailySales(selectedDate);
    } catch (e: any) {
      showToast(e.message || 'Error al anular venta', 'error');
    }
  };

  useEffect(() => {
    fetchDailySales(selectedDate);
  }, [selectedDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'EFECTIVO_GS': 'Efectivo Gs.',
      'EFECTIVO_BRL': 'Efectivo R$',
      'EFECTIVO_USD': 'Efectivo US$',
      'TARJETA_POS': 'Tarjeta POS',
      'TRANSFERENCIA': 'Transferencia',
      'CREDITO_FIADO': 'Crédito/Fiado',
      'MIXTO': 'Pago Mixto'
    };
    return labels[method] || method;
  };

  const getPaymentMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      'EFECTIVO_GS': 'bg-green-100 text-green-800',
      'EFECTIVO_BRL': 'bg-blue-100 text-blue-800',
      'EFECTIVO_USD': 'bg-purple-100 text-purple-800',
      'TARJETA_POS': 'bg-yellow-100 text-yellow-800',
      'TRANSFERENCIA': 'bg-cyan-100 text-cyan-800',
      'CREDITO_FIADO': 'bg-red-100 text-red-800',
      'MIXTO': 'bg-gray-100 text-gray-800'
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  if (loading && !salesData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-4xl text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-medium">Error: {error}</p>
        <button
          onClick={() => fetchDailySales(selectedDate)}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ventas del Día</h2>
          <p className="text-gray-600 dark:text-gray-400">Análisis detallado de ventas por fecha</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="text-gray-500" size={20} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {salesData && (
        <>
          {/* Resumen del Día */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Ventas</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(salesData.resumen.totalVentasGs)}</p>
                </div>
                <DollarSign size={32} className="text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Utilidad Neta</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(salesData.resumen.totalUtilidadGs)}</p>
                </div>
                <TrendingUp size={32} className="text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Cantidad Ventas</p>
                  <p className="text-2xl font-bold mt-1">{salesData.resumen.cantidadVentas}</p>
                </div>
                <ShoppingCart size={32} className="text-purple-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Ticket Promedio</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(salesData.resumen.ticketPromedio)}</p>
                </div>
                <ArrowUp size={32} className="text-orange-200" />
              </div>
            </div>
          </div>

          {/* Ventas por Método de Pago */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ventas por Método de Pago</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(salesData.resumen.ventasPorMetodo).map(([method, data]) => (
                <div key={method} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentMethodColor(method)}`}>
                      {getPaymentMethodLabel(method)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">{data.count} ventas</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(data.total)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de Ventas */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Detalle de Ventas ({salesData.ventas.length})
              </h3>
              <button
                onClick={() => fetchDailySales(selectedDate)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Actualizar
              </button>
            </div>

            {salesData.ventas.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <ShoppingCart size={48} className="mx-auto mb-2 opacity-50" />
                <p>No hay ventas registradas para esta fecha</p>
              </div>
            ) : (
              <div className="space-y-4">
                {salesData.ventas.map((sale) => (
                  <div key={sale.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                          {sale.invoiceNumber}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentMethodColor(sale.paymentMethod)}`}>
                          {getPaymentMethodLabel(sale.paymentMethod)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(sale.totalVentaGs)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDateTime(sale.saleDate)}
                        </p>
                      </div>
                    </div>

                    {sale.customer && (
                      <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Cliente:</span> {sale.customer.name}
                        {sale.customer.phone && <span className="ml-2">({sale.customer.phone})</span>}
                      </div>
                    )}

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Productos:</p>
                      <div className="space-y-1">
                        {sale.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">
                              {item.quantity}x {item.variant.product.name} ({item.variant.size} - {item.variant.color})
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency(item.subtotalVentaGs)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-between items-center gap-2 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Utilidad:</span>
                        <span className={`text-xs font-bold ${sale.utilidadNetaGs >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(sale.utilidadNetaGs)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSale(sale)}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg flex items-center gap-1 transition-colors"
                          title="Editar monto"
                        >
                          <Pencil size={13} />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSale(sale)}
                          className="px-2.5 py-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-lg flex items-center gap-1 transition-colors"
                          title="Anular venta y restaurar stock"
                        >
                          <Trash2 size={13} />
                          Anular
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2 ${
          toast.type === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Modal de edición */}
      {editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                Corregir Monto ({editingSale.invoiceNumber})
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
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">Hora:</span> {formatDateTime(editingSale.saleDate)}
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
}