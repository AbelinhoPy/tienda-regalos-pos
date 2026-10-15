import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Plus, Trash2, Search, FileText, Eye, Download,
  Save, AlertCircle, Sparkles, Building2, User, Phone,
  MapPin, Calendar, Clock, DollarSign, Upload, Image as ImageIcon,
  Check, Loader2
} from 'lucide-react';
import { Quote, QuoteItem, Customer, ProductVariant, Currency, BusinessInfo } from '../../types';
import { api } from '../../services/api';

interface QuoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (quote: Quote) => void;
  editingQuote?: Quote | null;
  businessInfo: BusinessInfo;
  onPreviewPdf: (quoteData: any) => void;
}

// Conversión cliente-side rápida para display mientras se tipea
function convertirEnteroALetras(valor: number): string {
  if (valor === 0) return 'CERO';
  const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
  const DECENAS = ['', '', 'VEINTI', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  function grupo(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';
    let s = '';
    const c = Math.floor(n / 100);
    const resto = n % 100;
    const d = Math.floor(resto / 10);
    const u = resto % 10;
    if (c > 0) s += CENTENAS[c] + ' ';
    if (resto <= 20) {
      if (resto > 0) s += UNIDADES[resto];
    } else if (resto > 20 && resto < 30) {
      s += 'VEINTI' + UNIDADES[u];
    } else {
      s += DECENAS[d];
      if (u > 0) s += ' Y ' + UNIDADES[u];
    }
    return s.trim();
  }

  const abs = Math.floor(Math.abs(valor));
  const millones = Math.floor(abs / 1000000);
  const miles = Math.floor((abs % 1000000) / 1000);
  const unidades = abs % 1000;
  let res = '';
  if (millones > 0) res += millones === 1 ? 'UN MILLÓN ' : grupo(millones) + ' MILLONES ';
  if (miles > 0) res += miles === 1 ? 'MIL ' : grupo(miles) + ' MIL ';
  if (unidades > 0) res += grupo(unidades);
  return res.trim();
}

export const QuoteEditorModal: React.FC<QuoteEditorModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  editingQuote,
  businessInfo,
  onPreviewPdf,
}) => {
  // Clientes y catálogo cargados para autocompletar
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Selector de cliente
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientDocument, setClientDocument] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientContact, setClientContact] = useState('');

  // Condiciones comerciales
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [validityDays, setValidityDays] = useState(8);
  const [currency, setCurrency] = useState<Currency>('GS');
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [saleCondition, setSaleCondition] = useState('CONTADO');
  const [paymentMethod, setPaymentMethod] = useState('50% AL CONFIRMAR Y AL FINALIZAR EL TRABAJO 50% RESTANTE');
  const [deliveryTime, setDeliveryTime] = useState('3 DÍAS HÁBILES');
  const [introText, setIntroText] = useState('Por medio de la presente, me dirijo a usted de la manera más atenta y respetuosa, para hacerle llegar nuestro presupuesto actualizado');
  const [notes, setNotes] = useState('');

  // Ítems del presupuesto
  const [items, setItems] = useState<QuoteItem[]>([
    {
      code: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      imageUrl: '',
    },
  ]);

  // Buscador de productos para agregar rápidamente
  const [productSearch, setProductSearch] = useState('');
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  // Cargar clientes y productos al abrir
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoadingInitial(true);
      try {
        const [cList, vList] = await Promise.all([
          api.get<Customer[]>('/api/customers').catch(() => []),
          api.get<ProductVariant[]>('/api/products').catch(() => []),
        ]);
        setCustomers(cList || []);
        setVariants(vList || []);
      } finally {
        setLoadingInitial(false);
      }
    };

    loadData();

    if (editingQuote) {
      setSelectedCustomerId(editingQuote.customerId || null);
      setClientName(editingQuote.clientName || '');
      setClientDocument(editingQuote.clientDocument || '');
      setClientAddress(editingQuote.clientAddress || '');
      setClientPhone(editingQuote.clientPhone || '');
      setClientContact(editingQuote.clientContact || '');
      setDate(editingQuote.date ? new Date(editingQuote.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setValidityDays(editingQuote.validityDays || 8);
      setCurrency(editingQuote.currency || 'GS');
      setExchangeRate(editingQuote.exchangeRate || 1.0);
      setSaleCondition(editingQuote.saleCondition || 'CONTADO');
      setPaymentMethod(editingQuote.paymentMethod || '50% AL CONFIRMAR Y AL FINALIZAR EL TRABAJO 50% RESTANTE');
      setDeliveryTime(editingQuote.deliveryTime || '3 DÍAS HÁBILES');
      setIntroText(editingQuote.introText || 'Por medio de la presente, me dirijo a usted de la manera más atenta y respetuosa, para hacerle llegar nuestro presupuesto actualizado');
      setNotes(editingQuote.notes || '');
      setItems(editingQuote.items && editingQuote.items.length > 0 ? [...editingQuote.items] : [{
        code: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0,
        imageUrl: '',
      }]);
    } else {
      // Valores iniciales limpios
      setSelectedCustomerId(null);
      setClientName('');
      setClientDocument('');
      setClientAddress('');
      setClientPhone('');
      setClientContact('');
      setDate(new Date().toISOString().split('T')[0]);
      setValidityDays(businessInfo.quoteDefaultValidityDays || 8);
      setCurrency('GS');
      setExchangeRate(1.0);
      setSaleCondition('CONTADO');
      setPaymentMethod(businessInfo.quoteDefaultPaymentTerms || '50% AL CONFIRMAR Y AL FINALIZAR EL TRABAJO 50% RESTANTE');
      setDeliveryTime(businessInfo.quoteDefaultDeliveryTerms || '3 DÍAS HÁBILES');
      setIntroText(businessInfo.quoteIntro || 'Por medio de la presente, me dirijo a usted de la manera más atenta y respetuosa, para hacerle llegar nuestro presupuesto actualizado');
      setNotes(businessInfo.quoteDefaultNotes || '');
      setItems([
        {
          code: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          total: 0,
          imageUrl: '',
        },
      ]);
    }
  }, [isOpen, editingQuote, businessInfo]);

  // Cuando se selecciona un cliente del select
  const handleSelectCustomer = (customerIdStr: string) => {
    if (!customerIdStr) {
      setSelectedCustomerId(null);
      return;
    }
    const id = Number(customerIdStr);
    const found = customers.find((c) => c.id === id);
    if (found) {
      setSelectedCustomerId(found.id);
      setClientName(found.name);
      setClientDocument(found.documentId || '');
      setClientPhone(found.phone || '');
    }
  };

  // Manejo de ítems en la tabla
  const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice') {
      const q = Math.max(0, Number(field === 'quantity' ? value : item.quantity) || 0);
      const p = Math.max(0, Number(field === 'unitPrice' ? value : item.unitPrice) || 0);
      item.total = currency === 'GS' ? Math.round(q * p) : Math.round(q * p * 100) / 100;
    }

    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = (variant?: ProductVariant) => {
    if (variant) {
      const descParts = [variant.productName];
      if (variant.size && variant.size !== 'Estándar') descParts.push(variant.size);
      if (variant.color && variant.color !== 'Estándar') descParts.push(variant.color);
      if (variant.presentation) descParts.push(variant.presentation);
      if (variant.material) descParts.push(variant.material);

      setItems((prev) => [
        ...prev,
        {
          productId: variant.productId,
          variantId: variant.id,
          code: variant.barcode || '',
          description: descParts.join(' - '),
          quantity: 1,
          unitPrice: variant.precioVentaGs || 0,
          total: variant.precioVentaGs || 0,
          imageUrl: variant.imageUrl || '',
        },
      ]);
      setIsProductPickerOpen(false);
      setProductSearch('');
    } else {
      // Ítem libre
      setItems((prev) => [
        ...prev,
        {
          code: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          total: 0,
          imageUrl: '',
        },
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setItems([{ code: '', description: '', quantity: 1, unitPrice: 0, total: 0, imageUrl: '' }]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Cálculo en vivo de total y monto en letras
  const calculatedTotal = useMemo(() => {
    const sum = items.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    return currency === 'GS' ? Math.round(sum) : Math.round(sum * 100) / 100;
  }, [items, currency]);

  const totalInWords = useMemo(() => {
    const words = convertirEnteroALetras(calculatedTotal);
    return currency === 'GS' ? `${words} GUARANÍES` : `${words} ${currency}`;
  }, [calculatedTotal, currency]);

  // Filtrado de productos para el buscador rápido
  const filteredVariants = useMemo(() => {
    if (!productSearch.trim()) return variants.slice(0, 15);
    const q = productSearch.toLowerCase();
    return variants
      .filter(
        (v) =>
          v.productName.toLowerCase().includes(q) ||
          v.barcode.includes(q) ||
          (v.presentation || '').toLowerCase().includes(q) ||
          (v.category || '').toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [variants, productSearch]);

  // Guardar (Borrador o Emitido)
  const handleSave = async (status: 'BORRADOR' | 'EMITIDO') => {
    setErrorMsg('');
    if (!clientName.trim()) {
      setErrorMsg('El nombre o razón social del cliente es obligatorio.');
      return;
    }

    const validItems = items.filter((it) => it.description.trim() || it.unitPrice > 0);
    if (validItems.length === 0) {
      setErrorMsg('Debe agregar al menos un ítem con descripción o precio al presupuesto.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerId: selectedCustomerId || undefined,
        clientName: clientName.trim(),
        clientDocument: clientDocument.trim() || undefined,
        clientAddress: clientAddress.trim() || undefined,
        clientPhone: clientPhone.trim() || undefined,
        clientContact: clientContact.trim() || undefined,
        date,
        validityDays: Number(validityDays) || 8,
        currency,
        exchangeRate: Number(exchangeRate) || 1.0,
        saleCondition,
        paymentMethod,
        deliveryTime,
        introText,
        notes: notes.trim() || undefined,
        status,
        items: validItems.map((it, idx) => ({
          productId: it.productId || undefined,
          variantId: it.variantId || undefined,
          code: it.code?.trim() || undefined,
          description: it.description.trim(),
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          imageUrl: it.imageUrl?.trim() || undefined,
          sortOrder: idx,
        })),
      };

      let result: Quote;
      if (editingQuote) {
        result = await api.put<Quote>(`/api/quotes/${editingQuote.id}`, payload);
      } else {
        result = await api.post<Quote>('/api/quotes', payload);
      }

      onSaved(result);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error al guardar el presupuesto');
    } finally {
      setSaving(false);
    }
  };

  // Previsualizar en vivo el PDF
  const handleTriggerPreview = () => {
    const validItems = items.filter((it) => it.description.trim() || it.unitPrice > 0);
    const quoteData = {
      quoteNumber: editingQuote?.quoteNumber || 'PPTO-VISTA-PREVIA',
      date,
      validityDays,
      currency,
      clientName: clientName.trim() || 'CLIENTE (VISTA PREVIA)',
      clientDocument: clientDocument.trim() || '',
      clientAddress: clientAddress.trim() || '',
      clientPhone: clientPhone.trim() || '',
      clientContact: clientContact.trim() || '',
      introText,
      saleCondition,
      paymentMethod,
      deliveryTime,
      notes: notes.trim() || '',
      total: calculatedTotal,
      totalInWords,
      items: validItems.length > 0 ? validItems : items,
    };
    onPreviewPdf(quoteData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-5xl w-full my-6 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Cabecera modal */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <span>{editingQuote ? `Editar Presupuesto: ${editingQuote.quoteNumber}` : 'Nuevo Presupuesto de Venta'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                  {currency}
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Diseñado para entrega profesional en PDF · No descuenta inventario ni mueve caja
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo con scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Bloque 1: Datos del Cliente */}
          <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-600" />
                Datos del Cliente (Destinatario)
              </span>

              {/* Selector de clientes registrados */}
              {customers.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400">Autocompletar:</span>
                  <select
                    value={selectedCustomerId || ''}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 outline-none"
                  >
                    <option value="">-- Seleccionar cliente existente --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.documentId ? `(${c.documentId})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Nombre / Razón Social *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: DOMO SMART S.A."
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-bold text-slate-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">RUC / Documento</label>
                <input
                  type="text"
                  value={clientDocument}
                  onChange={(e) => setClientDocument(e.target.value)}
                  placeholder="Ej: 80100254 - 0"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-mono text-slate-800 dark:text-zinc-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Teléfono / WhatsApp</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Ej: +595 993 346 854"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-slate-800 dark:text-zinc-200 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Dirección</label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Ej: Avda. San Blas c/ Patricio Colman"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-slate-800 dark:text-zinc-200 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Persona de Contacto</label>
                <input
                  type="text"
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  placeholder="Ej: Lic. Carlos Benítez"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-slate-800 dark:text-zinc-200 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bloque 2: Ítems y Productos del Presupuesto */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Ítems del Presupuesto (Productos, Impresiones o Servicios)
              </span>

              <div className="flex items-center gap-2">
                {/* Botón Buscar en Catálogo */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProductPickerOpen(!isProductPickerOpen)}
                    className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Agregar del Inventario</span>
                  </button>

                  {/* Popover de búsqueda de inventario */}
                  {isProductPickerOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-3 z-30 space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="text-xs font-bold">Seleccionar producto</span>
                        <button type="button" onClick={() => setIsProductPickerOpen(false)} className="p-1 text-zinc-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        autoFocus
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Buscar por nombre, código..."
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none"
                      />
                      <div className="max-h-56 overflow-y-auto space-y-1">
                        {filteredVariants.map((v) => (
                          <div
                            key={v.id}
                            onClick={() => handleAddItem(v)}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <div className="truncate pr-2">
                              <p className="font-bold truncate text-slate-800 dark:text-zinc-200">{v.productName}</p>
                              <p className="text-[10px] text-zinc-400">
                                {v.size !== 'Estándar' ? `${v.size} · ` : ''}
                                {v.presentation ? `${v.presentation} · ` : ''}
                                {v.barcode}
                              </p>
                            </div>
                            <span className="font-mono font-bold text-indigo-600 whitespace-nowrap">
                              Gs. {v.precioVentaGs.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Botón Ítem Libre */}
                <button
                  type="button"
                  onClick={() => handleAddItem()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ítem Personalizado</span>
                </button>
              </div>
            </div>

            {/* Tabla de ítems interactiva */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-sky-50 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700 text-[11px] uppercase font-bold">
                    <th className="py-2.5 px-3 w-24">Código</th>
                    <th className="py-2.5 px-3">Descripción Editable</th>
                    <th className="py-2.5 px-2 w-28 text-right">Precio Unit.</th>
                    <th className="py-2.5 px-2 w-20 text-center">Cant.</th>
                    <th className="py-2.5 px-2 w-28 text-right">Total</th>
                    <th className="py-2.5 px-2 w-28 text-center">Foto (URL)</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                  {items.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.code || ''}
                          onChange={(e) => handleItemChange(idx, 'code', e.target.value)}
                          placeholder="Opcional"
                          className="w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg font-mono text-[11px] outline-none"
                        />
                      </td>

                      <td className="p-2">
                        <textarea
                          rows={2}
                          required
                          value={row.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Descripción del producto o servicio (ej: VOLANTE 10,5 X 14,8 CM 200 UDS)"
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-semibold uppercase outline-none resize-none leading-snug"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step={currency === 'GS' ? '1' : '0.01'}
                          value={row.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg font-mono font-bold text-right text-xs outline-none"
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          min="0.01"
                          step="1"
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg font-mono font-bold text-center text-xs outline-none"
                        />
                      </td>

                      <td className="p-2 text-right font-mono font-extrabold text-slate-900 dark:text-zinc-100">
                        {currency === 'GS' ? `₲ ${row.total.toLocaleString()}` : `${currency} ${row.total.toFixed(2)}`}
                      </td>

                      <td className="p-2 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="text"
                            value={row.imageUrl || ''}
                            onChange={(e) => handleItemChange(idx, 'imageUrl', e.target.value)}
                            placeholder="URL foto"
                            className="w-20 px-1.5 py-1 text-[10px] bg-slate-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded outline-none"
                          />
                          {row.imageUrl && (
                            <img
                              src={row.imageUrl}
                              alt=""
                              className="w-6 h-6 rounded object-cover border border-zinc-300"
                              onError={() => handleItemChange(idx, 'imageUrl', '')}
                            />
                          )}
                        </div>
                      </td>

                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Barra inferior de total destacada idéntica al PDF */}
              <div className="bg-zinc-700 text-white px-4 py-3 flex items-center justify-between font-mono">
                <span className="font-extrabold text-sm uppercase tracking-wider">TOTAL PRESUPUESTADO:</span>
                <span className="font-black text-lg">
                  {currency === 'GS' ? `₲ ${calculatedTotal.toLocaleString()}` : `${currency} ${calculatedTotal.toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Monto en letras */}
            <div className="p-3 bg-slate-50 dark:bg-zinc-800/40 rounded-xl text-xs flex items-center gap-2">
              <span className="font-bold text-zinc-500 uppercase">Monto en letras:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200 uppercase">{totalInWords}</span>
            </div>
          </div>

          {/* Bloque 3: Condiciones Comerciales */}
          <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Condiciones Comerciales de la Oferta
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Fecha de Emisión</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Validez de Oferta (Días)</label>
                <input
                  type="number"
                  min="1"
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Moneda del Presupuesto</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-bold outline-none"
                >
                  <option value="GS">Guaraníes (₲)</option>
                  <option value="USD">Dólares Americanos (US$)</option>
                  <option value="BRL">Reales Brasileños (R$)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Condición de Venta</label>
                <input
                  type="text"
                  value={saleCondition}
                  onChange={(e) => setSaleCondition(e.target.value)}
                  placeholder="Ej: CONTADO"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl uppercase outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Modo de Pago</label>
                <input
                  type="text"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="Ej: 50% AL CONFIRMAR Y AL FINALIZAR EL TRABAJO 50% RESTANTE"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl uppercase outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Plazo de Entrega</label>
                <input
                  type="text"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  placeholder="Ej: 3 DÍAS HÁBILES"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl uppercase outline-none"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Texto de Introducción / Cortesía</label>
                <input
                  type="text"
                  value={introText}
                  onChange={(e) => setIntroText(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Observaciones Especiales (Opcional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Los precios incluyen IVA. No incluye flete fuera de Ciudad del Este."
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Barra de acciones inferior */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleTriggerPreview}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>Previsualizar PDF</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('BORRADOR')}
              className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Borrador</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('EMITIDO')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Emitir Presupuesto</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
