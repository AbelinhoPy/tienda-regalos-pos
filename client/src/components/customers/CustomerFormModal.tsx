import React, { useRef, useState } from 'react';
import { Customer } from '../../types';
import { api } from '../../services/api';

interface Props { customer?: Customer | null; onClose: () => void; onSaved: (customer: Customer) => void; }
export const CustomerFormModal: React.FC<Props> = ({ customer, onClose, onSaved }) => {
  const [form, setForm] = useState({ name: customer?.name || '', documentId: customer?.documentId || '', phone: customer?.phone || '', email: (customer as any)?.email || '', creditLimitGs: customer?.creditLimitGs ?? 0 });
  const [saving, setSaving] = useState(false);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const version = useRef(0);
  const lookup = async () => {
    const current = ++version.current;
    setLooking(true); setError(''); setNotice('');
    try {
      const data = await api.get<{ name: string; documentId: string; state: string; source: string; updatedAt: string }>('/api/customers/ruc/' + encodeURIComponent(form.documentId));
      if (version.current !== current) return;
      setForm(prev => ({ ...prev, name: data.name, documentId: data.documentId }));
      setNotice('Fuente: ' + data.source + '. Estado: ' + data.state + (data.updatedAt ? '. Base: ' + data.updatedAt : '') + '. Revise antes de guardar.');
    } catch (e: any) { if (version.current === current) setError(e.message); }
    finally { setLooking(false); }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const data = customer ? await api.put<Customer>('/api/customers/' + customer.id, form) : await api.post<Customer>('/api/customers', form);
      onSaved(data);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };
  const inputClass = 'w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-800 text-sm';
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto" role="dialog" aria-modal="true" aria-label={customer ? 'Editar cliente' : 'Nuevo cliente'}>
    <form onSubmit={save} className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 space-y-4 my-auto">
      <h3 className="font-bold text-lg">{customer ? 'Editar cliente' : 'Nuevo cliente'}</h3>
      <label className="block text-sm">RUC o C.I.
        <div className="flex gap-2 mt-1"><input autoFocus className={inputClass} value={form.documentId} placeholder="80012345-0" onChange={e => { version.current++; setNotice(''); setError(''); setForm({ ...form, documentId: e.target.value }); }} />
        <button type="button" disabled={looking || saving || !form.documentId.trim()} onClick={lookup} className="px-3 rounded-xl bg-indigo-600 text-white text-xs disabled:opacity-50">{looking ? 'Consultando…' : 'Buscar RUC'}</button></div>
      </label>
      <p className="text-xs text-zinc-500">La consulta de RUC completa el nombre o razón social. Para C.I. sin RUC, cargue el nombre manualmente.</p>
      {notice && <p role="status" className="text-xs text-amber-700 dark:text-amber-300">{notice}</p>}
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      <label className="block text-sm">Nombre o razón social *<input required className={inputClass} value={form.name} onChange={e => { version.current++; setForm({ ...form, name: e.target.value }); }} /></label>
      <label className="block text-sm">Teléfono<input className={inputClass} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
      <label className="block text-sm">Correo electrónico<input type="email" className={inputClass} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
      <label className="block text-sm">Límite de crédito (Gs.)<input type="number" min="0" className={inputClass} value={form.creditLimitGs} onChange={e => setForm({ ...form, creditLimitGs: Number(e.target.value) })} /></label>
      <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="px-4 py-2 rounded-xl border">Cancelar</button><button disabled={saving || looking || !form.name.trim()} className="px-4 py-2 rounded-xl bg-indigo-600 text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar cliente'}</button></div>
    </form>
  </div>;
};
