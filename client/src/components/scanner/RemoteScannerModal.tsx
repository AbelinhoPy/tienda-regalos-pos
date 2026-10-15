import React, { useEffect, useState, useRef } from 'react';
import { Smartphone, X, QrCode, CheckCircle2, Loader2, Copy, RefreshCw, Zap } from 'lucide-react';
import { api } from '../../services/api';
import { playScanBeep } from '../../utils/barcode';

interface RemoteScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeReceived: (barcode: string) => void;
  title?: string;
  subtitle?: string;
}

export const RemoteScannerModal: React.FC<RemoteScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeReceived,
  title = 'Usar Celular como Lector de Código de Barras',
  subtitle = 'Escaneá el código QR con tu celular para usar su cámara como pistola lectora.',
}) => {
  const [sessionId, setSessionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [scanCount, setScanCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const lastTimestampRef = useRef<number>(Date.now());
  const pollIntervalRef = useRef<any>(null);

  // Iniciar sesión
  const startSession = async () => {
    setLoading(true);
    try {
      const res = await api.post<{ sessionId: string }>('/api/scanner/session');
      setSessionId(res.sessionId);
      lastTimestampRef.current = Date.now();
    } catch (e) {
      console.error('Error al crear sesión de escáner', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startSession();
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen]);

  // Polling para recibir escaneos del celular
  useEffect(() => {
    if (!sessionId || !isOpen) return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await api.get<{
          sessionId: string;
          active: boolean;
          scans: Array<{ code: string; timestamp: number }>;
        }>(`/api/scanner/poll/${sessionId}?since=${lastTimestampRef.current}`);

        if (res && res.scans && res.scans.length > 0) {
          // Tomar el último escaneo
          const latest = res.scans[res.scans.length - 1];
          lastTimestampRef.current = latest.timestamp;

          playScanBeep(1200, 100);
          setLastScannedCode(latest.code);
          setScanCount(prev => prev + res.scans.length);
          onBarcodeReceived(latest.code);
        }
      } catch (e) {
        // Ignorar fallas temporales de red en el polling
      }
    }, 800);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [sessionId, isOpen, onBarcodeReceived]);

  if (!isOpen) return null;

  // URL para abrir directamente en el celular
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const mobileScannerUrl = `${currentOrigin}/?scannerSession=${sessionId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mobileScannerUrl)}&color=4f46e5&bgcolor=ffffff&qzone=1`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(mobileScannerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-6 space-y-5">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">{title}</h3>
              <p className="text-xs text-zinc-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs text-zinc-500">Generando sesión de escaneo seguro...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Contenedor del QR y Código */}
            <div className="bg-slate-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col items-center text-center space-y-3">
              <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-zinc-200">
                <img
                  src={qrImageUrl}
                  alt="QR para Celular"
                  className="w-44 h-44 object-contain rounded-xl"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-zinc-500 block">
                  O ingresá en el celular este código:
                </span>
                <span className="font-mono text-2xl font-black tracking-widest text-indigo-600 dark:text-indigo-400 select-all">
                  {sessionId}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? '¡Enlace copiado al portapapeles!' : 'Copiar enlace directo para celular'}
              </button>
            </div>

            {/* Estado de espera / Último escaneo */}
            {lastScannedCode ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase block">
                      ¡Código recibido desde el celular!
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-zinc-100">
                      {lastScannedCode}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                  {scanCount} leído{scanCount > 1 ? 's' : ''}
                </span>
              </div>
            ) : (
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-indigo-500 animate-ping shrink-0" />
                <p className="text-xs text-indigo-900 dark:text-indigo-300">
                  Esperando que escanees con el celular... Cada prenda que apuntes se aplicará aquí en tiempo real.
                </p>
              </div>
            )}

            {/* Botón de acción */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={startSession}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Generar otro código
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
              >
                Listo / Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
