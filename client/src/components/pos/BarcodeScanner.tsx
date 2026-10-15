import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Camera, X, Zap, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastCode, setLastCode] = useState('');
  const lastCodeTime = useRef<number>(0);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    readerRef.current = codeReader;

    codeReader.listVideoInputDevices()
      .then((devices) => {
        if (devices.length === 0) {
          setError('No se encontró ninguna cámara disponible.');
          return;
        }

        // Preferir cámara trasera en móviles
        const backCamera = devices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('trasera') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        const deviceId = backCamera?.deviceId || devices[devices.length - 1].deviceId;

        setScanning(true);

        codeReader.decodeFromVideoDevice(deviceId, videoRef.current!, (result, err) => {
          if (result) {
            const code = result.getText();
            const now = Date.now();
            // Evitar disparar el mismo código repetidamente en < 2 seg
            if (code !== lastCode || now - lastCodeTime.current > 2000) {
              setLastCode(code);
              lastCodeTime.current = now;
              onDetected(code);
            }
          }
          if (err && !(err instanceof NotFoundException)) {
            // Errores menores de lectura son normales, no mostrar
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
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 rounded-3xl border border-zinc-700 shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-white">
            <Camera className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm">Escáner de Cámara</span>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visor de cámara */}
        <div className="relative bg-black aspect-square">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />

          {/* Marco de escaneo */}
          {scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-48 h-48">
                {/* Esquinas del visor */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />
                {/* Línea de escaneo animada */}
                <div className="absolute left-2 right-2 h-0.5 bg-indigo-400/70 animate-scan-line" style={{
                  top: '50%',
                  animation: 'scanLine 2s ease-in-out infinite',
                }} />
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center px-6 space-y-2">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                <p className="text-white text-xs font-semibold">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 space-y-2">
          {lastCode && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-950/60 border border-emerald-700 rounded-xl">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-mono text-emerald-300 font-bold truncate">{lastCode}</span>
              <span className="text-[10px] text-emerald-500 ml-auto">Detectado</span>
            </div>
          )}
          <p className="text-[11px] text-zinc-400 text-center">
            Apuntá la cámara al código de barras de la prenda
          </p>
          <button onClick={onClose}
            className="w-full py-2.5 border border-zinc-700 text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors">
            Cerrar escáner
          </button>
        </div>
      </div>

      {/* CSS para animación de la línea */}
      <style>{`
        @keyframes scanLine {
          0%, 100% { transform: translateY(-40px); opacity: 0.6; }
          50% { transform: translateY(40px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
