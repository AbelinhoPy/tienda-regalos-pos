import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  AlertTriangle, 
  ArrowUpRight, 
  CreditCard,
  Package,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { User, CurrencyRates, AppModule, ProductVariant, Customer } from '../../types';
import { api } from '../../services/api';

interface DashboardViewProps {
  currentUser: User;
  rates: CurrencyRates;
  onNavigate: (module: AppModule) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ currentUser, rates, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    ventasHoyGs: 0,
    costoRealGs: 0,
    gananciaNetaGs: 0,
    margenPct: 0,
    deudoresTotalGs: 0,
    deudoresCount: 0,
    prendasBajoStock: 0,
    totalPrendasStock: 0
  });

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion' }).format(new Date());
      
      const [salesRes, productsRes, customersRes] = await Promise.allSettled([
        api.get<any>(`/api/sales/daily?date=${todayStr}`),
        api.get<ProductVariant[]>('/api/products'),
        api.get<Customer[]>('/api/customers'),
      ]);

      let ventasHoyGs = 0;
      let costoRealGs = 0;
      let gananciaNetaGs = 0;
      let margenPct = 0;

      if (salesRes.status === 'fulfilled' && salesRes.value?.resumen) {
        ventasHoyGs = salesRes.value.resumen.totalVentasGs || 0;
        costoRealGs = salesRes.value.resumen.totalCostoGs || 0;
        gananciaNetaGs = salesRes.value.resumen.totalUtilidadGs || 0;
        margenPct = ventasHoyGs > 0 ? Number(((gananciaNetaGs / ventasHoyGs) * 100).toFixed(1)) : 0;
      }

      let totalPrendasStock = 0;
      let prendasBajoStock = 0;

      if (productsRes.status === 'fulfilled' && Array.isArray(productsRes.value)) {
        const prods = productsRes.value;
        totalPrendasStock = prods.reduce((acc, p) => acc + (p.stock || 0), 0);
        prendasBajoStock = prods.filter(p => (p.stock || 0) <= (p.minStock || 2)).length;
      }

      let deudoresTotalGs = 0;
      let deudoresCount = 0;

      if (customersRes.status === 'fulfilled' && Array.isArray(customersRes.value)) {
        const custs = customersRes.value;
        const withDebt = custs.filter(c => (c.saldoPendienteGs || 0) > 0);
        deudoresCount = withDebt.length;
        deudoresTotalGs = withDebt.reduce((acc, c) => acc + (c.saldoPendienteGs || 0), 0);
      }

      setMetrics({
        ventasHoyGs,
        costoRealGs,
        gananciaNetaGs,
        margenPct,
        deudoresTotalGs,
        deudoresCount,
        prendasBajoStock,
        totalPrendasStock
      });
    } catch (e) {
      console.error('Error cargando métricas del dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida con Rol */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/10 text-indigo-200 border border-white/10">
                {currentUser.roleDescription}
              </span>
              <span className="text-xs text-indigo-200">Paraguay (Gs. / R$ / US$)</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Bienvenido, {currentUser.name.split(' ')[0]}
            </h2>
            <p className="text-xs text-indigo-200/80 max-w-xl">
              Gestión ágil de caja POS, lector de códigos de barras, compras con cotización flexible y stock por talles/colores.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 font-semibold text-xs transition-all flex items-center justify-center"
              title="Actualizar datos en vivo"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => onNavigate('pos')}
              className="px-4 py-2.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              Ir al POS (Caja)
            </button>
            <button
              onClick={() => onNavigate('audit')}
              className="px-4 py-2.5 rounded-xl bg-indigo-700/60 hover:bg-indigo-700 border border-indigo-500/30 text-white font-semibold text-xs transition-all"
            >
              Arqueo Diario
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas Principales de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ventas Hoy */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
              Ventas de Hoy
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-zinc-100">
              Gs. {metrics.ventasHoyGs.toLocaleString()}
            </p>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              ≈ R$ {(metrics.ventasHoyGs / (rates.BRL_TO_GS || 1350)).toFixed(2)} | US$ {(metrics.ventasHoyGs / (rates.USD_TO_GS || 7550)).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Ganancia Neta Real (Solo visible para Admin o Dueño) */}
        <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">
              Utilidad Neta Real
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              Gs. {metrics.gananciaNetaGs.toLocaleString()}
            </p>
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> Margen Real: {metrics.margenPct}%
            </p>
          </div>
        </div>

        {/* Cuentas por Cobrar (Deudores) */}
        <div 
          onClick={() => onNavigate('customers')}
          className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-3 cursor-pointer hover:border-red-300 dark:hover:border-red-900/60 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
              Cuentas por Cobrar
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-red-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-red-600 dark:text-red-400">
              Gs. {metrics.deudoresTotalGs.toLocaleString()}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              {metrics.deudoresCount} clientes con saldo pendiente
            </p>
          </div>
        </div>

        {/* Stock y Alerta de Variantes */}
        <div 
          onClick={() => onNavigate('products')}
          className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-3 cursor-pointer hover:border-indigo-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">
              Inventario Prendas
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-500">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-zinc-100">
              {metrics.totalPrendasStock} <span className="text-sm font-normal text-zinc-400">unid.</span>
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {metrics.prendasBajoStock} variantes en stock mínimo
            </p>
          </div>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100">
          Operaciones Rápidas
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onNavigate('pos')}
            className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:border-indigo-200 text-left flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">Nueva Venta en Caja</p>
                <p className="text-[10px] text-zinc-400">Lector de barras, multimoneda y fiados</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-zinc-400 shrink-0" />
          </button>

          <button
            onClick={() => onNavigate('products')}
            className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 hover:border-emerald-200 text-left flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">Prendas & Stock</p>
                <p className="text-[10px] text-zinc-400">Variantes de talle, color y código de barras</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-zinc-400 shrink-0" />
          </button>

          <button
            onClick={() => onNavigate('purchases')}
            className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 hover:border-amber-200 text-left flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">Ingreso de Compras</p>
                <p className="text-[10px] text-zinc-400">Compras en R$, US$ con cotización manual</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-zinc-400 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
