import React from 'react';
import { ShoppingBag, ShoppingCart, DollarSign, Users, Sun, Moon, ArrowRightLeft } from 'lucide-react';
import { CurrencyRates } from '../../types';

interface NavbarProps {
  activeTab: 'pos' | 'purchases' | 'audit' | 'debtors';
  setActiveTab: (tab: 'pos' | 'purchases' | 'audit' | 'debtors') => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  rates: CurrencyRates;
  onUpdateRates: (brl: number, usd: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  setIsDarkMode,
  rates,
  onUpdateRates
}) => {
  const [editingRates, setEditingRates] = React.useState(false);
  const [brlInput, setBrlInput] = React.useState(rates.BRL_TO_GS.toString());
  const [usdInput, setUsdInput] = React.useState(rates.USD_TO_GS.toString());

  const handleSaveRates = () => {
    onUpdateRates(Number(brlInput), Number(usdInput));
    setEditingRates(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Marca */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                BOUTIQUE <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-semibold uppercase tracking-wider">POS ERP</span>
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Guaraníes • Reales • Dólares</p>
            </div>
          </div>

          {/* Selector de Pestañas */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'pos'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Caja POS</span>
            </button>

            <button
              onClick={() => setActiveTab('purchases')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'purchases'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Compras (Lotes)</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Arqueo Diario</span>
            </button>

            <button
              onClick={() => setActiveTab('debtors')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'debtors'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Deudores</span>
            </button>
          </nav>

          {/* Cotizaciones & Tema */}
          <div className="flex items-center gap-3">
            {/* Widget Cotizaciones del Día */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-slate-100/70 dark:bg-zinc-800/60 text-xs">
              {!editingRates ? (
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setEditingRates(true)} title="Clic para editar cotizaciones oficiales">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">R$</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">Gs. {rates.BRL_TO_GS.toLocaleString()}</span>
                  </div>
                  <span className="text-zinc-300 dark:text-zinc-600">|</span>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">US$</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">Gs. {rates.USD_TO_GS.toLocaleString()}</span>
                  </div>
                  <ArrowRightLeft className="w-3 h-3 text-zinc-400 hover:text-zinc-600" />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <label className="text-emerald-600 font-bold">R$</label>
                  <input
                    type="number"
                    value={brlInput}
                    onChange={(e) => setBrlInput(e.target.value)}
                    className="w-16 px-1 py-0.5 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-xs font-mono"
                  />
                  <label className="text-indigo-600 font-bold">US$</label>
                  <input
                    type="number"
                    value={usdInput}
                    onChange={(e) => setUsdInput(e.target.value)}
                    className="w-16 px-1 py-0.5 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-xs font-mono"
                  />
                  <button
                    onClick={handleSaveRates}
                    className="px-2 py-0.5 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
