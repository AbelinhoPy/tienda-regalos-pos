import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Trash2, Plus, Minus, AlertTriangle, Banknote,
  Clock, Check, UserCheck, X, Receipt, Camera, Package,
  Filter, ChevronDown, CreditCard, ArrowRight, Zap,
  ShoppingBag, RefreshCw, Loader2, Smartphone
} from 'lucide-react';
import { CurrencyRates, ProductVariant, Customer, CartItem, CompletedSale, BusinessInfo } from '../../types';
import { TicketReceiptModal } from './TicketReceiptModal';
import { BarcodeScanner } from './BarcodeScanner';
import { RemoteScannerModal } from '../scanner/RemoteScannerModal';
import { playScanBeep } from '../../utils/barcode';
import { api } from '../../services/api';

const CONSUMIDOR_FINAL: Customer = {
  id: 0, name: 'Consumidor Final', creditLimitGs: 0, saldoPendienteGs: 0
};

interface PosCheckoutViewProps {
  rates: CurrencyRates;
  businessInfo: BusinessInfo;
}

export const PosCheckoutView: React.FC<PosCheckoutViewProps> = ({ rates, businessInfo }) => {
  const [catalog, setCatalog]       = useState<ProductVariant[]>([]);
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(CONSUMIDOR_FINAL);
  const [searchInput, setSearchInput]   = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [showCatalog, setShowCatalog]   = useState(true);
  const [showScanner, setShowScanner]   = useState(false);
  const [showRemoteScanner, setShowRemoteScanner] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMode, setPaymentMode]   = useState<'CONTADO' | 'CREDITO_FIADO'>('CONTADO');
  const [tenderedGs,  setTenderedGs]    = useState('');
  const [tenderedBrl, setTenderedBrl]   = useState('');
  const [tenderedUsd, setTenderedUsd]   = useState('');
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [toast, setToast]               = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Cargar catálogo y clientes desde la API ────────────────────────────────
  const fetchCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const data = await api.get<ProductVariant[]>('/api/products');
      setCatalog(data);
    } catch { /* silently fail, mostrar empty state */ }
    finally { setLoadingCatalog(false); }
  };

  const fetchCustomers = async () => {
    try {
      const data = await api.get<Customer[]>('/api/customers');
      setCustomers([CONSUMIDOR_FINAL, ...data]);
    } catch { setCustomers([CONSUMIDOR_FINAL]); }
  };

  useEffect(() => {
    fetchCatalog();
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (!isCheckoutOpen && !completedSale && !showScanner) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isCheckoutOpen, completedSale, showScanner]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // ── Totales ────────────────────────────────────────────────────────────────
  const totalGs = useMemo(() =>
    cart.reduce((s, i) => s + (i.customPriceGs ?? i.variant.precioVentaGs) * i.quantity, 0), [cart]);

  const totalCostoGs = useMemo(() =>
    cart.reduce((s, i) => s + i.variant.costoGsReal * i.quantity, 0), [cart]);

  const totalRecibidoGs = useMemo(() => {
    const gs  = Number(tenderedGs)  || 0;
    const brl = (Number(tenderedBrl) || 0) * rates.BRL_TO_GS;
    const usd = (Number(tenderedUsd) || 0) * rates.USD_TO_GS;
    return Math.round(gs + brl + usd);
  }, [tenderedGs, tenderedBrl, tenderedUsd, rates]);

  const vueltoGs = useMemo(() =>
    paymentMode === 'CREDITO_FIADO' ? 0 : Math.max(0, totalRecibidoGs - totalGs),
    [paymentMode, totalRecibidoGs, totalGs]);

  // ── Categorías ─────────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = Array.from(new Set(catalog.map(v => v.category)));
    return ['TODAS', ...cats];
  }, [catalog]);

  // ── Filtrado ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return catalog.filter(v => {
      const matchSearch = !q ||
        v.productName.toLowerCase().includes(q) ||
        v.barcode.toLowerCase().includes(q) ||
        v.color.toLowerCase().includes(q) ||
        v.size.toLowerCase().includes(q) ||
        (v.brand || '').toLowerCase().includes(q);
      const matchCat = selectedCategory === 'TODAS' || v.category === selectedCategory;
      return matchSearch && matchCat && v.stock > 0;
    });
  }, [catalog, searchInput, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;
    const exact = catalog.find(v => v.barcode.toLowerCase() === q.toLowerCase());
    if (exact) { addToCart(exact); setSearchInput(''); return; }
    if (filtered.length === 1) { addToCart(filtered[0]); setSearchInput(''); }
  };

  const handleScanDetected = (code: string) => {
    const trimmed = code.trim();
    const found = catalog.find(v => v.barcode.toLowerCase() === trimmed.toLowerCase());
    if (found) {
      playScanBeep(1200, 90);
      addToCart(found);
      setShowScanner(false);
      showToast(`✓ ${found.productName} (${found.size} · ${found.color}) agregado al carrito`);
    } else {
      showToast(`Código ${trimmed} no encontrado en catálogo`);
    }
  };

  const addToCart = (v: ProductVariant) => {
    if (v.stock < 1) { showToast(`Sin stock: ${v.productName}`); return; }
    setCart(prev => {
      const idx = prev.findIndex(i => i.variant.id === v.id);
      if (idx >= 0) {
        if (prev[idx].quantity >= v.stock) { showToast(`Stock máximo: ${v.stock}`); return prev; }
        const u = [...prev]; u[idx] = { ...u[idx], quantity: u[idx].quantity + 1 }; return u;
      }
      return [{ variant: v, quantity: 1 }, ...prev];
    });
    showToast(`+ ${v.productName} — ${v.size} · ${v.color}`);
  };

  const updateQty = (variantId: number, delta: number) => {
    setCart(prev => prev
      .map(i => {
        if (i.variant.id !== variantId) return i;
        const nq = i.quantity + delta;
        if (nq > i.variant.stock) { showToast(`Máximo: ${i.variant.stock}`); return i; }
        return nq > 0 ? { ...i, quantity: nq } : null;
      }).filter(Boolean) as CartItem[]);
  };

  const updateCustomPrice = (variantId: number, price: string) => {
    setCart(prev => prev.map(i =>
      i.variant.id === variantId ? { ...i, customPriceGs: price === '' ? undefined : Number(price) } : i));
  };

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setTenderedGs(totalGs.toString());
    setTenderedBrl(''); setTenderedUsd('');
    setPaymentMode('CONTADO');
    setIsCheckoutOpen(true);
  };

  // ── Finalizar venta — llama a la API ──────────────────────────────────────
  const handleFinalizeSale = async () => {
    if (paymentMode === 'CREDITO_FIADO' && selectedCustomer.id === 0) {
      alert('Seleccioná un cliente registrado para ventas a crédito.');
      return;
    }
    if (paymentMode === 'CREDITO_FIADO' &&
        selectedCustomer.creditLimitGs > 0 &&
        (selectedCustomer.saldoPendienteGs + totalGs) > selectedCustomer.creditLimitGs) {
      alert(`Crédito rechazado. Límite: Gs. ${selectedCustomer.creditLimitGs.toLocaleString()}`);
      return;
    }
    if (totalGs > 0 && totalGs < 1000) {
      const ok = confirm(`⚠️ ATENCIÓN: El total de la venta es de solo Gs. ${totalGs.toLocaleString()}.\n\n¿Es correcto o quisiste cobrar Gs. ${(totalGs * 1000).toLocaleString()} (miles de guaraníes)?\n\nPresioná 'Cancelar' si fue un error de tipeo para corregirlo a ${totalGs * 1000}, o 'Aceptar' si realmente cuesta Gs. ${totalGs}.`);
      if (!ok) return;
    }
    setSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomer.id || null,
        paymentMethod: paymentMode === 'CREDITO_FIADO' ? 'CREDITO_FIADO' : 'EFECTIVO_GS',
        totalVentaGs: totalGs,
        totalCostoGsReal: totalCostoGs,
        utilidadNetaGs: totalGs - totalCostoGs,
        montoRecibidoGs: Number(tenderedGs) || 0,
        montoRecibidoBrl: Number(tenderedBrl) || 0,
        montoRecibidoUsd: Number(tenderedUsd) || 0,
        cotizacionBrl: rates.BRL_TO_GS,
        cotizacionUsd: rates.USD_TO_GS,
        vueltoGs,
        items: cart.map(i => ({
          variantId: i.variant.id,
          quantity: i.quantity,
          precioUnitarioGs: i.customPriceGs ?? i.variant.precioVentaGs,
          costoUnitarioGs: i.variant.costoGsReal,
          subtotalVentaGs: (i.customPriceGs ?? i.variant.precioVentaGs) * i.quantity,
          utilidadItemGs: ((i.customPriceGs ?? i.variant.precioVentaGs) - i.variant.costoGsReal) * i.quantity,
        })),
      };

      await api.post('/api/sales', payload);

      const sale: CompletedSale = {
        invoiceNumber: `TK-${Date.now().toString().slice(-7)}`,
        date: new Date().toLocaleString('es-PY'),
        customer: selectedCustomer,
        paymentMode,
        totalVentaGs: totalGs,
        totalCostoGsReal: totalCostoGs,
        totalRecibidoConvertidoGs: totalRecibidoGs,
        tenderedGs: Number(tenderedGs) || 0,
        tenderedBrl: Number(tenderedBrl) || 0,
        tenderedUsd: Number(tenderedUsd) || 0,
        appliedRateBrl: rates.BRL_TO_GS,
        appliedRateUsd: rates.USD_TO_GS,
        vueltoGs,
        items: [...cart],
      };

      setIsCheckoutOpen(false);
      setCart([]);
      setSelectedCustomer(CONSUMIDOR_FINAL);
      setCompletedSale(sale);
      // Refrescar catálogo para stock actualizado
      fetchCatalog();
    } catch (e: any) {
      alert(`Error al registrar la venta: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900 dark:bg-zinc-100 text-white dark:text-slate-900 rounded-2xl text-xs font-semibold shadow-xl flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-600" />{toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ── Izquierda: buscador + catálogo ──────────────────────────────── */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-zinc-900 shadow-sm space-y-3">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                <input ref={searchRef} type="text" value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Escáner de barras, nombre, talle o color..."
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" autoFocus />
              </div>
              <button type="button" onClick={() => setShowScanner(true)}
                className="px-3.5 py-3 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 transition-colors" title="Escanear con cámara">
                <Camera className="w-5 h-5" />
              </button>
              <button type="button" onClick={() => setShowRemoteScanner(true)}
                className="px-3.5 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors" title="Usar celular como pistola lectora">
                <Smartphone className="w-5 h-5" />
              </button>
              <button type="button" onClick={fetchCatalog} className="px-3 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Actualizar catálogo">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button type="submit" className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors">OK</button>
            </form>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                  }`}>{cat}</button>
              ))}
            </div>
          </div>

          <button onClick={() => setShowCatalog(!showCatalog)}
            className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-indigo-600 transition-colors">
            <Package className="w-4 h-4" />
            {showCatalog ? 'Ocultar catálogo' : 'Mostrar catálogo'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCatalog ? 'rotate-180' : ''}`} />
            <span className="text-zinc-400">({filtered.length} disponibles)</span>
          </button>

          {showCatalog && (
            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              {loadingCatalog ? (
                <div className="py-12 flex flex-col items-center gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
                  <p className="text-xs text-zinc-500">Cargando catálogo...</p>
                </div>
              ) : catalog.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <ShoppingBag className="w-10 h-10 text-zinc-200 dark:text-zinc-700 mx-auto" />
                  <p className="text-sm font-semibold text-zinc-500">El catálogo está vacío.</p>
                  <p className="text-xs text-zinc-400">Cargá prendas en "Prendas & Stock" primero.</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-xs text-zinc-400">Sin resultados para "{searchInput}"</p>
                  <button onClick={() => setSearchInput('')} className="mt-2 text-xs text-indigo-600 font-bold hover:underline">Limpiar</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {filtered.map(v => {
                    const inCart = cart.find(i => i.variant.id === v.id);
                    const isLow  = v.stock <= v.minStock;
                    return (
                      <button key={v.id} onClick={() => addToCart(v)}
                        className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.97] relative ${
                          inCart ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
                            : isLow ? 'border-red-200 dark:border-red-900/40 bg-red-50/20 hover:border-red-400'
                            : 'border-zinc-200 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-800/40 hover:border-indigo-300 hover:shadow-sm'
                        }`}>
                        {inCart && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                            {inCart.quantity}
                          </span>
                        )}
                        {v.imageUrl ? (
                          <img src={v.imageUrl} alt={v.productName}
                            className="w-full h-20 object-cover rounded-xl mb-2 border border-zinc-200 dark:border-zinc-700"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-full h-20 rounded-xl mb-2 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-zinc-300" />
                          </div>
                        )}
                        <p className="font-bold text-xs text-slate-800 dark:text-zinc-200 leading-snug line-clamp-2">{v.productName}</p>
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">T. {v.size} · {v.color}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="font-mono font-black text-xs text-slate-900 dark:text-zinc-100">Gs. {v.precioVentaGs.toLocaleString()}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isLow ? 'text-red-600 bg-red-100 dark:bg-red-950/60' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'}`}>{v.stock}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Derecha: cliente + ticket ────────────────────────────────────── */}
        <div className="lg:col-span-5 space-y-4">
          {/* Cliente */}
          <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-indigo-600" /> Cliente
            </label>
            <select value={selectedCustomer.id}
              onChange={e => {
                const id = Number(e.target.value);
                setSelectedCustomer(id === 0 ? CONSUMIDOR_FINAL : (customers.find(c => c.id === id) || CONSUMIDOR_FINAL));
              }}
              className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value={0}>Consumidor Final</option>
              {customers.filter(c => c.id !== 0).map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.saldoPendienteGs > 0 ? ` ⚠️ Debe Gs. ${c.saldoPendienteGs.toLocaleString()}` : ''}
                </option>
              ))}
            </select>
            {selectedCustomer.saldoPendienteGs > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-400/40 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 animate-pulse" />
                <div>
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">⚠️ Deudor Activo</p>
                  <p className="text-[11px] text-zinc-500">Saldo: <span className="font-mono font-bold text-red-500">Gs. {selectedCustomer.saldoPendienteGs.toLocaleString()}</span></p>
                </div>
              </div>
            )}
          </div>

          {/* Ticket */}
          <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-indigo-600" />
                Ticket ({cart.length} {cart.length === 1 ? 'ítem' : 'ítems'})
              </h3>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 font-semibold">
                  <Trash2 className="w-3 h-3" /> Vaciar
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-10 text-center">
                <ShoppingBag className="w-8 h-8 text-zinc-200 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">Escaneá o tocá una prenda para agregar</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {cart.map(item => {
                  const price = item.customPriceGs ?? item.variant.precioVentaGs;
                  return (
                    <div key={item.variant.id} className="p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-800/20">
                      <div className="flex items-start gap-2 mb-2">
                        {item.variant.imageUrl && (
                          <img src={item.variant.imageUrl} alt=""
                            className="w-10 h-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-slate-800 dark:text-zinc-200 leading-snug truncate">{item.variant.productName}</p>
                          <p className="text-[10px] text-zinc-400">T. {item.variant.size} · {item.variant.color}</p>
                        </div>
                        <button onClick={() => setCart(prev => prev.filter(i => i.variant.id !== item.variant.id))}
                          className="p-1 text-zinc-300 hover:text-red-500 transition-colors shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-0.5">
                          <button onClick={() => updateQty(item.variant.id, -1)} className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-800"><Minus className="w-3 h-3" /></button>
                          <span className="w-5 text-center font-bold font-mono text-xs">{item.quantity}</span>
                          <button onClick={() => updateQty(item.variant.id, 1)} className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-800"><Plus className="w-3 h-3" /></button>
                        </div>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-[10px] text-zinc-400">Gs.</span>
                          <input type="number"
                            value={item.customPriceGs !== undefined ? item.customPriceGs : item.variant.precioVentaGs}
                            onChange={e => updateCustomPrice(item.variant.id, e.target.value)}
                            className="w-full px-2 py-1 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold text-right bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-indigo-500 outline-none" />
                        </div>
                        <span className="font-mono font-black text-xs text-indigo-700 dark:text-indigo-300 shrink-0 min-w-[80px] text-right">
                          Gs. {(price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-zinc-400 font-mono">R$ {(totalGs / rates.BRL_TO_GS).toFixed(1)} · US$ {(totalGs / rates.USD_TO_GS).toFixed(1)}</p>
                  <p className="text-xs font-bold text-zinc-500">Total a cobrar</p>
                </div>
                <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">Gs. {totalGs.toLocaleString()}</span>
              </div>
              <button onClick={handleOpenCheckout} disabled={cart.length === 0}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99]">
                <CreditCard className="w-5 h-5" />
                Cobrar — Gs. {totalGs.toLocaleString()}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal cobro ───────────────────────────────────────────────────── */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-6 space-y-5 my-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-600" /> Cobrar Venta</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Cliente: <span className="font-bold">{selectedCustomer.name}</span> · {cart.length} ítem{cart.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 text-center">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Total</p>
              <p className="text-4xl font-black font-mono text-indigo-700 dark:text-indigo-300 mt-1">Gs. {totalGs.toLocaleString()}</p>
              <p className="text-xs text-zinc-400 font-mono mt-1">≈ R$ {(totalGs / rates.BRL_TO_GS).toFixed(2)} · US$ {(totalGs / rates.USD_TO_GS).toFixed(2)}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[['CONTADO','Contado / Multimoneda',<Banknote className="w-4 h-4"/>],['CREDITO_FIADO','Crédito / Fiado',<Clock className="w-4 h-4"/>]].map(([mode, label, icon]) => (
                <button key={mode as string} onClick={() => setPaymentMode(mode as any)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    paymentMode === mode ? (mode === 'CONTADO' ? 'bg-indigo-600 text-white' : 'bg-amber-600 text-white') : 'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}>
                  {icon as React.ReactNode} {label as string}
                </button>
              ))}
            </div>

            {paymentMode === 'CONTADO' && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-zinc-600 uppercase tracking-wide">Efectivo recibido</p>
                {[
                  { label: 'Guaraníes (Gs.)', val: tenderedGs, set: setTenderedGs, note: '' },
                  { label: `Reales (R$) × ${rates.BRL_TO_GS}`, val: tenderedBrl, set: setTenderedBrl, note: `≈ Gs. ${((Number(tenderedBrl)||0)*rates.BRL_TO_GS).toLocaleString()}` },
                  { label: `Dólares (US$) × ${rates.USD_TO_GS}`, val: tenderedUsd, set: setTenderedUsd, note: `≈ Gs. ${((Number(tenderedUsd)||0)*rates.USD_TO_GS).toLocaleString()}` },
                ].map(({ label, val, set, note }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-32 text-xs font-bold text-zinc-600 shrink-0">{label}</span>
                    <div className="flex-1 space-y-0.5">
                      <input type="number" value={val} onChange={e => set(e.target.value)} placeholder="0"
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 font-mono text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none text-right" />
                      {note && <p className="text-[10px] text-zinc-400 font-mono text-right">{note}</p>}
                    </div>
                  </div>
                ))}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono space-y-1.5">
                  <div className="flex justify-between"><span className="text-zinc-500">Recibido:</span><span className={`font-bold ${totalRecibidoGs >= totalGs ? 'text-emerald-600' : 'text-red-500'}`}>Gs. {totalRecibidoGs.toLocaleString()}</span></div>
                  <div className="flex justify-between font-black text-sm"><span className="text-zinc-600">Vuelto:</span><span className="text-indigo-600">Gs. {vueltoGs.toLocaleString()}</span></div>
                </div>
              </div>
            )}

            {paymentMode === 'CREDITO_FIADO' && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-bold">Venta a crédito — sin cobro en caja.</p>
                <p>Se registrará como deuda de <strong>{selectedCustomer.name}</strong> por Gs. {totalGs.toLocaleString()}</p>
              </div>
            )}

            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-1 max-h-28 overflow-y-auto">
              {cart.map(i => (
                <div key={i.variant.id} className="flex justify-between text-xs text-zinc-500">
                  <span className="truncate flex-1 mr-2">{i.quantity}x {i.variant.productName} ({i.variant.size}·{i.variant.color})</span>
                  <span className="font-mono font-semibold">Gs. {((i.customPriceGs ?? i.variant.precioVentaGs) * i.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <button onClick={handleFinalizeSale}
              disabled={submitting || (paymentMode === 'CONTADO' && totalRecibidoGs < totalGs)}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Confirmar Venta y Emitir Ticket
            </button>
          </div>
        </div>
      )}

      {showScanner && <BarcodeScanner onDetected={handleScanDetected} onClose={() => setShowScanner(false)} />}
      <RemoteScannerModal
        isOpen={showRemoteScanner}
        onClose={() => setShowRemoteScanner(false)}
        onBarcodeReceived={handleScanDetected}
        title="Lector Móvil para Caja POS"
        subtitle="Escaneá el QR con tu celular. Cada prenda que apuntes con la cámara del teléfono se agregará automáticamente al carrito de cobro."
      />
      {completedSale && <TicketReceiptModal sale={completedSale} businessInfo={businessInfo} onClose={() => setCompletedSale(null)} />}
    </div>
  );
};
