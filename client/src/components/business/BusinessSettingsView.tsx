import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Save, 
  Check, 
  Upload, 
  Receipt, 
  MapPin, 
  Phone, 
  Mail,
  FileText, 
  Store,
  Sparkles,
  Trash2,
  Share2,
  Loader2,
  AlertCircle,
  RotateCcw,
  Image as ImageIcon
} from 'lucide-react';
import { BusinessInfo } from '../../types';

interface BusinessSettingsViewProps {
  businessInfo: BusinessInfo;
  onSaveBusinessInfo: (info: BusinessInfo) => Promise<void> | void;
}

const OFFICIAL_FLORECER: BusinessInfo = {
  name: 'Florecer',
  legalName: 'Florecer Personalizados y Papelería',
  ruc: '80100254-0',
  phone: '+595 993 346 854',
  email: 'florecerpersonalizadoscde@gmail.com',
  address: 'Avda. Tte. Rojas Silva c/ Patricio Colman',
  city: 'Ciudad del Este',
  ticketFooterMessage: '¡Gracias por su preferencia! Ideas hechas realidad.',
  logoUrl: '/florecer_logo.jpg',
  bannerUrl: '/florecer_banner.jpg',
  facebook: 'Florecer Personalizados',
  instagram: 'florecerpersonalizadoscde',
  quoteIntro: 'Por medio de la presente, me dirijo a usted de la manera más atenta y respetuosa, para hacerle llegar nuestro presupuesto actualizado',
  quoteDefaultValidityDays: 8,
  quoteDefaultPaymentTerms: '50% AL CONFIRMAR Y AL FINALIZAR EL TRABAJO 50% RESTANTE',
  quoteDefaultDeliveryTerms: '3 DÍAS HÁBILES',
  quoteDefaultNotes: ''
};

