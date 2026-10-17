import React, { useState } from 'react';
import { 
  ShoppingBag, 
  ShoppingCart, 
  DollarSign, 
  Users, 
  LayoutDashboard, 
  Package, 
  Shield, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  ArrowRightLeft,
  ChevronRight,
  Store,
  CreditCard,
  Building2,
  Calendar,
  FolderOpen,
  FileText
} from 'lucide-react';
import { User, CurrencyRates, AppModule } from '../../types';

interface AppLayoutProps {
  currentUser: User;
  onLogout: () => void;
  activeModule: AppModule;
  setActiveModule: (module: AppModule) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  rates: CurrencyRates;
  onUpdateRates: (brl: number, usd: number) => void;
  children: React.ReactNode;
  businessInfo?: { name: string; city: string };
}

interface NavItem {
  id: AppModule;
  label: string;
  icon: any;
  allowedRoles: Array<'ADMIN' | 'VENDEDOR' | 'DUENO_LOCAL'>;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentUser,
  onLogout,
  activeModule,
  setActiveModule,
  isDarkMode,
  setIsDarkMode,
  rates,
  onUpdateRates,
  children,
  businessInfo
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingRates, setEditingRates] = useState(false);
  const [brlInput, setBrlInput] = useState(rates.BRL_TO_GS.toString());
  const [usdInput, setUsdInput] = useState(rates.USD_TO_GS.toString());

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: ['ADMIN', 'DUENO_LOCAL', 'VENDEDOR'] },
    { id: 'quotes', label: 'Presupuestos', icon: FileText, allowedRoles: ['ADMIN', 'DUENO_LOCAL', 'VENDEDOR'] },
    { id: 'pos', label: 'Caja POS', icon: ShoppingCart, allowedRoles: ['ADMIN', 'VENDEDOR'] },
    { id: 'products', label: 'Productos & Stock', icon: Package, allowedRoles: ['ADMIN', 'VENDEDOR', 'DUENO_LOCAL'] },
    { id: 'categories', label: 'Categorías', icon: FolderOpen, allowedRoles: ['ADMIN', 'DUENO_LOCAL'] },
    { id: 'purchases', label: 'Ingreso Compras', icon: ShoppingBag, allowedRoles: ['ADMIN'] },
    { id: 'customers', label: 'Clientes', icon: Users, allowedRoles: ['ADMIN', 'VENDEDOR', 'DUENO_LOCAL'] },
    { id: 'daily-sales', label: 'Ventas del Día', icon: Calendar, allowedRoles: ['ADMIN', 'DUENO_LOCAL', 'VENDEDOR'] },
    { id: 'users', label: 'Usuarios & Roles', icon: Shield, allowedRoles: ['ADMIN'] },
    { id: 'audit', label: 'Arqueo & Reportes', icon: DollarSign, allowedRoles: ['ADMIN', 'DUENO_LOCAL'] },
    { id: 'business', label: 'Datos Empresa (Membrete)', icon: Building2, allowedRoles: ['ADMIN', 'DUENO_LOCAL'] },
  ];

  const filteredNavItems = navItems.filter((item) =>
    item.allowedRoles.includes(currentUser.role)
  );

  const handleSaveRates = () => {
    onUpdateRates(Number(brlInput), Number(usdInput));
    setEditingRates(false);
  };

  const handleNavClick = (id: AppModule) => {
    setActiveModule(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Botón hamburguesa móvil + Logo */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveModule('dashboard')}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="font-extrabold text-base tracking-tight leading-none text-slate-900 dark:text-zinc-100">
                    REGALOS <span className="text-indigo-600 dark:text-indigo-400">POS</span>
                  </h1>
                  <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">
                    Personalizados & Presupuestos
                  </span>
                </div>
              </div>
            </div>

            {/* Widget Cotizaciones del Día (Desktop) */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 text-xs">
              {!editingRates ? (
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" 
                  onClick={() => setEditingRates(true)} 
                  title="Clic para modificar cotizaciones oficiales de hoy"
                >
                  <div className="flex items-center gap-1">
                    <span className="font-black text-emerald-600 dark:text-emerald-400">R$</span>
                    <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">Gs. {rates.BRL_TO_GS.toLocaleString()}</span>
                  </div>
                  <span className="text-zinc-300 dark:text-zinc-600">|</span>
                  <div className="flex items-center gap-1">
                    <span className="font-black text-indigo-600 dark:text-indigo-400">US$</span>
                    <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">Gs. {rates.USD_TO_GS.toLocaleString()}</span>
                  </div>
                  <ArrowRightLeft className="w-3.5 h-3.5 text-zinc-400" />
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">R$</span>
                  <input
                    type="number"
                    value={brlInput}
                    onChange={(e) => setBrlInput(e.target.value)}
                    className="w-16 px-1 py-0.5 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-xs font-mono font-bold"
                  />
                  <span className="text-indigo-600 font-bold">US$</span>
                  <input
                    type="number"
                    value={usdInput}
                    onChange={(e) => setUsdInput(e.target.value)}
                    className="w-16 px-1 py-0.5 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 text-xs font-mono font-bold"
                  />
                  <button
                    onClick={handleSaveRates}
                    className="px-2 py-0.5 bg-indigo-600 text-white rounded text-xs font-bold"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>

            {/* Perfil de Usuario Activo, Tema y Cerrar Sesión */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Pill de Usuario */}
              <div className="hidden sm:flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-800/50">
                <div className="text-right leading-tight">
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">{currentUser.name}</p>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">{currentUser.roleDescription}</p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                  {currentUser.name.charAt(0)}
                </div>
              </div>

              {/* Toggle Dark Mode */}
              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                title="Cambiar Modo Oscuro/Claro"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
              </button>

              {/* Botón Logout */}
              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-xl border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Cuerpo Principal con Sidebar Desktop y Contenido */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Sidebar Desktop */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 space-y-4">
            <nav className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-1">
              <span className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Módulos del Sistema
              </span>
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveModule(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-zinc-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}
            </nav>

            {/* Tarjeta de Local / Sucursal */}
            <div className="p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                <Store className="w-4 h-4" />
                <span className="truncate">{businessInfo?.name || 'Boutique'}</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                {businessInfo?.city || 'Paraguay'} • Multimoneda activa
              </p>
            </div>
          </div>
        </aside>

        {/* Drawer Móvil (Off-Canvas) */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div 
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" 
            />
            {/* Panel */}
            <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-2xl animate-slide-in">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                      <Store className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-sm">REGALOS POS</span>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-zinc-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

          {/* Info Usuario */}
                <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl">
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">{currentUser.name}</p>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">{currentUser.roleDescription}</p>
                </div>

                {/* Enlaces */}
                <nav className="space-y-1">
                  {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <button
                onClick={onLogout}
                className="w-full py-2.5 border border-red-200 dark:border-red-900/50 text-red-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Cerrar Sesión
              </button>
            </div>
          </div>
        )}

        {/* Contenedor del Módulo Activo */}
        <main className="flex-1 min-w-0 pb-16 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Footer Global con Derechos de Autor */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/80 py-4 bg-white/40 dark:bg-zinc-900/40 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <p className="font-semibold text-slate-700 dark:text-zinc-300">
          © {new Date().getFullYear()} Regalos & Personalizados POS ERP • Todos los derechos reservados
        </p>
        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
          Desarrollado por Ing. Abel Núñez • Soporte / Contacto: 0993 277 410
        </p>
      </footer>

      {/* Barra de Navegación Rápida para Móviles (Bottom Bar) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/90 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-800 backdrop-blur-md px-3 py-2 flex items-center justify-around">
        <button
          onClick={() => setActiveModule('dashboard')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            activeModule === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Inicio</span>
        </button>

        <button
          onClick={() => setActiveModule('quotes')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            activeModule === 'quotes' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span>Presupuestos</span>
        </button>

        {['ADMIN', 'VENDEDOR'].includes(currentUser.role) && (
          <button
            onClick={() => setActiveModule('pos')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              activeModule === 'pos' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Caja POS</span>
          </button>
        )}

        <button
          onClick={() => setActiveModule('products')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            activeModule === 'products' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
          }`}
        >
          <Package className="w-5 h-5" />
          <span>Productos</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-zinc-400"
        >
          <Menu className="w-5 h-5" />
          <span>Menú</span>
        </button>
      </div>
    </div>
  );
};
