import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, Filter, Package, Barcode, AlertTriangle,
  Check, X, Trash2, Image as ImageIcon, Layers, Sparkles,
  Code2, Pencil, ChevronDown, ChevronUp, Loader2, RefreshCw,
  Camera, Smartphone, Shuffle, Copy, CheckCircle2
} from 'lucide-react';
import { ProductVariant } from '../../types';
import { api } from '../../services/api';
import { BarcodeScanner } from '../pos/BarcodeScanner';
import { RemoteScannerModal } from '../scanner/RemoteScannerModal';
import { generateEAN13, playScanBeep } from '../../utils/barcode';

const DEFAULT_CATEGORIES = [
  'Tazas & Vasos Personalizados',
  'Termos & Choperas Grabadas',
  'Remeras & Cuadros Personalizados',
  'Agendas & Papelería Creativa',
  'Cajas de Regalo & Canastas',
  'Llaveros & Accesorios',
  'Volantes, Folletos & Tarjetería',
  'Souvenirs & Eventos',
  'Regalos Corporativos',
  'Grabados Láser & Corte'
];
const SIZES = ['Estándar', 'Chico', 'Mediano', 'Grande', '10,5 x 14,8 cm', 'A4', 'A5', '325 ml', '500 ml', '1 Litro', '1.2 Litros', 'P', 'M', 'G', 'Único'];

// Comprime y redimensiona imágenes del celular a tamaño óptimo web (~50KB JPEG)
function compressImage(file: File, maxWidth = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(event.target?.result as string);
    };
    reader.onerror = (error) => reject(error);
  });
}

