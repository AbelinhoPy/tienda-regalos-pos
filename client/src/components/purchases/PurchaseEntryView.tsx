import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Calculator, CheckCircle2, AlertCircle, ShoppingBag, Loader2 } from 'lucide-react';
import { Currency, CurrencyRates } from '../../types';
import { api } from '../../services/api';

interface PurchaseItemRow {
  id: string;
  productName: string;
  category: string;
  size: string;
  color: string;
  barcode: string;
  quantity: number;
  costoMonedaOrigen: number;
  margenGananciaPct: number;
}

interface PurchaseEntryViewProps {
  rates: CurrencyRates;
  onSavePurchase?: (purchaseData: any) => void;
}

export const PurchaseEntryView: React.FC<PurchaseEntryViewProps> = ({ rates, onSavePurchase }) => {
  const [purchaseNumber, setPurchaseNumber] = useState(`COMP-${Date.now().toString().slice(-6)}`);
  const [supplierName, setSupplierName] = useState('Confecções & Moda Brasil LTDA');
  const [currency, setCurrency] = useState<Currency>('BRL');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Override manual de cotización
  const [useCustomRate, setUseCustomRate] = useState(true);
  const [customRate, setCustomRate] = useState<number>(1350); // Ejemplo del requerimiento

  // Lista de variantes a ingresar en el lote
  const [items, setItems] = useState<PurchaseItemRow[]>([
    {
      id: '1',
      productName: 'Vestido Midi Lino',
      category: 'Vestidos',
      size: 'M',
      color: 'Terracota',
      barcode: '7840001001',
      quantity: 12,
      costoMonedaOrigen: 45.00, // R$ 45.00
      margenGananciaPct: 60
    },
    {
      id: '2',
      productName: 'Vestido Midi Lino',
      category: 'Vestidos',
      size: 'G',
      color: 'Terracota',
      barcode: '7840001002',
      quantity: 12,
      costoMonedaOrigen: 45.00,
      margenGananciaPct: 60
    },
    {
      id: '3',
      productName: 'Jeans Flare Premium',
      category: 'Pantalones',
      size: '38',
      color: 'Azul Clásico',
      barcode: '7840002038',
      quantity: 10,
      costoMonedaOrigen: 65.00, // R$ 65.00
      margenGananciaPct: 70
    }
  ]);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Cotización efectiva aplicada a la compra
  const effectiveRate = useMemo(() => {
    if (currency === 'GS') return 1.0;
    if (useCustomRate && customRate > 0) return customRate;
    return currency === 'BRL' ? rates.BRL_TO_GS : rates.USD_TO_GS;
  }, [currency, useCustomRate, customRate, rates]);

  // Cálculos reactivos por fila
  const calculatedRows = useMemo(() => {
    return items.map((item) => {
      // Costo_Gs = Costo_Moneda_Origen * Cotizacion_Compra_Real
      const costoGsReal = Math.round(item.costoMonedaOrigen * effectiveRate);
      
      // Margen y Precio de venta en Gs.
      const multiplier = 1 + item.margenGananciaPct / 100;
      const precioVentaGs = Math.round((costoGsReal * multiplier) / 1000) * 1000;
      
      const subtotalOrigen = item.costoMonedaOrigen * item.quantity;
      const subtotalGsReal = costoGsReal * item.quantity;
      const gananciaUnitariaGs = precioVentaGs - costoGsReal;

      return {
        ...item,
        costoGsReal,
        precioVentaGs,
        subtotalOrigen,
        subtotalGsReal,
        gananciaUnitariaGs
      };
    });
  }, [items, effectiveRate]);

  // Totales generales
  const totalMonedaOrigen = useMemo(() => {
    return calculatedRows.reduce((acc, it) => acc + it.subtotalOrigen, 0);
  }, [calculatedRows]);

  const totalGsReal = useMemo(() => {
    return calculatedRows.reduce((acc, it) => acc + it.subtotalGsReal, 0);
  }, [calculatedRows]);

  const handleAddItem = () => {
    const newItem: PurchaseItemRow = {
      id: Math.random().toString(),
      productName: 'Remera Algodón Pima',
      category: 'Remeras',
      size: 'P',
      color: 'Blanco',
      barcode: `784000${Math.floor(1000 + Math.random() * 9000)}`,
      quantity: 6,
      costoMonedaOrigen: 25.0,
      margenGananciaPct: 60
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof PurchaseItemRow, value: any) => {
    setItems(
      items.map((it) => {
        if (it.id === id) {
          return { ...it, [field]: value };
        }
        return it;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Agregá al menos un ítem al lote de compra.');
      return;
    }
    setSaving(true);
    setErrorMessage('');
    try {
      const purchasePayload = {
        purchaseNumber,
        supplierName,
        currency,
        customRate: useCustomRate ? customRate : undefined,
        items: items.map(it => ({
          productName: it.productName.trim() || 'Prenda',
          category: it.category || 'Vestidos',
          size: it.size || 'M',
          color: it.color?.trim() || 'Único',
          barcode: it.barcode?.trim() || undefined,
          quantity: Number(it.quantity) || 1,
          costoMonedaOrigen: Number(it.costoMonedaOrigen) || 0,
          margenGananciaPct: Number(it.margenGananciaPct) || 0,
        }))
      };

      await api.post('/api/purchases', purchasePayload);

      if (onSavePurchase) {
        onSavePurchase(purchasePayload);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
      setPurchaseNumber(`COMP-${Date.now().toString().slice(-6)}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar la compra');
      alert(`Error al registrar compra: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado de la Pantalla */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Ingreso de Compras y Lotes (Multimoneda)
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Registra compras en Reales o Dólares con cálculo exacto de costo en Guaraníes vía cotización personalizada.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-medium animate-fade-in">
            <CheckCircle2 className="w-5 h-5" />
            ¡Lote de compra registrado y stock actualizado con éxito!
          </div>
        )}
      </div>

      {/* Tarjeta de Parámetros de Compra y Tipo de Cambio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Datos del Comprobante */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            1. Datos del Proveedor & Comprobante
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                N° de Factura / Recibo
              </label>
              <input
                type="text"
                value={purchaseNumber}
                onChange={(e) => setPurchaseNumber(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800/80 text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                Proveedor / Origen
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800/80 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Módulo Multimoneda y Cotización de Compra (OVERRIDE MANUAL) */}
        <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              2. Divisa & Cotización de Compra
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Moneda de Pago al Proveedor
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['GS', 'BRL', 'USD'] as Currency[]).map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => {
                      setCurrency(curr);
                      if (curr === 'BRL') setCustomRate(1350);
                      if (curr === 'USD') setCustomRate(7550);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      currency === curr
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    {curr === 'GS' ? 'Gs. (Base)' : curr === 'BRL' ? 'R$ (Real)' : 'US$ (Dólar)'}
                  </button>
                ))}
              </div>
            </div>

            {currency !== 'GS' && (
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Tipo de Cambio Aplicado (Manual Override)
                  </label>
                  <span className="text-[11px] text-zinc-400">
                    Ref. oficial: Gs. {currency === 'BRL' ? rates.BRL_TO_GS : rates.USD_TO_GS}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-zinc-400">Gs.</span>
                  <input
                    type="number"
                    value={customRate}
                    onChange={(e) => setCustomRate(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-800 font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-start gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  El Costo_Gs unitario de este lote se fijará con esta tasa exacta ({customRate.toLocaleString()} Gs./{currency}).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Mercaderías y Variantes (Talle + Color) */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-zinc-100">
              3. Variantes de Prenda & Asignación de Costos/Precios
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Fórmula activa: <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">Costo_Gs = Costo_{currency} × {effectiveRate.toLocaleString()}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Prenda / Variante
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase font-semibold text-[11px]">
                <th className="py-3 px-2">Producto</th>
                <th className="py-3 px-2">Talle</th>
                <th className="py-3 px-2">Color</th>
                <th className="py-3 px-2">Código Barras</th>
                <th className="py-3 px-2 text-center">Cant.</th>
                <th className="py-3 px-2 text-right">Costo ({currency})</th>
                <th className="py-3 px-2 text-right bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300">
                  Costo Real (Gs.)
                </th>
                <th className="py-3 px-2 text-center">Margen %</th>
                <th className="py-3 px-2 text-right bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">
                  P. Venta Sugerido (Gs.)
                </th>
                <th className="py-3 px-2 text-right">Subtotal Gs.</th>
                <th className="py-3 px-2 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {calculatedRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="py-2.5 px-2">
                    <input
                      type="text"
                      value={row.productName}
                      onChange={(e) => handleUpdateItem(row.id, 'productName', e.target.value)}
                      className="w-36 px-2 py-1 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-transparent font-medium"
                    />
                  </td>
                  <td className="py-2.5 px-2">
                    <select
                      value={row.size}
                      onChange={(e) => handleUpdateItem(row.id, 'size', e.target.value)}
                      className="w-16 px-1.5 py-1 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-transparent font-bold"
                    >
                      <option value="PP">PP</option>
                      <option value="P">P</option>
                      <option value="M">M</option>
                      <option value="G">G</option>
                      <option value="GG">GG</option>
                      <option value="36">36</option>
                      <option value="38">38</option>
                      <option value="40">40</option>
                      <option value="42">42</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-2">
                    <input
                      type="text"
                      value={row.color}
                      onChange={(e) => handleUpdateItem(row.id, 'color', e.target.value)}
                      className="w-20 px-2 py-1 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-transparent"
                    />
                  </td>
                  <td className="py-2.5 px-2">
                    <input
                      type="text"
                      value={row.barcode}
                      onChange={(e) => handleUpdateItem(row.id, 'barcode', e.target.value)}
                      className="w-28 px-2 py-1 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-transparent font-mono text-[11px]"
                    />
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <input
                      type="number"
                      value={row.quantity}
                      min="1"
                      onChange={(e) => handleUpdateItem(row.id, 'quantity', Number(e.target.value))}
                      className="w-14 px-1.5 py-1 text-center border border-zinc-200 dark:border-zinc-700 rounded-lg bg-transparent font-semibold"
                    />
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <input
                      type="number"
                      step="0.5"
                      value={row.costoMonedaOrigen}
                      onChange={(e) => handleUpdateItem(row.id, 'costoMonedaOrigen', Number(e.target.value))}
                      className="w-20 px-2 py-1 text-right border border-zinc-200 dark:border-zinc-700 rounded-lg bg-transparent font-mono font-semibold"
                    />
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/10">
                    Gs. {row.costoGsReal.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        value={row.margenGananciaPct}
                        onChange={(e) => handleUpdateItem(row.id, 'margenGananciaPct', Number(e.target.value))}
                        className="w-14 px-1 py-1 text-center border border-zinc-200 dark:border-zinc-700 rounded-lg bg-transparent font-semibold"
                      />
                      <span>%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10">
                    Gs. {row.precioVentaGs.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-zinc-700 dark:text-zinc-300">
                    Gs. {row.subtotalGsReal.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(row.id)}
                      className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Eliminar fila"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumen del Lote */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Total en {currency}:</span>
              <p className="text-lg font-bold font-mono text-slate-800 dark:text-zinc-200">
                {currency === 'BRL' ? 'R$' : currency === 'USD' ? 'US$' : 'Gs.'} {totalMonedaOrigen.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Costo Total Real en Guaraníes:</span>
              <p className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                Gs. {totalGsReal.toLocaleString()}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            <span>{saving ? 'Guardando Lote...' : 'Confirmar y Guardar Lote de Compra'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
