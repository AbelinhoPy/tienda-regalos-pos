import React from 'react';
import { Printer, Download, X, CheckCircle2, FileText, Store } from 'lucide-react';
import { CompletedSale, BusinessInfo } from '../../types';

interface TicketReceiptModalProps {
  sale: CompletedSale;
  businessInfo: BusinessInfo;
  onClose: () => void;
}

export const TicketReceiptModal: React.FC<TicketReceiptModalProps> = ({
  sale,
  businessInfo,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-6 space-y-5 my-8">
        {/* Encabezado del Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              Venta Exitosa #{sale.invoiceNumber}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENEDOR DEL TICKET IMPRIMIBLE (80mm) */}
        <div id="printable-ticket" className="p-5 rounded-2xl bg-white text-zinc-900 border border-zinc-300 shadow-inner font-mono text-xs space-y-3">
          {/* Membrete de la Empresa */}
          <div className="text-center space-y-1 pb-2 border-b border-dashed border-zinc-400">
            {businessInfo.logoUrl && (
              <img
                src={businessInfo.logoUrl}
                alt="Logo"
                className="w-12 h-12 mx-auto rounded-lg object-contain mb-1"
              />
            )}
            <h4 className="font-black text-sm uppercase tracking-wider text-zinc-900">
              {businessInfo.name}
            </h4>
            <p className="text-[11px] text-zinc-600">{businessInfo.legalName}</p>
            <p className="text-[11px] text-zinc-800 font-bold">RUC: {businessInfo.ruc}</p>
            <p className="text-[10px] text-zinc-500">{businessInfo.address}</p>
            <p className="text-[10px] text-zinc-500">{businessInfo.city}</p>
            <p className="text-[10px] text-zinc-500">Tel: {businessInfo.phone}</p>
          </div>

          {/* Datos del Comprobante */}
          <div className="text-[11px] space-y-1 pb-2 border-b border-dashed border-zinc-400">
            <div className="flex justify-between">
              <span>COMPROBANTE:</span>
              <span className="font-bold">{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>FECHA / HORA:</span>
              <span>{sale.date}</span>
            </div>
            <div className="flex justify-between">
              <span>CONDICIÓN:</span>
              <span className="font-bold uppercase">
                {sale.paymentMode === 'CREDITO_FIADO' ? 'CRÉDITO / FIADO' : 'CONTADO'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>CLIENTE:</span>
              <span className="font-bold">{sale.customer.name}</span>
            </div>
            {sale.customer.documentId && (
              <div className="flex justify-between">
                <span>RUC / C.I.:</span>
                <span>{sale.customer.documentId}</span>
              </div>
            )}
          </div>

          {/* Lista de Ítems */}
          <div className="text-[10px] space-y-1.5 pb-2 border-b border-dashed border-zinc-400">
            <div className="flex justify-between font-bold border-b border-zinc-200 pb-0.5">
              <span>CANT / DESCRIPCIÓN</span>
              <span>TOTAL GS.</span>
            </div>
            {sale.items.map((it, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="pr-2">
                  <p className="font-bold leading-tight">
                    {it.quantity}x {it.variant.productName}
                  </p>
                  <p className="text-zinc-500 text-[9px]">
                    Talle: {it.variant.size} • Color: {it.variant.color} • P.U: {it.variant.precioVentaGs.toLocaleString()}
                  </p>
                </div>
                <span className="font-bold shrink-0">
                  {(it.variant.precioVentaGs * it.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Totales y Desglose Multimoneda */}
          <div className="text-xs space-y-1 pb-2 border-b border-dashed border-zinc-400">
            <div className="flex justify-between font-black text-sm">
              <span>TOTAL A PAGAR:</span>
              <span>Gs. {sale.totalVentaGs.toLocaleString()}</span>
            </div>

            {sale.paymentMode === 'CONTADO' ? (
              <>
                {sale.tenderedGs > 0 && (
                  <div className="flex justify-between text-[11px] text-zinc-600">
                    <span>PAGO EN GUARANÍES:</span>
                    <span>Gs. {sale.tenderedGs.toLocaleString()}</span>
                  </div>
                )}
                {sale.tenderedBrl > 0 && (
                  <div className="flex justify-between text-[11px] text-zinc-600">
                    <span>PAGO EN REALES (R$):</span>
                    <span>R$ {sale.tenderedBrl.toFixed(2)} (x {sale.appliedRateBrl})</span>
                  </div>
                )}
                {sale.tenderedUsd > 0 && (
                  <div className="flex justify-between text-[11px] text-zinc-600">
                    <span>PAGO EN DÓLARES (US$):</span>
                    <span>US$ {sale.tenderedUsd.toFixed(2)} (x {sale.appliedRateUsd})</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-zinc-900 pt-0.5">
                  <span>VUELTO EN GS.:</span>
                  <span>Gs. {sale.vueltoGs.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <div className="p-2 rounded bg-amber-50 text-[10px] text-amber-900 space-y-0.5 border border-amber-200 mt-1">
                <span className="font-bold block">VENTA REGISTRADA A CRÉDITO</span>
                <div className="flex justify-between">
                  <span>Saldo adeudado total cliente:</span>
                  <span className="font-bold">Gs. {(sale.customer.saldoPendienteGs + sale.totalVentaGs).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Pie de Ticket */}
          <div className="text-center text-[10px] text-zinc-500 pt-1 space-y-0.5">
            <p className="font-semibold text-zinc-700">{businessInfo.ticketFooterMessage}</p>
            <p className="text-[9px] text-zinc-400">Sistema POS Boutique • Comprobante no fiscal</p>
            <p className="text-[8px] text-zinc-400 pt-1 border-t border-dashed border-zinc-300">
              Desarrollado por Ing. Abel Núñez • Soporte: 0993 277 410
            </p>
          </div>
        </div>

        {/* Acciones del Modal */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={handlePrint}
            className="py-3 bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 dark:hover:bg-zinc-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Guardar PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <span>Listo / Nueva Venta</span>
          </button>
        </div>
      </div>

      {/* ESTILOS CSS PARA IMPRESIÓN LIMPIA DE TICKET TÉRMICO / PDF */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-ticket, #printable-ticket * {
            visibility: visible;
          }
          #printable-ticket {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 2mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            font-size: 11px !important;
            font-family: 'Courier New', monospace !important;
          }
          /* Forzar fondo blanco para impresión */
          #printable-ticket * {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        
        /* Optimización para móvil */
        @media (max-width: 640px) {
          #printable-ticket {
            font-size: 10px !important;
            padding: 8px !important;
          }
          #printable-ticket h4 {
            font-size: 12px !important;
          }
          #printable-ticket p {
            font-size: 9px !important;
          }
        }
      `}</style>
    </div>
  );
};