export const BusinessSettingsView: React.FC<BusinessSettingsViewProps> = ({
  businessInfo,
  onSaveBusinessInfo
}) => {
  const [formData, setFormData] = useState<BusinessInfo>({ ...businessInfo });
  const [showToast, setShowToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sincronizar si cambian los datos cargados desde el servidor
  useEffect(() => {
    setFormData({ ...businessInfo });
  }, [businessInfo]);

  const handleChange = (field: keyof BusinessInfo, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.88);
            handleChange('logoUrl', compressed);
          } else {
            handleChange('logoUrl', event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxW = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxW) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.9);
            handleChange('bannerUrl', compressed);
          } else {
            handleChange('bannerUrl', event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRestoreOfficial = () => {
    if (confirm('¿Restablecer los datos de la empresa, zócalo y logo oficial de Florecer?')) {
      setFormData({ ...OFFICIAL_FLORECER });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSaveBusinessInfo(formData);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar los datos en la base de datos.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Datos de la Empresa & Presupuestos
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Personaliza el nombre, logo, contacto y zócalos oficiales. Guardado permanente en la nube (PostgreSQL).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRestoreOfficial}
            className="px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5 transition-colors"
            title="Cargar diseño oficial Florecer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Diseño Florecer</span>
          </button>

          {showToast && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-medium flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4" />
              ¡Guardado exitoso en la Base de Datos!
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulario de Configuración (7 cols) */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <Store className="w-4 h-4 text-indigo-600" />
              Identidad Visual (Logo y Zócalo Oficial)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Logo de la Empresa */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Logo de la Tienda (Cabecera PDF)
                </label>

                {formData.logoUrl ? (
                  <div className="flex items-center gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60">
                    <img
                      src={formData.logoUrl}
                      alt="Logo Empresa"
                      className="w-16 h-16 rounded-xl object-contain border border-zinc-300 dark:border-zinc-700 bg-white p-1"
                    />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        Logo cargado
                      </p>
                      <button
                        type="button"
                        onClick={() => handleChange('logoUrl', '')}
                        className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 rounded-2xl cursor-pointer bg-slate-50/50 dark:bg-zinc-800/30 text-center transition-colors">
                    <Upload className="w-5 h-5 text-indigo-600 mb-1" />
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Subir Logo
                    </span>
                    <span className="text-[10px] text-zinc-400">PNG o JPG</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
              </div>

              {/* Zócalo Banner Oficial */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Banner / Zócalo de Pie de Página
                </label>

                {formData.bannerUrl ? (
                  <div className="flex items-center gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/60">
                    <img
                      src={formData.bannerUrl}
                      alt="Zócalo Banner"
                      className="w-24 h-16 rounded-xl object-cover border border-zinc-300 dark:border-zinc-700 bg-white"
                    />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        Banner Oficial
                      </p>
                      <button
                        type="button"
                        onClick={() => handleChange('bannerUrl', '')}
                        className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 rounded-2xl cursor-pointer bg-slate-50/50 dark:bg-zinc-800/30 text-center transition-colors">
                    <ImageIcon className="w-5 h-5 text-indigo-600 mb-1" />
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Subir Banner Zócalo
                    </span>
                    <span className="text-[10px] text-zinc-400">Diseño horizontal con redes</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBannerUpload}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Nombre de Fantasía
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ej: Florecer"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Razón Social / Rubro
                </label>
                <input
                  type="text"
                  value={formData.legalName}
                  onChange={(e) => handleChange('legalName', e.target.value)}
                  placeholder="Ej: Florecer Personalizados y Papelería"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  RUC / C.I. con DV
                </label>
                <input
                  type="text"
                  required
                  value={formData.ruc}
                  onChange={(e) => handleChange('ruc', e.target.value)}
                  placeholder="Ej: 80100254-0"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="Ej: +595 993 346 854"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Correo Electrónico (E-mail)
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Ej: florecerpersonalizadoscde@gmail.com"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Ciudad / País
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Ej: Ciudad del Este"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Dirección del Local / Taller
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Ej: Avda. Tte. Rojas Silva c/ Patricio Colman"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Facebook
                </label>
                <input
                  type="text"
                  value={formData.facebook || ''}
                  onChange={(e) => handleChange('facebook', e.target.value)}
                  placeholder="Ej: Florecer Personalizados"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Instagram
                </label>
                <input
                  type="text"
                  value={formData.instagram || ''}
                  onChange={(e) => handleChange('instagram', e.target.value)}
                  placeholder="Ej: florecerpersonalizadoscde"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm outline-none"
                />
              </div>
            </div>

            {/* Sección Presupuestos PDF por defecto */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Valores por Defecto para Presupuestos de Venta
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Texto Introductorio / Cortesía
                  </label>
                  <input
                    type="text"
                    value={formData.quoteIntro || ''}
                    onChange={(e) => handleChange('quoteIntro', e.target.value)}
                    placeholder="Por medio de la presente, me dirijo a usted..."
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-xs font-medium outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Validez por Defecto (Días)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.quoteDefaultValidityDays || 8}
                      onChange={(e) => handleChange('quoteDefaultValidityDays', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Modo de Pago Sugerido
                    </label>
                    <input
                      type="text"
                      value={formData.quoteDefaultPaymentTerms || ''}
                      onChange={(e) => handleChange('quoteDefaultPaymentTerms', e.target.value)}
                      placeholder="50% anticipo, 50% entrega"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Plazo de Entrega Sugerido
                    </label>
                    <input
                      type="text"
                      value={formData.quoteDefaultDeliveryTerms || ''}
                      onChange={(e) => handleChange('quoteDefaultDeliveryTerms', e.target.value)}
                      placeholder="3 DÍAS HÁBILES"
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando en BD...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar en Base de Datos</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Previsualización en Vivo de Cabecera y Zócalo Oficial (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-600" />
            Vista Previa del Presupuesto A4
          </span>

          <div className="p-5 rounded-3xl bg-white text-zinc-900 border border-zinc-300 shadow-xl text-xs space-y-4">
            {/* Cabecera Superior con Barra Dorada Lateral (Diseño Oficial Florecer) */}
            <div className="flex items-start justify-between pb-3 border-b border-zinc-200">
              <div>
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="Logo"
                    className="h-12 object-contain rounded"
                  />
                ) : (
                  <h4 className="font-serif font-black text-xl text-slate-900 tracking-tight text-[#102A43]">
                    {formData.name || 'Florecer'}
                  </h4>
                )}
                <span className="text-[9px] uppercase tracking-wider text-[#C59B4E] font-extrabold block mt-0.5">
                  PERSONALIZADOS Y PAPELERÍA
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-right text-[10px] text-zinc-600 font-mono">
                <div className="space-y-0.5">
                  <p className="font-bold text-zinc-900">{formData.phone || '+595 993 346 854'}</p>
                  <p>{formData.address ? `${formData.address} - CDE` : 'Tte Rojas Silva c/ Patricio Colman - CDE'}</p>
                  <p className="text-[9px] text-zinc-500">{formData.email || 'florecerpersonalizadoscde@gmail.com'}</p>
                </div>
                {/* Barra lateral dorada */}
                <div className="w-1 self-stretch bg-[#C59B4E] rounded-full" />
              </div>
            </div>

            {/* Título y metadatos demo */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 text-[11px]">Señores: DOMO SMART S.A.</span>
                <span className="font-bold text-zinc-500 text-[10px]">Validez: {formData.quoteDefaultValidityDays || 8} DÍAS</span>
              </div>
              <p className="text-[10px] text-zinc-500 italic leading-snug">
                "{formData.quoteIntro || 'Por medio de la presente, me dirijo a usted de la manera más atenta...'}"
              </p>
            </div>

            {/* Mini tabla ilustrativa */}
            <div className="border border-zinc-200 rounded-lg overflow-hidden text-[10px]">
              <div className="bg-[#D4EEF2] font-bold p-1.5 flex justify-between border-b border-zinc-200 text-sky-950">
                <span>CÓDIGO | DESCRIPCIÓN</span>
                <span>TOTAL</span>
              </div>
              <div className="p-1.5 flex justify-between border-b border-zinc-100">
                <span>VOLANTE 10,5 X 14,8 CM 200 UDS</span>
                <span className="font-mono font-bold">₲ 500.000</span>
              </div>
              <div className="p-1.5 flex justify-between border-b border-zinc-100">
                <span>TAZA PERSONALIZADA SUBLIMADA</span>
                <span className="font-mono font-bold">₲ 45.000</span>
              </div>
              <div className="bg-zinc-700 text-white p-1.5 flex justify-between font-bold font-mono">
                <span>TOTAL:</span>
                <span>₲ 545.000</span>
              </div>
            </div>

            {/* Zócalo Banner Oficial Florecer (Gráfico Oficial con Redes Sociales y Franja Dorada) */}
            <div className="pt-2 space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
                Zócalo Oficial de Pie de Página (Banner):
              </span>
              <img
                src={formData.bannerUrl || '/florecer_banner.jpg'}
                alt="Banner Zócalo"
                className="w-full rounded-lg border border-zinc-200 shadow-sm object-contain bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
