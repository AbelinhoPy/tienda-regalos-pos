import React from 'react';
import { X, Download, Printer, ExternalLink, Loader2 } from 'lucide-react';

interface QuotePdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  quoteNumber: string;
  clientName: string;
  loading?: boolean;
}

export const QuotePdfPreviewModal: React.FC<QuotePdfPreviewModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  quoteNumber,
  clientName,
  loading = false,
}) => {
  if (!isOpen) return null;

  const safeClient = (clientName || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Presupuesto_${quoteNumber}_${safeClient}.pdf`;

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-5xl w-full h-[92vh] flex flex-col overflow-hidden">
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900 shrink-0">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <span>📄 Vista Previa: {quoteNumber}</span>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">· {clientName}</span>
            </h3>
            <p className="text-xs text-zinc-400">Formato A4 Vertical oficial para impresión y descarga</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!pdfUrl || loading}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Abrir en pestaña nueva / Imprimir"
            >
              <ExternalLink className="w-4 h-4 text-zinc-500" />
              <span className="hidden sm:inline">Abrir</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!pdfUrl || loading}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
              title="Descargar PDF"
            >
              <Download className="w-4 h-4" />
              <span>Descargar PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-2"
              title="Cerrar vista previa"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visor del PDF */}
        <div className="flex-1 bg-zinc-100 dark:bg-zinc-950 p-2 sm:p-4 flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-semibold">Generando documento PDF...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              title="Vista previa del Presupuesto"
              className="w-full h-full rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-md bg-white"
            />
          ) : (
            <div className="text-center text-zinc-400">
              <p className="text-sm">No se pudo cargar la vista previa del documento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
