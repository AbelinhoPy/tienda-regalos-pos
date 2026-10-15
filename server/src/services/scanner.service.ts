interface ScannerSession {
  sessionId: string;
  createdAt: number;
  lastActive: number;
  scans: Array<{ code: string; timestamp: number }>;
}

const sessions = new Map<string, ScannerSession>();

// Limpiar sesiones inactivas cada 15 minutos
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActive > 2 * 60 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 15 * 60 * 1000);

function generateSessionId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export class ScannerService {
  static createSession(): { sessionId: string } {
    let sessionId = generateSessionId();
    while (sessions.has(sessionId)) {
      sessionId = generateSessionId();
    }

    const session: ScannerSession = {
      sessionId,
      createdAt: Date.now(),
      lastActive: Date.now(),
      scans: [],
    };

    sessions.set(sessionId, session);
    return { sessionId };
  }

  static pushScan(sessionId: string, code: string): { success: boolean; scanCount: number } {
    const session = sessions.get(sessionId.toUpperCase());
    if (!session) {
      throw new Error('Sesión de escáner no encontrada o expirada. Por favor generá un nuevo código.');
    }

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      throw new Error('Código de barras vacío.');
    }

    session.lastActive = Date.now();
    session.scans.push({
      code: trimmedCode,
      timestamp: Date.now(),
    });

    // Mantener sólo los últimos 50 escaneos
    if (session.scans.length > 50) {
      session.scans = session.scans.slice(-50);
    }

    return { success: true, scanCount: session.scans.length };
  }

  static getLatestScans(sessionId: string, since: number = 0): {
    sessionId: string;
    active: boolean;
    scans: Array<{ code: string; timestamp: number }>;
  } {
    const session = sessions.get(sessionId.toUpperCase());
    if (!session) {
      return { sessionId, active: false, scans: [] };
    }

    session.lastActive = Date.now();
    const newScans = session.scans.filter(s => s.timestamp > since);

    return {
      sessionId,
      active: true,
      scans: newScans,
    };
  }
}
