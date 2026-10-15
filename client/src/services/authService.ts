import { User, UserRole } from '../types';

// ─── Tipos internos ────────────────────────────────────────────────────────────
export interface StoredUser extends User {
  passwordHash: string;
}

const STORAGE_KEY = 'boutique_users_v2';

// ─── Hash simple (SHA-256 via Web Crypto API) ──────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Usuarios por defecto (se crean la primera vez) ───────────────────────────
// Contraseñas en claro solo para el seed inicial — nunca se guardan en claro
const SEED_PASSWORDS: Record<string, string> = {
  'admin@boutique.com':  'Abel2024$',     // ← TU contraseña de ADMIN
  'ventas@boutique.com': 'Vendedor123',
  'dueno@boutique.com':  'Dueno123',
};

async function buildSeedUsers(): Promise<StoredUser[]> {
  const roleDescriptions: Record<UserRole, string> = {
    ADMIN:       'Administrador Total',
    VENDEDOR:    'Vendedor / Cajero',
    DUENO_LOCAL: 'Dueño del Local',
  };

  return Promise.all([
    {
      id: 1,
      name: 'Abel Nuñez',
      email: 'admin@boutique.com',
      role: 'ADMIN' as UserRole,
      roleDescription: roleDescriptions.ADMIN,
      active: true,
      passwordHash: await hashPassword(SEED_PASSWORDS['admin@boutique.com']),
    },
    {
      id: 2,
      name: 'Vendedor',
      email: 'ventas@boutique.com',
      role: 'VENDEDOR' as UserRole,
      roleDescription: roleDescriptions.VENDEDOR,
      active: true,
      passwordHash: await hashPassword(SEED_PASSWORDS['ventas@boutique.com']),
    },
    {
      id: 3,
      name: 'Dueño Local',
      email: 'dueno@boutique.com',
      role: 'DUENO_LOCAL' as UserRole,
      roleDescription: roleDescriptions.DUENO_LOCAL,
      active: true,
      passwordHash: await hashPassword(SEED_PASSWORDS['dueno@boutique.com']),
    },
  ]);
}

// ─── Persistencia ─────────────────────────────────────────────────────────────
function loadUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

// ─── Inicializar usuarios (llamar al arrancar la app) ─────────────────────────
export async function initUsers(): Promise<void> {
  const existing = loadUsers();
  if (existing.length === 0) {
    const seeds = await buildSeedUsers();
    saveUsers(seeds);
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function loginWithCredentials(
  email: string,
  password: string
): Promise<User | null> {
  const users = loadUsers();
  const hash = await hashPassword(password);
  const found = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase().trim() &&
           u.passwordHash === hash &&
           u.active
  );
  if (!found) return null;

  // Return public user (sin hash)
  const { passwordHash: _, ...publicUser } = found;
  return publicUser;
}

// ─── CRUD de usuarios ─────────────────────────────────────────────────────────
export function getAllUsers(): Omit<StoredUser, 'passwordHash'>[] {
  return loadUsers().map(({ passwordHash: _, ...u }) => u);
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<{ success: boolean; error?: string }> {
  const users = loadUsers();

  if (users.find((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
    return { success: false, error: 'Ya existe un usuario con ese correo.' };
  }

  const roleDescriptions: Record<UserRole, string> = {
    ADMIN:       'Administrador Total',
    VENDEDOR:    'Vendedor / Cajero',
    DUENO_LOCAL: 'Dueño del Local',
  };

  const newUser: StoredUser = {
    id: Date.now(),
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    role: data.role,
    roleDescription: roleDescriptions[data.role],
    active: true,
    passwordHash: await hashPassword(data.password),
  };

  saveUsers([...users, newUser]);
  return { success: true };
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { success: false, error: 'Usuario no encontrado.' };

  const currentHash = await hashPassword(currentPassword);
  if (users[idx].passwordHash !== currentHash) {
    return { success: false, error: 'La contraseña actual es incorrecta.' };
  }

  users[idx].passwordHash = await hashPassword(newPassword);
  saveUsers(users);
  return { success: true };
}

export async function resetUserPassword(
  userId: number,
  newPassword: string
): Promise<void> {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return;
  users[idx].passwordHash = await hashPassword(newPassword);
  saveUsers(users);
}

export function toggleUserActive(userId: number): void {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return;
  users[idx].active = !users[idx].active;
  saveUsers(users);
}
