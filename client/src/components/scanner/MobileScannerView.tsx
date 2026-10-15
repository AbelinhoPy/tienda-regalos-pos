import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Camera, Zap, CheckCircle2, AlertCircle, RefreshCw, Send, ArrowLeft, Volume2, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import { playScanBeep } from '../../utils/barcode';

interface MobileScannerViewProps {
  initialSessionId?: string;
  onExit?: () => void;
}

export const MobileScannerView: React.FC<MobileScannerViewProps> = ({ initialSessionId = '', onExit }) => {
  const [sessionId, setSessionId] = useState(initialSessionId.toUpperCase());
  const [connected, setConnected] = useState(Boolean(initialSessionId));
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<{ code: string; time: string } | null>(null);
  const [recentScans, setRecentScans] = useState<Array<{ code: string; time: string; sent: boolean }>>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastCodeTimeRef = useRef<{ [code: string]: number }>({});

  // Inicializar lector de cámara
  useEffect(() => {
    if (!connected || !sessionId) return;

    const codeReader = new BrowserMultiFormatReader();
    readerRef.current = codeReader;

    codeReader.listVideoInputDevices()
      .then((devices) => {
        if (devices.length === 0) {
          setError('No se encontró ninguna cámara disponible en el dispositivo.');
          return;
        }

        // Preferir cámara trasera
        const backCamera = devices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('trasera') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        const deviceId = backCamera?.deviceId || devices[devices.length - 1].deviceId;

        codeReader.decodeFromVideoDevice(deviceId, videoRef.current!, (result, err) => {
          if (result) {
            const rawCode = result.getText().trim();
            const now = Date.now();
            const lastTime = lastCodeTimeRef.current[rawCode] || 0;

            // Evitar duplicados seguidos del mismo código en menos de 2.5 seg
            if (now - lastTime > 2500) {
              lastCodeTimeRef.current[rawCode] = now;
              handleSendBarcode(rawCode);
            }
          }
          if (err && !(err instanceof NotFoundException)) {
            // Ignorar errores normales de frame sin código
          }
        });
      })
      .catch((err) => {
        setError('No se pudo acceder a la cámara. Verificá los permisos del navegador.');
        console.error('Camera error:', err);
      });

    return () => {
      codeReader.reset();
    };
  }, [connected, sessionId]);

  const handleSendBarcode = async (codeToSend: string) => {
    const code = codeToSend.trim();
    if (!code) return;

    setSending(true);
    setError('');

    // Sonido y vibración háptica de confirmación en el celular
    playScanBeep(1300, 100);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(80);
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    try {
      await api.post('/api/scanner/scan', {
        sessionId: sessionId.trim().toUpperCase(),
        barcode: code,
      });

      setLastScanned({ code, time: timeStr });
      setRecentScans(prev => [{ code, time: timeStr, sent: true }, ...prev.slice(0, 19)]);
      setStatusMsg(`✓ ¡Enviado a la PC: ${code}!`);
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Error al transmitir código a la PC');
      setRecentScans(prev => [{ code, time: timeStr, sent: false }, ...prev.slice(0, 19)]);
    } finally {
      setSending(false);
    }
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim()) return;
    setConnected(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none">
      {/* Barra superior */}
      <header className="p-4 bg-zinc-900/90 backdrop-blur border-b border-zinc-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight">Lector Móvil POS</h1>
            <p className="text-[11px] text-zinc-400">
              {connected ? (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Sesión: <span className="font-mono text-white">{sessionId}</span>
                </span>
              ) : 'Conectar con la PC'}
            </p>
          </div>
        </div>

        {connected && onExit && (
          <button
            onClick={onExit}
            className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-white"
          >
            Salir
          </button>
        )}
      </header>

      {/* Pantalla 1: Ingresar código de sesión si no vino por QR */}
      {!connected ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
                <Zap className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold">Vincular Celular con la PC</h2>
              <p className="text-xs text-zinc-400">
                Ingresá el código de 6 letras que aparece en la pantalla de la computadora o escaneá el QR desde la cámara de tu celular.
              </p>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Código de Sesión
                </label>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="Ej: AB12CD"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value.toUpperCase())}
                  className="w-full text-center tracking-widest text-2xl font-mono uppercase font-black px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-2xl text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!sessionId.trim()}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Iniciar Cámara como Escáner
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Pantalla 2: Escáner activo con cámara */
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full p-4 space-y-4">
          {/* Visor de cámara */}
          <div className="relative bg-black rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl aspect-[4/3] flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />

            {/* Guía de lectura */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-36 border-2 border-indigo-400/80 rounded-2xl bg-indigo-500/5 shadow-[0_0_50px_rgba(99,102,241,0.2)]">
                {/* Esquinas destacadas */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-xl" />

                {/* Línea animada */}
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent top-1/2 -translate-y-1/2 animate-pulse" />
              </div>
            </div>

            {/* Notificación flotante de último escaneo */}
            {statusMsg && (
              <div className="absolute top-4 inset-x-4 bg-emerald-600/95 text-white px-4 py-2.5 rounded-2xl text-xs font-bold text-center shadow-xl backdrop-blur flex items-center justify-center gap-2 animate-bounce">
                <CheckCircle2 className="w-4 h-4" />
                {statusMsg}
              </div>
            )}

            {error && (
              <div className="absolute bottom-4 inset-x-4 bg-red-600/95 text-white px-3 py-2 rounded-2xl text-xs font-semibold text-center shadow-xl">
                {error}
              </div>
            )}
          </div>

          <p className="text-center text-xs text-zinc-400">
            Apuntá la cámara a la etiqueta de la prenda. Se enviará a la PC automáticamente.
          </p>

          {/* Último código detectado */}
          {lastScanned && (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">
                    Último Enviado a la PC
                  </span>
                  <span className="font-mono text-base font-bold text-white">
                    {lastScanned.code}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">{lastScanned.time}</span>
            </div>
          )}

          {/* Enviar código manual (por si la etiqueta física está rota o ilegible) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
            <label className="text-[11px] font-semibold text-zinc-400 block">
              ¿Etiqueta dañada? Ingresá el número manual:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ej: 7840001001"
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-mono font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (manualCode.trim()) {
                    handleSendBarcode(manualCode);
                    setManualCode('');
                  }
                }}
                disabled={!manualCode.trim() || sending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                Enviar
              </button>
            </div>
          </div>

          {/* Historial reciente */}
          {recentScans.length > 0 && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Historial de lecturas de esta sesión
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {recentScans.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-zinc-800/40 border border-zinc-800 font-mono"
                  >
                    <span className="font-bold text-zinc-200">{item.code}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500">{item.time}</span>
                      <button
                        type="button"
                        onClick={() => handleSendBarcode(item.code)}
                        className="text-[10px] text-indigo-400 hover:underline"
                        title="Reenviar este código a la PC"
                      >
                        Reenviar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
