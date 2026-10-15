import { PrismaClient } from '@prisma/client';

// En Railway, DATABASE_URL viene como variable de entorno automáticamente.
// En desarrollo local, cargar dotenv si está disponible.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
} catch {
  // dotenv no disponible en producción — no hace falta
}

export const prisma = new PrismaClient();
