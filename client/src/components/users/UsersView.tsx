import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, UserCheck, Store, Plus, Search,
  Check, X, Shield, Lock, Eye, EyeOff,
  AlertCircle, KeyRound, UserX, UserCheck2
} from 'lucide-react';
import { User, UserRole } from '../../types';
import {
  getAllUsers, createUser, resetUserPassword,
  toggleUserActive, changePassword
} from '../../services/authService';

interface UsersViewProps {
  currentUser: User;
}

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
  ADMIN: {
    label: 'Administrador',
    color: 'indigo',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    desc: 'Control total: compras, costos, márgenes, usuarios y configuración.',
  },
  VENDEDOR: {
    label: 'Vendedor / Cajero',
    color: 'emerald',
    icon: <UserCheck className="w-3.5 h-3.5" />,
    desc: 'Acceso a POS, lector de barras, cobro multimoneda y clientes.',
  },
  DUENO_LOCAL: {
    label: 'Dueño del Local',
    color: 'amber',
    icon: <Store className="w-3.5 h-3.5" />,
    desc: 'Dashboard, arqueos de caja y reportes de ventas.',
  },
};

export const UsersView: React.FC<UsersViewProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<Omit<User, 'passwordHash'>[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'error' } | null>(null);

  // Modals
  const [showNewModal, setShowNewModal]     = useState(false);
  const [showPassModal, setShowPassModal]   = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Form: nuevo usuario
  const [formName, setFormName]     = useState('');
  const [formEmail, setFormEmail]   = useState('');
  const [formRole, setFormRole]     = useState<UserRole>('VENDEDOR');
  const [formPass, setFormPass]     = useState('');
  const [formPassShow, setFormPassShow] = useState(false);

  // Form: cambiar contraseña (admin reseteando otro usuario)
  const [newPass, setNewPass]         = useState('');
  const [newPassShow, setNewPassShow] = useState(false);

  // Form: cambiar mi propia contraseña
  const [showMyPassModal, setShowMyPassModal] = useState(false);
  const [myCurrentPass, setMyCurrentPass]     = useState('');
  const [myNewPass, setMyNewPass]             = useState('');
  const [myPassShow, setMyPassShow]           = useState(false);

  const refreshUsers = () => setUsers(getAllUsers());

  useEffect(() => { refreshUsers(); }, []);

  const showToast = (msg: string, type: 'ok' | 'error' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.roleDescription.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Crear usuario ──────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formPass.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }
    const result = await createUser({ name: formName, email: formEmail, password: formPass, role: formRole });
    if (result.success) {
      refreshUsers();
      setShowNewModal(false);
      setFormName(''); setFormEmail(''); setFormPass('');
      showToast(`Usuario ${formName} creado correctamente.`);
    } else {
      showToast(result.error || 'Error al crear usuario.', 'error');
    }
  };

  // ── Resetear contraseña de otro usuario (solo ADMIN) ──────────────────────
  const handleResetPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || newPass.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }
    await resetUserPassword(selectedUserId, newPass);
    setShowPassModal(false);
    setNewPass('');
    showToast('Contraseña restablecida correctamente.');
  };

  // ── Cambiar mi propia contraseña ───────────────────────────────────────────
  const handleMyPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (myNewPass.length < 6) {
      showToast('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }
    const result = await changePassword(currentUser.id, myCurrentPass, myNewPass);
    if (result.success) {
      setShowMyPassModal(false);
      setMyCurrentPass(''); setMyNewPass('');
      showToast('Tu contraseña fue actualizada.');
    } else {
      showToast(result.error || 'Error al cambiar contraseña.', 'error');
    }
  };

  // ── Activar / Desactivar ───────────────────────────────────────────────────
  const handleToggleActive = (userId: number, userName: string, currentActive: boolean) => {
    if (userId === currentUser.id) {
      showToast('No podés desactivar tu propio usuario.', 'error');
      return;
    }
    toggleUserActive(userId);
    refreshUsers();
    showToast(`Usuario ${userName} ${currentActive ? 'desactivado' : 'activado'}.`);
  };

  const getRoleBadge = (role: UserRole) => {
    const cfg = ROLE_CONFIG[role];
    const colors: Record<string, string> = {
      indigo: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      emerald: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      amber: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${colors[cfg.color]}`}>
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            Gestión de Usuarios & Permisos
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Los usuarios y contraseñas se guardan de forma segura en el sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMyPassModal(true)}
            className="px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" /> Mi contraseña
          </button>
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Nuevo Usuario
            </button>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 border ${
          toast.type === 'ok'
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
        }`}>
          {toast.type === 'ok' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Roles info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([role, cfg]) => (
          <div key={role} className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-1.5">
            <div className={`flex items-center gap-2 font-bold text-xs text-${cfg.color}-600 dark:text-${cfg.color}-400`}>
              {cfg.icon} {cfg.label.toUpperCase()}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{cfg.desc}</p>
          </div>
        ))}
      </div>

      {/* Tabla de usuarios */}
      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar usuario..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase font-semibold text-[11px]">
                <th className="py-3 px-3">Nombre</th>
                <th className="py-3 px-3">Correo</th>
                <th className="py-3 px-3">Rol</th>
                <th className="py-3 px-3 text-center">Estado</th>
                {currentUser.role === 'ADMIN' && <th className="py-3 px-3 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-800 dark:text-zinc-200">
                    {u.name}
                    {currentUser.id === u.id && (
                      <span className="ml-1.5 text-[10px] text-indigo-500 font-normal">(vos)</span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-zinc-500 text-[11px]">{u.email}</td>
                  <td className="py-3 px-3">{getRoleBadge(u.role)}</td>
                  <td className="py-3 px-3 text-center">
                    {u.active ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
                        <X className="w-3 h-3" /> Inactivo
                      </span>
                    )}
                  </td>
                  {currentUser.role === 'ADMIN' && (
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          title="Restablecer contraseña"
                          onClick={() => { setSelectedUserId(u.id); setShowPassModal(true); }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== currentUser.id && (
                          <button
                            title={u.active ? 'Desactivar usuario' : 'Activar usuario'}
                            onClick={() => handleToggleActive(u.id, u.name, u.active)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                          >
                            {u.active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-400 text-xs">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: Nuevo Usuario ─────────────────────────────────────────────── */}
      {showNewModal && (
        <Modal title="Registrar Nuevo Usuario" onClose={() => setShowNewModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormField label="Nombre Completo">
              <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Marcos Alderete"
                className="field" />
            </FormField>
            <FormField label="Correo Electrónico">
              <input type="email" required value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                placeholder="usuario@boutique.com"
                className="field" />
            </FormField>
            <FormField label="Rol de Acceso">
              <select value={formRole} onChange={(e) => setFormRole(e.target.value as UserRole)} className="field">
                <option value="VENDEDOR">Vendedor / Cajero (POS y Stock)</option>
                <option value="ADMIN">Administrador (Acceso Total)</option>
                <option value="DUENO_LOCAL">Dueño del Local (Reportes)</option>
              </select>
            </FormField>
            <FormField label="Contraseña inicial (mín. 6 caracteres)">
              <div className="relative">
                <input type={formPassShow ? 'text' : 'password'} required value={formPass}
                  onChange={(e) => setFormPass(e.target.value)} placeholder="••••••••" className="field pr-10" />
                <button type="button" onClick={() => setFormPassShow(!formPassShow)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  {formPassShow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>
            <ModalActions onCancel={() => setShowNewModal(false)} submitLabel="Crear Usuario" />
          </form>
        </Modal>
      )}

      {/* ── MODAL: Restablecer contraseña (admin) ───────────────────────────── */}
      {showPassModal && (
        <Modal title="Restablecer Contraseña" onClose={() => { setShowPassModal(false); setNewPass(''); }}>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Como administrador podés establecer una nueva contraseña para este usuario.
          </p>
          <form onSubmit={handleResetPass} className="space-y-4">
            <FormField label="Nueva contraseña (mín. 6 caracteres)">
              <div className="relative">
                <input type={newPassShow ? 'text' : 'password'} required value={newPass}
                  onChange={(e) => setNewPass(e.target.value)} placeholder="••••••••" className="field pr-10" />
                <button type="button" onClick={() => setNewPassShow(!newPassShow)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  {newPassShow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>
            <ModalActions onCancel={() => { setShowPassModal(false); setNewPass(''); }} submitLabel="Restablecer" />
          </form>
        </Modal>
      )}

      {/* ── MODAL: Cambiar mi contraseña ─────────────────────────────────────── */}
      {showMyPassModal && (
        <Modal title="Cambiar mi Contraseña" onClose={() => { setShowMyPassModal(false); setMyCurrentPass(''); setMyNewPass(''); }}>
          <form onSubmit={handleMyPass} className="space-y-4">
            <FormField label="Contraseña actual">
              <input type="password" required value={myCurrentPass}
                onChange={(e) => setMyCurrentPass(e.target.value)} placeholder="••••••••" className="field" />
            </FormField>
            <FormField label="Nueva contraseña (mín. 6 caracteres)">
              <div className="relative">
                <input type={myPassShow ? 'text' : 'password'} required value={myNewPass}
                  onChange={(e) => setMyNewPass(e.target.value)} placeholder="••••••••" className="field pr-10" />
                <button type="button" onClick={() => setMyPassShow(!myPassShow)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  {myPassShow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>
            <ModalActions onCancel={() => { setShowMyPassModal(false); setMyCurrentPass(''); setMyNewPass(''); }} submitLabel="Actualizar Contraseña" />
          </form>
        </Modal>
      )}
    </div>
  );
};

// ─── Helpers de UI ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ onCancel, submitLabel }: { onCancel: () => void; submitLabel: string }) {
  return (
    <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
      <button type="button" onClick={onCancel}
        className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
        Cancelar
      </button>
      <button type="submit"
        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all">
        {submitLabel}
      </button>
    </div>
  );
}
