import React, { useState, useEffect } from 'react';
import { Gift, Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { User } from '../../types';
import { loginWithCredentials, initUsers } from '../../services/authService';

interface LoginViewProps {
  onLogin: (user: User) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, isDarkMode, setIsDarkMode }) => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState('');
  const [ready, setReady]       = useState(false);

  // Inicializa usuarios la primera vez que carga la app
  useEffect(() => {
    initUsers().then(() => setReady(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Ingresá tu correo y contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await loginWithCredentials(email, password);
      if (user) {
        onLogin(user);
      } else {
        setError('Correo o contraseña incorrectos. Verificá tus datos.');
      }
    } catch {
      setError('Error interno. Intentá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-zinc-950 p-4 relative overflow-hidden transition-colors">
      {/* Fondo decorativo */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-rose-500/10 dark:bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-5">
        {/* Card */}
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl shadow-zinc-900/10 dark:shadow-black/50 space-y-6">

          {/* Logo */}
          <div className="text-center space-y-2">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 items-center justify-center text-white shadow-lg shadow-indigo-600/30 mb-2">
              <Gift className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
              REGALOS POS
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Regalos, Souvenirs & Personalizados · Presupuestos · Multimoneda
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="tu@correo.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !ready}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Info discreta de accesos */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
              Solo usuarios registrados pueden acceder al sistema.<br />
              Contactá al administrador para obtener acceso.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-zinc-300">
            © {new Date().getFullYear()} Todos los derechos reservados
          </p>
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
            Desarrollado por Ing. Abel Núñez • Soporte: 0993 277 410
          </p>
          <p className="text-[10px] text-zinc-400">
            Regalos & Personalizados POS • Presupuestos & Multimoneda (Gs. / R$ / US$)
          </p>
        </div>
      </div>
    </div>
  );
};
