import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, FolderOpen, Save, X, Layers, Tag, BookmarkCheck, CheckCircle2 } from 'lucide-react';

export const OFFICIAL_FAMILIES = [
  'BRANDING Y PACKAGING',
  'PAPELERÍA CORPORATIVA',
  'REGALOS Y MERCHANDISING',
  'PRODUCTOS PERSONALIZADOS',
  'BAZAR & ARTÍCULOS SUBLIMADOS',
] as const;

export type OfficialFamily = typeof OFFICIAL_FAMILIES[number];

export interface Category {
  id: number;
  name: string;
  family?: string | null;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryManagerProps {
  onCategorySelect?: (category: Category) => void;
}

export function CategoryManager({ onCategorySelect }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedFamilyFilter, setSelectedFamilyFilter] = useState<string>('TODAS');

  const [formData, setFormData] = useState({
    name: '',
    family: 'PAPELERÍA CORPORATIVA',
    description: '',
    sortOrder: 0,
  });

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Error al obtener categorías');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultCategories = async () => {
    if (!confirm('¿Restablecer e inicializar las Familias y Subdivisiones oficiales de Florecer?')) return;
    setLoading(true);
    try {
      const response = await fetch('/api/categories/initialize', { method: 'POST' });
      if (!response.ok) throw new Error('Error al inicializar categorías');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al inicializar categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('El nombre de la subdivisión es requerido');
      return;
    }