export const ProductsView: React.FC = () => {
  const [variants, setVariants]         = useState<ProductVariant[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [searchTerm, setSearchTerm]     = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingVariant, setEditingVariant]   = useState<ProductVariant | null>(null);
  const [toast, setToast]               = useState<{ msg: string; type: 'ok'|'error' } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [saving, setSaving]             = useState(false);
  const [scanningVariantIdx, setScanningVariantIdx] = useState<number | null>(null);
  const [isRemoteScannerOpen, setIsRemoteScannerOpen] = useState(false);
  const [activeRemoteScanIdx, setActiveRemoteScanIdx] = useState(0);
  const [pistolFeedback, setPistolFeedback]           = useState<{ idx: number; code: string } | null>(null);

  // Form
  const [formName, setFormName]         = useState('');
  const [formCategory, setFormCategory] = useState('Vestidos');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [formBrand, setFormBrand]       = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [newVariants, setNewVariants]   = useState([
    { size: 'M', color: '', stock: 1, minStock: 2, costoGs: 0, precioGs: 0, barcode: generateEAN13() }
  ]);
  const [bulkText, setBulkText] = useState('');

  const showToast = (msg: string, type: 'ok'|'error' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Cargar categorías desde la API ──────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get<any>('/api/categories');
      const items = Array.isArray(res) ? res : (res?.data || []);
      if (Array.isArray(items) && items.length > 0) {
        const fetchedNames = items.map((c: any) => c.name).filter(Boolean);
        setCategoriesList(prev => Array.from(new Set([...DEFAULT_CATEGORIES, ...prev, ...fetchedNames])));
      }
    } catch (e) {
      // Ignorar fallo silencioso
    }
  }, []);

  // ── Cargar productos desde la API ──────────────────────────────────────────
  const fetchVariants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<ProductVariant[]>('/api/products');
      setVariants(data);
      // Incorporar también cualquier categoría presente en los productos existentes
      if (Array.isArray(data)) {
        const existingCats = data.map(v => v.category).filter(Boolean);
        setCategoriesList(prev => Array.from(new Set([...prev, ...existingCats])));
      }
    } catch (e: any) {
      setError('No se pudo cargar el catálogo. ¿Está corriendo el backend?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVariants();
    fetchCategories();
  }, [fetchVariants, fetchCategories]);

  // ── Filtrado ───────────────────────────────────────────────────────────────
  const filtered = variants.filter(v => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      v.productName.toLowerCase().includes(q) ||
      v.barcode.includes(q) ||
      v.color.toLowerCase().includes(q) ||
      (v.brand || '').toLowerCase().includes(q);
    const matchCat = selectedCategory === 'TODAS' || v.category === selectedCategory;
    return matchSearch && matchCat;
  });

  // ── Abrir modal edición ────────────────────────────────────────────────────
  const handleOpenEdit = (v: ProductVariant) => {
    setEditingVariant(v);
    setIsAddingNewCategory(false);
    setNewCategoryName('');
    setFormName(v.productName);
    setFormCategory(v.category);
    setFormBrand(v.brand || '');
    setFormImageUrl(v.imageUrl || '');
    setNewVariants([{
      size: v.size, color: v.color, stock: v.stock,
      minStock: v.minStock, costoGs: v.costoGsReal,
      precioGs: v.precioVentaGs, barcode: v.barcode
    }]);
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingVariant(null);
    setIsAddingNewCategory(false);
    setNewCategoryName('');
    const defaultCat = categoriesList[0] || 'Vestidos';
    setFormName(''); setFormCategory(defaultCat); setFormBrand(''); setFormImageUrl('');
    setNewVariants([{ size: 'M', color: '', stock: 1, minStock: 2, costoGs: 0, precioGs: 0, barcode: generateEAN13() }]);
    setIsModalOpen(true);
  };

  const handleAddVariant = () => {
    const usedSizes = new Set(newVariants.map(v => v.size));
    const nextSize = SIZES.find(s => !usedSizes.has(s)) || 'G';
    setNewVariants([
      ...newVariants,
      {
        size: nextSize,
        color: '',
        stock: 1,
        minStock: 2,
        costoGs: newVariants[0]?.costoGs || 0,
        precioGs: newVariants[0]?.precioGs || 0,
        barcode: generateEAN13(),
      }
    ]);
  };

  const handleGenerateRandomBarcode = (idx: number) => {
    const code = generateEAN13();
    const u = [...newVariants];
    u[idx].barcode = code;
    setNewVariants(u);
    playScanBeep(1400, 80);
    showToast(`Código aleatorio EAN-13 generado: ${code}`);
  };

  const handleGenerateAllBarcodes = () => {
    const u = newVariants.map(v => ({ ...v, barcode: generateEAN13() }));
    setNewVariants(u);
    playScanBeep(1400, 100);
    showToast('Se generaron códigos EAN-13 para todas las variantes');
  };

  const handlePistolScan = (idx: number, rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;
    playScanBeep(1200, 90);
    const u = [...newVariants];
    u[idx].barcode = code;
    setNewVariants(u);
    setPistolFeedback({ idx, code });
    setTimeout(() => setPistolFeedback(null), 3500);
    showToast(`✓ Código capturado con pistola: ${code}`);
  };

  const handleOpenRemoteScanner = (idx: number) => {
    setActiveRemoteScanIdx(idx);
    setIsRemoteScannerOpen(true);
  };

  const handleRemoteBarcodeReceived = (code: string) => {
    const idx = activeRemoteScanIdx < newVariants.length ? activeRemoteScanIdx : 0;
    const u = [...newVariants];
    u[idx].barcode = code;
    setNewVariants(u);
    setPistolFeedback({ idx, code });
    setTimeout(() => setPistolFeedback(null), 3500);
    showToast(`📱 Código recibido desde celular: ${code}`);

    // Si hay más variantes en la lista, preparar la siguiente para el próximo escaneo
    if (idx + 1 < newVariants.length) {
      setActiveRemoteScanIdx(idx + 1);
    }
  };

  const handleCopyBarcode = (barcode: string) => {
    navigator.clipboard.writeText(barcode);
    playScanBeep(1500, 50);
    showToast(`Código ${barcode} copiado al portapapeles.`);
  };

  // ── Guardar (nuevo o edición) ──────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Por favor completá el nombre de la prenda.', 'error');
      return;
    }

    // Validación preventiva en frontend
    const combos = new Set<string>();
    const barcodes = new Set<string>();

    for (let i = 0; i < newVariants.length; i++) {
      const v = newVariants[i];
      const combo = `${v.size.toLowerCase()}___${v.color.trim().toLowerCase()}`;
      if (combos.has(combo)) {
        showToast(`Hay variantes repetidas con talle "${v.size}" y color "${v.color || 'Único'}".`, 'error');
        return;
      }
      combos.add(combo);

      if (v.barcode && v.barcode.trim()) {
        const b = v.barcode.trim();
        if (barcodes.has(b)) {
          showToast(`El código de barras "${b}" está repetido en más de una variante.`, 'error');
          return;
        }
        barcodes.add(b);

        // Validar si pertenece a otra prenda en el catálogo
        const existingInCatalog = variants.find(ex => ex.barcode === b && (editingVariant ? ex.id !== editingVariant.id : true));
        if (existingInCatalog) {
          showToast(`El código "${b}" ya pertenece a "${existingInCatalog.productName}" (${existingInCatalog.size} / ${existingInCatalog.color}).`, 'error');
          return;
        }
      }
    }

    const finalCategory = (isAddingNewCategory && newCategoryName.trim() ? newCategoryName.trim() : formCategory.trim()) || 'General';
    if (!categoriesList.includes(finalCategory)) {
      setCategoriesList(prev => [...prev, finalCategory]);
    }

    setSaving(true);
    try {
      if (editingVariant) {
        const nv = newVariants[0];
        await api.put(`/api/products/${editingVariant.id}`, {
          productName: formName.trim(),
          category: finalCategory,
          brand: formBrand.trim() || undefined,
          imageUrl: formImageUrl.trim() || undefined,
          size: nv.size, color: nv.color,
          stock: Number(nv.stock), minStock: Number(nv.minStock),
          costoGs: Number(nv.costoGs), precioGs: Number(nv.precioGs),
          barcode: nv.barcode?.trim() || undefined,
        });
        showToast('Prenda actualizada correctamente.');
      } else {
        await api.post('/api/products', {
          name: formName.trim(),
          category: finalCategory,
          brand: formBrand.trim() || undefined,
          imageUrl: formImageUrl.trim() || undefined,
          variants: newVariants.map(nv => ({
            size: nv.size, color: nv.color,
            stock: Number(nv.stock), minStock: Number(nv.minStock),
            costoGs: Number(nv.costoGs), precioGs: Number(nv.precioGs),
            barcode: nv.barcode?.trim() || undefined,
          })),
        });
        showToast(`"${formName}" agregada correctamente.`);
      }
      setIsModalOpen(false);
      setIsAddingNewCategory(false);
      setNewCategoryName('');
      await fetchVariants();
      await fetchCategories();
    } catch (e: any) {
      showToast(e.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/api/products/${id}`);
      showToast('Prenda eliminada.');
      fetchVariants();
    } catch (e: any) {
      showToast(e.message || 'Error al eliminar', 'error');
    }
  };

  // ── Ajuste rápido de stock ─────────────────────────────────────────────────
  const handleStockAdjust = async (id: number, delta: number) => {
    try {
      const updated = await api.patch<ProductVariant>(`/api/products/${id}/stock`, { delta });
      setVariants(prev => prev.map(v => v.id === id ? { ...v, stock: updated.stock } : v));
    } catch (e: any) {
      showToast(e.message || 'Error al ajustar stock', 'error');
    }
  };

  // ── Carga masiva ───────────────────────────────────────────────────────────
  const handleBulkLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;
    setSaving(true);
    try {
      const lines = bulkText.trim().split('\n');
      const rows = lines
        .filter(l => l.trim() && !l.startsWith('#'))
        .map(line => {
          const p = line.includes('\t') ? line.split('\t') : line.split(',');
          return {
            barcode:      p[0]?.trim() || undefined,
            productName:  p[1]?.trim() || 'Prenda',
            category:     p[2]?.trim() || 'Ropa',
            brand:        p[3]?.trim() || undefined,
            size:         p[4]?.trim() || 'M',
            color:        p[5]?.trim() || 'Único',
            stock:        parseInt(p[6]?.trim() || '5', 10),
            precioVentaGs: parseFloat(p[7]?.trim() || '100000'),
            costoGsReal:  parseFloat(p[8]?.trim() || '50000'),
          };
        });
      if (rows.length === 0) { showToast('No se reconoció ninguna fila válida.', 'error'); return; }
      await api.post('/api/products/bulk', { rows });
      setIsBulkModalOpen(false);
      setBulkText('');
      showToast(`${rows.length} prendas importadas correctamente.`);
      fetchVariants();
    } catch (e: any) {
      showToast(e.message || 'Error al importar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allCategories = ['TODAS', ...Array.from(new Set([...categoriesList, ...variants.map(v => v.category)].filter(Boolean)))];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Productos & Stock
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {variants.length} variantes · {variants.filter(v => v.stock <= v.minStock).length} con stock bajo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchVariants} className="p-2 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Actualizar">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setIsBulkModalOpen(true)}
            className="px-3.5 py-2.5 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-all">
            <Code2 className="w-4 h-4 text-indigo-600" /> Carga masiva
          </button>
          <button onClick={handleOpenNew}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 border ${
          toast.type === 'ok'
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-700'
            : 'bg-red-50 dark:bg-red-950/20 border-red-200 text-red-600'
        }`}>
          {toast.type === 'ok' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Filtros */}
      <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar prenda, código, color, marca..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          {allCategories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm text-zinc-500">Cargando catálogo...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-sm font-semibold text-red-500">{error}</p>
            <button onClick={fetchVariants} className="text-xs text-indigo-600 underline font-semibold">Reintentar</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Package className="w-12 h-12 text-zinc-200 dark:text-zinc-700 mx-auto" />
            <p className="text-sm font-semibold text-zinc-500">
              {variants.length === 0 ? 'Todavía no hay prendas cargadas.' : 'No hay resultados.'}
            </p>
            {variants.length === 0 && (
              <button onClick={handleOpenNew}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700">
                <Plus className="w-4 h-4" /> Agregar primera prenda
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60 text-zinc-500 uppercase font-semibold text-[11px]">
                  <th className="py-3 px-4">Prenda</th>
                  <th className="py-3 px-3">Talle / Color</th>
                  <th className="py-3 px-3">Código</th>
                  <th className="py-3 px-3 text-right">Costo</th>
                  <th className="py-3 px-3 text-right">P. Venta</th>
                  <th className="py-3 px-3 text-center">Stock</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filtered.map(item => {
                  const isLow = item.stock <= item.minStock;
                  const isExpanded = expandedRows.has(item.id);
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.productName}
                                className="w-10 h-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                <ImageIcon className="w-4 h-4 text-zinc-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-800 dark:text-zinc-200 leading-snug">{item.productName}</p>
                              <p className="text-[10px] text-zinc-400">{item.category}{item.brand ? ` · ${item.brand}` : ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-bold font-mono text-slate-800 dark:text-zinc-200 mr-1">{item.size}</span>
                          <span className="text-zinc-500 dark:text-zinc-400">{item.color}</span>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => handleCopyBarcode(item.barcode)}
                            title="Clic para copiar código de barras"
                            className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 group transition-colors px-1 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <Barcode className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-600 group-hover:scale-110 transition-transform" />
                            <span className="font-semibold">{item.barcode}</span>
                            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-zinc-500">
                          Gs. {item.costoGsReal.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-zinc-100">
                          Gs. {item.precioVentaGs.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleStockAdjust(item.id, -1)}
                              className="w-5 h-5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:bg-red-100 hover:text-red-600 font-bold flex items-center justify-center transition-colors">−</button>
                            <span className="font-mono font-bold w-7 text-center text-sm text-slate-800 dark:text-zinc-200">{item.stock}</span>
                            <button onClick={() => handleStockAdjust(item.id, 1)}
                              className="w-5 h-5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:bg-emerald-100 hover:text-emerald-600 font-bold flex items-center justify-center transition-colors">+</button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> Mínimo
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">OK</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleOpenEdit(item)} title="Editar"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(item.id, item.productName)} title="Eliminar"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => toggleRow(item.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                              {expandedRows.has(item.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50 dark:bg-zinc-800/30">
                          <td colSpan={8} className="px-6 py-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div><span className="text-zinc-400 block">Stock mínimo</span><span className="font-bold text-slate-700 dark:text-zinc-300">{item.minStock} uds.</span></div>
                              <div><span className="text-zinc-400 block">Margen</span><span className="font-bold text-emerald-600">{item.costoGsReal > 0 ? Math.round(((item.precioVentaGs - item.costoGsReal) / item.costoGsReal) * 100) : 0}%</span></div>
                              <div><span className="text-zinc-400 block">Ganancia por unidad</span><span className="font-bold text-slate-700 dark:text-zinc-300">Gs. {(item.precioVentaGs - item.costoGsReal).toLocaleString()}</span></div>
                              <div><span className="text-zinc-400 block">Valor stock total</span><span className="font-bold text-slate-700 dark:text-zinc-300">Gs. {(item.precioVentaGs * item.stock).toLocaleString()}</span></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: Nueva / Editar ─────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-2xl w-full p-6 space-y-5 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                {editingVariant ? 'Editar Prenda' : 'Nueva Prenda'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Nombre *</label>
                  <input type="text" required value={formName} onChange={e => setFormName(e.target.value)}
                    placeholder="Ej: Vestido Midi Lino" className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Categoría *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewCategory(!isAddingNewCategory);
                        if (!isAddingNewCategory) setNewCategoryName('');
                      }}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      {isAddingNewCategory ? '✕ Lista existente' : '+ Nueva categoría'}
                    </button>
                  </div>

                  {isAddingNewCategory ? (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={newCategoryName}
                        onChange={e => {
                          setNewCategoryName(e.target.value);
                          setFormCategory(e.target.value);
                        }}
                        placeholder="Ej: Camisas, Bikinis, Trajes..."
                        className="flex-1 px-3 py-2 border border-indigo-400 dark:border-indigo-600 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const trimmed = newCategoryName.trim();
                          if (!trimmed) return;
                          if (!categoriesList.includes(trimmed)) {
                            setCategoriesList(prev => [...prev, trimmed]);
                            try {
                              await api.post('/api/categories', { name: trimmed });
                            } catch (e) {
                              // ignore
                            }
                          }
                          setFormCategory(trimmed);
                          setIsAddingNewCategory(false);
                          showToast(`Categoría "${trimmed}" seleccionada.`);
                        }}
                        disabled={!newCategoryName.trim()}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formCategory}
                      onChange={e => {
                        if (e.target.value === '__NEW__') {
                          setIsAddingNewCategory(true);
                          setNewCategoryName('');
                        } else {
                          setFormCategory(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="__NEW__" className="font-bold text-indigo-600">+ Agregar nueva categoría...</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Marca</label>
                  <input type="text" value={formBrand} onChange={e => setFormBrand(e.target.value)}
                    placeholder="Ej: Zara" className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Foto (URL o subir archivo)</label>
                  <div className="flex gap-2">
                    <input type="url" value={formImageUrl} onChange={e => setFormImageUrl(e.target.value)}
                      placeholder="https://... o subí una foto" className="flex-1 px-3 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <label className="px-3.5 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap flex items-center gap-1.5 transition-colors">
                      {isCompressingImage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                          <span>Optimizando...</span>
                        </>
                      ) : (
                        <>
                          <span>📷 Subir foto</span>
                        </>
                      )}
                      <input type="file" accept="image/*" disabled={isCompressingImage} className="hidden" onChange={async e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            setIsCompressingImage(true);
                            const optimized = await compressImage(file, 800, 0.75);
                            setFormImageUrl(optimized);
                            showToast('Foto optimizada y cargada correctamente.');
                          } catch (err) {
                            showToast('Error al procesar la imagen.', 'error');
                          } finally {
                            setIsCompressingImage(false);
                          }
                        }
                      }} />
                    </label>
                  </div>
                  {formImageUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={formImageUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shadow-sm" onError={() => setFormImageUrl('')} />
                      <button
                        type="button"
                        onClick={() => setFormImageUrl('')}
                        className="text-xs text-red-500 hover:underline font-semibold"
                      >
                        Quitar foto
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Variantes */}
              {/* Variantes */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    {editingVariant ? 'Datos de la variante' : 'Variantes (Talle + Color)'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateAllBarcodes}
                      title="Genera nuevos códigos comerciales EAN-13 para todas las variantes"
                      className="text-[11px] text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 transition-colors"
                    >
                      <Shuffle className="w-3 h-3 text-indigo-500" /> Códigos aleatorios
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenRemoteScanner(0)}
                      title="Usa la cámara de tu celular como pistola lectora inalámbrica"
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 transition-colors"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-indigo-600" /> Usar Celular
                    </button>
                    {!editingVariant && (
                      <button
                        type="button"
                        onClick={handleAddVariant}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1 px-3 py-1 rounded-lg shadow-sm transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar variante
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {newVariants.map((row, idx) => {
                    const isDuplicateInCatalog = row.barcode.trim() && variants.some(v => v.barcode === row.barcode.trim() && (editingVariant ? v.id !== editingVariant.id : true));
                    const isDuplicateInForm = row.barcode.trim() && newVariants.some((o, oIdx) => oIdx !== idx && o.barcode.trim() === row.barcode.trim());
                    const hasConflict = isDuplicateInCatalog || isDuplicateInForm;

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                          pistolFeedback?.idx === idx
                            ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-2 ring-emerald-400/50'
                            : 'border-zinc-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40'
                        }`}
                      >
                        {/* Fila 1: Talle, Color, Stock, Costos */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end text-xs">
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Talle</label>
                            <select
                              value={row.size}
                              onChange={e => { const u=[...newVariants]; u[idx].size=e.target.value; setNewVariants(u); }}
                              className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 font-bold text-xs outline-none"
                            >
                              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Color</label>
                            <input
                              type="text"
                              value={row.color}
                              onChange={e => { const u=[...newVariants]; u[idx].color=e.target.value; setNewVariants(u); }}
                              placeholder="Ej: Negro"
                              className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-xs outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Stock</label>
                            <input
                              type="number"
                              min={0}
                              value={row.stock}
                              onChange={e => { const u=[...newVariants]; u[idx].stock=Number(e.target.value); setNewVariants(u); }}
                              className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-xs text-center font-bold outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Costo Gs.</label>
                            <input
                              type="number"
                              min={0}
                              value={row.costoGs || ''}
                              onChange={e => { const u=[...newVariants]; u[idx].costoGs=Number(e.target.value); setNewVariants(u); }}
                              placeholder="0"
                              className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-xs text-right font-mono outline-none"
                            />
                          </div>
                          <div className="flex items-end gap-1">
                            <div className="flex-1">
                              <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">P. Venta Gs.</label>
                              <input
                                type="number"
                                min={0}
                                value={row.precioGs || ''}
                                onChange={e => { const u=[...newVariants]; u[idx].precioGs=Number(e.target.value); setNewVariants(u); }}
                                placeholder="0"
                                className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-xs text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 outline-none"
                              />
                            </div>
                            {!editingVariant && newVariants.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setNewVariants(newVariants.filter((_, i) => i !== idx))}
                                title="Eliminar variante"
                                className="p-2 text-red-400 hover:text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Fila 2: Código de barras con pistola, aleatorio y cámara */}
                        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                              <Barcode className="w-3.5 h-3.5 text-indigo-500" />
                              Código de Barras (EAN-13)
                              {pistolFeedback?.idx === idx && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full animate-pulse">
                                  ✓ Capturado con lector
                                </span>
                              )}
                            </label>
                            <span className="text-[10px] text-zinc-400">
                              Podés usar pistola USB, cámara o generar uno nuevo
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                            <input
                              type="text"
                              value={row.barcode}
                              onChange={e => {
                                const u=[...newVariants];
                                u[idx].barcode=e.target.value;
                                setNewVariants(u);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handlePistolScan(idx, (e.target as HTMLInputElement).value);
                                }
                              }}
                              placeholder="7840001001"
                              className={`flex-1 px-3 py-2 border rounded-xl bg-white dark:bg-zinc-900 text-xs font-mono font-bold tracking-wider outline-none focus:ring-2 ${
                                hasConflict
                                  ? 'border-red-400 text-red-600 focus:ring-red-400'
                                  : 'border-zinc-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 focus:ring-indigo-500'
                              }`}
                            />

                            {/* Botón Generar Aleatorio */}
                            <button
                              type="button"
                              onClick={() => handleGenerateRandomBarcode(idx)}
                              title="Generar código aleatorio estándar EAN-13 para esta variante"
                              className="px-2.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1 whitespace-nowrap transition-colors"
                            >
                              <Shuffle className="w-3.5 h-3.5" /> Aleatorio
                            </button>

                            {/* Botón Escanear con Cámara */}
                            <button
                              type="button"
                              onClick={() => setScanningVariantIdx(idx)}
                              title="Escanear con cámara del dispositivo (celular o notebook)"
                              className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 text-xs font-bold flex items-center gap-1 whitespace-nowrap transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5 text-indigo-500" /> Cámara
                            </button>

                            {/* Botón Escanear con Celular como Lector Remoto */}
                            <button
                              type="button"
                              onClick={() => handleOpenRemoteScanner(idx)}
                              title="Vincular tu celular para escanear etiquetas y transferirlas aquí"
                              className="px-2.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1 whitespace-nowrap transition-colors"
                            >
                              <Smartphone className="w-3.5 h-3.5" /> Celular
                            </button>
                          </div>

                          {/* Advertencias de duplicado en vivo */}
                          {hasConflict && (
                            <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              {isDuplicateInCatalog
                                ? 'Este código ya está registrado en otra prenda del catálogo. Cambialo o generá uno aleatorio.'
                                : 'Este código está repetido en otra variante de este mismo producto.'}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingVariant ? 'Guardar cambios' : 'Crear prenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Carga masiva ───────────────────────────────────────────── */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">Carga Masiva</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-zinc-500">
              Formato: <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono">CODIGO, NOMBRE, CATEGORIA, MARCA, TALLE, COLOR, STOCK, PRECIO_VENTA, COSTO</code>
            </p>
            <form onSubmit={handleBulkLoad} className="space-y-3">
              <textarea rows={8} value={bulkText} onChange={e => setBulkText(e.target.value)} autoFocus
                placeholder={`7840001, Vestido Midi Lino, Vestidos, Colcci, M, Terracota, 8, 120000, 60000\n7840002, Jeans Flare, Pantalones, Zara, 38, Azul, 12, 175000, 87000`}
                className="w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold">Cancelar</button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Importar prendas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Escáner de cámara para código de barras (desde modal de producto) ── */}
      {scanningVariantIdx !== null && (
        <BarcodeScanner
          onDetected={(code) => {
            const u = [...newVariants];
            if (u[scanningVariantIdx]) {
              u[scanningVariantIdx].barcode = code;
              setNewVariants(u);
              playScanBeep(1200, 100);
              showToast(`✓ Código capturado con cámara: ${code}`);
            }
            setScanningVariantIdx(null);
          }}
          onClose={() => setScanningVariantIdx(null)}
        />
      )}

      {/* ── Escáner Remoto desde Celular (QR + Polling) ── */}
      <RemoteScannerModal
        isOpen={isRemoteScannerOpen}
        onClose={() => setIsRemoteScannerOpen(false)}
        onBarcodeReceived={handleRemoteBarcodeReceived}
        title="Vincular Celular como Lector"
        subtitle={`Escaneá el QR con tu celular. El código se asignará a la variante #${activeRemoteScanIdx + 1} (${newVariants[activeRemoteScanIdx]?.size} · ${newVariants[activeRemoteScanIdx]?.color || 'Único'}).`}
      />
    </div>
  );
};
