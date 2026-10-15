import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Search, Filter, RefreshCw, Eye, Download,
  Copy, Pencil, Trash2, CheckCircle2, XCircle, AlertTriangle,
  Clock, Check, X, Loader2, ArrowUpRight, DollarSign, Users
} from 'lucide-react';
import { Quote, QuoteStatus, BusinessInfo, Currency } from '../../types';
import { api } from '../../services/api';
import { QuoteEditorModal } from './QuoteEditorModal';
import { QuotePdfPreviewModal } from './QuotePdfPreviewModal';

interface QuotesViewProps {
  businessInfo: BusinessInfo;
}

export const QuotesView: React.FC<QuotesViewProps> = ({ businessInfo }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'error' } | null>(null);

  // Modales
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  
  // Vista previa PDF
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewQuoteNumber, setPreviewQuoteNumber] = useState('');
  const [previewClientName, setPreviewClientName] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const showToast = (msg: string, type: 'ok' | 'error' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Cargar lista de presupuestos
  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qParams = new URLSearchParams();
      if (searchTerm.trim()) qParams.set('search', searchTerm.trim());
      if (selectedStatus !== 'TODOS') qParams.set('status', selectedStatus);

      const url = `/api/quotes${qParams.toString() ? `?${qParams.toString()}` : ''}`;
      const data = await api.get<Quote[]>(url);
      setQuotes(data || []);
    } catch (e: any) {
      setError(e.message || 'Error al cargar presupuestos.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedStatus]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Manejo de PDF para visualización o descarga
  const handleOpenPdf = async (quote: Quote) => {
    setPreviewQuoteNumber(quote.quoteNumber);
    setPreviewClientName(quote.clientName);
    setIsPreviewOpen(true);
    setPreviewLoading(true);

    try {
      const encodedBusiness = encodeURIComponent(JSON.stringify(businessInfo));
      const res = await fetch(`/api/quotes/${quote.id}/pdf?business=${encodedBusiness}`);
      if (!res.ok) throw new Error('Error al generar el PDF del presupuesto');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
    } catch (e: any) {
      showToast(e.message || 'Error al generar el PDF', 'error');
      setIsPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Descarga directa sin abrir modal
  const handleDirectDownload = async (quote: Quote) => {
    try {
      showToast(`Generando PDF de ${quote.quoteNumber}...`);
      const encodedBusiness = encodeURIComponent(JSON.stringify(businessInfo));
      const res = await fetch(`/api/quotes/${quote.id}/pdf?business=${encodedBusiness}`);
      if (!res.ok) throw new Error('Error al descargar el PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const safeClient = (quote.clientName || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
      const a = document.createElement('a');
      a.href = url;
      a.download = `Presupuesto_${quote.quoteNumber}_${safeClient}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`PDF ${quote.quoteNumber} descargado exitosamente.`);
    } catch (e: any) {
      showToast(e.message || 'Error al descargar el PDF', 'error');
    }
  };

  // Previsualización al vuelo desde el editor modal (antes de guardar)
  const handlePreviewUnsaved = async (quoteData: any) => {
    setPreviewQuoteNumber(quoteData.quoteNumber || 'PPTO-VISTA-PREVIA');
    setPreviewClientName(quoteData.clientName || 'Cliente');
    setIsPreviewOpen(true);
    setPreviewLoading(true);

    try {
      const res = await fetch('/api/quotes/preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteData,
          businessInfo,
        }),
      });

      if (!res.ok) throw new Error('Error al generar previsualización del PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
    } catch (e: any) {
      showToast(e.message || 'Error al previsualizar PDF', 'error');
      setIsPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Duplicar
  const handleDuplicate = async (id: number) => {
    try {
      const cloned = await api.post<Quote>(`/api/quotes/${id}/duplicate`);
      showToast(`Presupuesto duplicado como ${cloned.quoteNumber}.`);
      fetchQuotes();
    } catch (e: any) {
      showToast(e.message || 'Error al duplicar', 'error');
    }
  };

  // Cambiar estado
  const handleStatusChange = async (id: number, status: QuoteStatus) => {
    try {
      await api.patch(`/api/quotes/${id}/status`, { status });
      showToast(`Estado actualizado a ${status}.`);
      fetchQuotes();
    } catch (e: any) {
      showToast(e.message || 'Error al actualizar estado', 'error');
    }
  };

  // Eliminar
  const handleDelete = async (id: number, quoteNumber: string) => {
    if (!confirm(`¿Eliminar definitivamente el presupuesto ${quoteNumber}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/api/quotes/${id}`);
      showToast(`Presupuesto ${quoteNumber} eliminado.`);
      fetchQuotes();
    } catch (e: any) {
      showToast(e.message || 'Error al eliminar', 'error');
    }
  };

  // Estadísticas rápidas
  const stats = {
    total: quotes.length,
    emitidos: quotes.filter((q) => q.status === 'EMITIDO').length,
    aceptados: quotes.filter((q) => q.status === 'ACEPTADO').length,
    vencidos: quotes.filter((q) => q.isExpired).length,
    montoTotalGs: quotes.reduce((acc, q) => acc + (q.currency === 'GS' ? q.total : 0), 0),
  };

  const getStatusBadge = (status: QuoteStatus, isExpired?: boolean) => {
    if (isExpired && status === 'EMITIDO') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
          <AlertTriangle className="w-3 h-3" /> Vencido
        </span>
      );
    }

    switch (status) {
      case 'EMITIDO':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300 px-2 py-0.5 rounded-full border border-sky-300 dark:border-sky-800">
            <Clock className="w-3 h-3" /> Emitido
          </span>
        );
      case 'ACEPTADO':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Aceptado
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 dark:bg-red-950/60 dark:text-red-300 px-2 py-0.5 rounded-full border border-red-300 dark:border-red-800">
            <XCircle className="w-3 h-3" /> Cancelado
          </span>
        );
      case 'BORRADOR':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700">
            Borrador
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Presupuestos de Venta
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Cotizaciones comerciales con PDF profesional · Formato A4 oficial
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchQuotes}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-zinc-800 transition-colors"
            title="Actualizar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingQuote(null);
              setIsEditorOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Presupuesto</span>
          </button>
        </div>
      </div>

      {/* Toast notificaciones */}
      {toast && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border animate-fade-in ${
            toast.type === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 text-red-600 dark:text-red-300'
          }`}
        >
          {toast.type === 'ok' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Cotizaciones</span>
          <p className="text-2xl font-black text-slate-900 dark:text-zinc-100">{stats.total}</p>
          <span className="text-[11px] text-zinc-400 font-semibold">Todas las emisiones</span>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">Emitidos Activos</span>
          <p className="text-2xl font-black text-sky-600 dark:text-sky-400">{stats.emitidos}</p>
          <span className="text-[11px] text-zinc-400 font-semibold">Esperando respuesta</span>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Aceptados</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.aceptados}</p>
          <span className="text-[11px] text-zinc-400 font-semibold">Cerrados con éxito</span>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Ofertas Vencidas</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.vencidos}</p>
          <span className="text-[11px] text-zinc-400 font-semibold">Superaron la validez</span>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por N° PPTO, cliente o RUC..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          {['TODOS', 'EMITIDO', 'ACEPTADO', 'BORRADOR', 'CANCELADO'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedStatus === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Presupuestos */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm text-zinc-500">Cargando presupuestos...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-sm font-semibold text-red-500">{error}</p>
            <button onClick={fetchQuotes} className="text-xs text-indigo-600 underline font-semibold">
              Reintentar
            </button>
          </div>
        ) : quotes.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <FileText className="w-12 h-12 text-zinc-200 dark:text-zinc-700 mx-auto" />
            <p className="text-sm font-semibold text-zinc-500">
              {searchTerm || selectedStatus !== 'TODOS'
                ? 'No se encontraron presupuestos con los filtros aplicados.'
                : 'Todavía no hay presupuestos emitidos.'}
            </p>
            <button
              onClick={() => {
                setEditingQuote(null);
                setIsEditorOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" /> Crear primer presupuesto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 text-zinc-500 uppercase font-semibold text-[11px]">
                  <th className="py-3 px-4">N° Presupuesto</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Fecha / Validez</th>
                  <th className="py-3 px-3 text-center">Ítems</th>
                  <th className="py-3 px-3 text-right">Total</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {quotes.map((q) => {
                  const dateStr = q.date ? new Date(q.date).toLocaleDateString() : '';
                  return (
                    <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                      {/* Nro y Código */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-zinc-100">
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{q.quoteNumber}</span>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-3">
                        <p className="font-bold text-slate-800 dark:text-zinc-200 leading-snug">{q.clientName}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {q.clientDocument ? `RUC: ${q.clientDocument}` : ''}
                          {q.clientPhone ? ` · Tel: ${q.clientPhone}` : ''}
                        </p>
                      </td>

                      {/* Fecha y Validez */}
                      <td className="py-3.5 px-3">
                        <p className="text-zinc-700 dark:text-zinc-300 font-medium">{dateStr}</p>
                        <p className="text-[10px] text-zinc-400">Validez: {q.validityDays} días</p>
                      </td>

                      {/* Cantidad de ítems */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold font-mono">
                          {q.items?.length || 0}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-3 text-right font-mono font-extrabold text-sm text-slate-900 dark:text-zinc-100">
                        {q.currency === 'GS' ? `₲ ${q.total.toLocaleString()}` : `${q.currency} ${q.total.toFixed(2)}`}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-3 text-center">{getStatusBadge(q.status, q.isExpired)}</td>

                      {/* Acciones */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* Previsualizar PDF */}
                          <button
                            type="button"
                            onClick={() => handleOpenPdf(q)}
                            className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                            title="Ver / Previsualizar PDF A4"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Descargar PDF */}
                          <button
                            type="button"
                            onClick={() => handleDirectDownload(q)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Descargar PDF directo"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuote(q);
                              setIsEditorOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Editar presupuesto"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Duplicar */}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(q.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                            title="Duplicar como nuevo borrador"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Aceptar / Cancelar cambio rápido */}
                          {q.status === 'EMITIDO' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(q.id, 'ACEPTADO')}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                              title="Marcar como Aceptado"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Eliminar */}
                          <button
                            type="button"
                            onClick={() => handleDelete(q.id, q.quoteNumber)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Eliminar presupuesto"
                          >
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

      {/* Modal Editor de Presupuesto */}
      <QuoteEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSaved={(newOrUpdated) => {
          showToast(`Presupuesto ${newOrUpdated.quoteNumber} guardado con éxito.`);
          fetchQuotes();
        }}
        editingQuote={editingQuote}
        businessInfo={businessInfo}
        onPreviewPdf={handlePreviewUnsaved}
      />

      {/* Modal Visor de PDF */}
      <QuotePdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          if (previewPdfUrl) {
            URL.revokeObjectURL(previewPdfUrl);
            setPreviewPdfUrl(null);
          }
        }}
        pdfUrl={previewPdfUrl}
        quoteNumber={previewQuoteNumber}
        clientName={previewClientName}
        loading={previewLoading}
      />
    </div>
  );
};