    setLoading(true);
    try {
      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : '/api/categories';

      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Error al guardar categoría');

      const data = await response.json();
      if (data.success) {
        await fetchCategories();
        handleCloseModal();
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      family: category.family || 'PAPELERÍA CORPORATIVA',
      description: category.description || '',
      sortOrder: category.sortOrder,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas desactivar esta subdivisión?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar categoría');

      const data = await response.json();
      if (data.success) {
        await fetchCategories();
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar categoría');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (presetFamily?: string) => {
    setEditingCategory(null);
    setFormData({
      name: '',
      family: presetFamily || (selectedFamilyFilter !== 'TODAS' ? selectedFamilyFilter : 'PAPELERÍA CORPORATIVA'),
      description: '',
      sortOrder: categories.length + 1,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', family: 'PAPELERÍA CORPORATIVA', description: '', sortOrder: 0 });
    setError(null);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Agrupamiento por Familias
  const groupedCategories = useMemo(() => {
    const groups: Record<string, Category[]> = {};

    categories.forEach((cat) => {
      const fam = (cat.family || 'OTRAS').toUpperCase();
      if (!groups[fam]) groups[fam] = [];
      groups[fam].push(cat);
    });

    return groups;
  }, [categories]);

  const displayedFamilies = useMemo(() => {
    if (selectedFamilyFilter === 'TODAS') {
      return Object.keys(groupedCategories).sort();
    }
    return [selectedFamilyFilter];
  }, [groupedCategories, selectedFamilyFilter]);

  const totalSubdivisions = categories.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
              Estructura Oficial Florecer
            </span>
            <span className="text-xs text-zinc-400">· {totalSubdivisions} subdivisiones</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Familias & Materiales
          </h2>
          <p className="text-sm text-zinc-300 mt-1 max-w-2xl">
            Clasifica cada producto y material dentro de su <strong className="text-white">Familia</strong> (Branding, Papelería, Regalos, Personalizados) y su <strong className="text-white">Subdivisión específica</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={initializeDefaultCategories}
            disabled={loading}
            className="flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-zinc-200 rounded-2xl text-xs font-bold transition-all disabled:opacity-50 flex"
            title="Cargar las 4 familias y subdivisiones oficiales del catálogo"
          >
            <Layers size={15} className="text-amber-400" />
            <span>Familias Oficiales</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex-1 md:flex-none items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex"
          >
            <Plus size={16} />
            <span>Nueva Subdivisión</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-600 dark:text-red-400 text-sm font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filtros de Familias (Tabs de Navegación) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedFamilyFilter('TODAS')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
            selectedFamilyFilter === 'TODAS'
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
              : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          TODAS LAS FAMILIAS ({categories.length})
        </button>
        {OFFICIAL_FAMILIES.map((fam) => {
          const count = groupedCategories[fam]?.length || 0;
          const isActive = selectedFamilyFilter === fam;
          return (
            <button
              key={fam}
              onClick={() => setSelectedFamilyFilter(fam)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                isActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md'
                  : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{fam}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                isActive ? 'bg-amber-400 text-slate-950 font-black' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista de Familias y sus Subdivisiones */}
      {loading && categories.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <Layers className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
          <p className="text-sm font-semibold">Cargando familias y materiales...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
          <FolderOpen size={48} className="mx-auto mb-3 text-zinc-400 opacity-60" />
          <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200">No hay subdivisiones registradas</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1 mb-4">
            Puedes cargar la estructura completa oficial de Florecer con un solo clic.
          </p>
          <button
            onClick={initializeDefaultCategories}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
          >
            Cargar Familias Oficiales Florecer
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {displayedFamilies.map((family) => {
            const items = groupedCategories[family] || [];
            if (items.length === 0 && selectedFamilyFilter !== 'TODAS') {
              return (
                <div key={family} className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 text-center">
                  <p className="text-sm font-semibold text-zinc-400">No hay subdivisiones creadas para {family}.</p>
                  <button
                    onClick={() => handleOpenModal(family)}
                    className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
                  >
                    + Agregar primera subdivisión a {family}
                  </button>
                </div>
              );
            }
            if (items.length === 0) return null;

            return (
              <div
                key={family}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden"
              >
                {/* Cabecera de la Familia */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm border border-amber-500/20">
                      ★
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100 tracking-wide uppercase">
                        {family}
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        {items.length} {items.length === 1 ? 'subdivisión / material' : 'subdivisiones / materiales'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenModal(family)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Plus size={14} className="text-indigo-600" />
                    <span>Agregar a esta Familia</span>
                  </button>
                </div>

                {/* Grid de Subdivisiones */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {items.map((category) => (
                    <div
                      key={category.id}
                      className="group p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-zinc-900 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-amber-500 shrink-0" />
                            <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {category.name}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <button
                              onClick={() => handleEdit(category)}
                              className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                              title="Editar subdivisión"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(category.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                              title="Desactivar subdivisión"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {category.description ? (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                            {category.description}
                          </p>
                        ) : (
                          <p className="text-[11px] text-zinc-400 italic mt-2">
                            Sin descripción adicional
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-zinc-400">
                          Orden #{category.sortOrder}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 text-[10px] ${
                          category.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                        }`}>
                          <CheckCircle2 size={10} />
                          {category.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Crear/Editar Subdivisión */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-850">
              <div className="flex items-center gap-2.5">
                <BookmarkCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-100">
                  {editingCategory ? 'Editar Subdivisión' : 'Nueva Subdivisión'}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Familia */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Familia Principal *
                </label>
                <select
                  value={formData.family}
                  onChange={(e) => setFormData({ ...formData, family: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl font-bold text-sm bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {OFFICIAL_FAMILIES.map((fam) => (
                    <option key={fam} value={fam}>
                      {fam}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Agrupa este material en una de las familias oficiales de Florecer.
                </p>
              </div>

              {/* Nombre de la Subdivisión */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Nombre de la Subdivisión / Material *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-zinc-400"
                  placeholder="Ej: Tarjetas personales, Etiquetas, Llaveros..."
                  autoFocus
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-zinc-400 resize-none"
                  rows={2}
                  placeholder="Detalles sobre terminación, materiales o especificaciones..."
                />
              </div>

              {/* Orden */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                  Orden de Visualización
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  min="0"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2 bg-slate-50 dark:bg-zinc-850">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                <Save size={15} />
                <span>{loading ? 'Guardando...' : 'Guardar Subdivisión'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
