import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';

const unzip = promisify(gunzip);
type RucRecord = [string, string, string];
interface Manifest { version: string; updatedAt: string; localDigits: number[]; }

export class RucService {
  // Only keep the last requested group in memory; the reference files stay compressed on disk.
  private static cache: { key: string; records: Promise<Record<string, RucRecord>> } | null = null;

  private static async localLookup(ruc: string) {
    const base = ruc.split('-')[0];
    const digit = Number(base.slice(-1));
    const directory = process.env.RUC_DATA_DIR || path.resolve(__dirname, '../../data/ruc');
    let manifest: Manifest;
    try {
      manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
    } catch (error: any) {
      if (error.code !== 'ENOENT') console.warn('No se pudo leer el padrón RUC local:', error.message);
      return null;
    }
    if (!/^padron-\d+$/.test(manifest.version) || !manifest.localDigits?.includes(digit)) return null;
    const key = directory + '/' + manifest.version + '/' + digit;
    let record: RucRecord | undefined;
    try {
      if (this.cache?.key !== key) {
        const records = readFile(path.join(directory, manifest.version, digit + '.json.gz'))
          .then(buffer => unzip(buffer))
          .then(buffer => JSON.parse(buffer.toString('utf8')) as Record<string, RucRecord>);
        this.cache = { key, records };
      }
      record = (await this.cache.records)[base];
    } catch (error: any) {
      this.cache = null;
      console.warn('No se pudo consultar el archivo RUC local:', error.message);
      return null;
    }
    if (!record) return null; // Newly registered taxpayers may only exist online.
    const [name, dv, state] = record;
    const fullRuc = base + '-' + dv;
    if (ruc.includes('-') && fullRuc !== ruc) throw new Error('El dígito verificador no coincide con el padrón DNIT local.');
    return { name, documentId: fullRuc, state, source: 'DNIT (padrón local)', updatedAt: manifest.updatedAt };
  }

  static async lookup(raw: string) {
    const ruc = raw.replace(/[.\s]/g, '');
    if (!/^\d{3,9}(-\d)?$/.test(ruc)) throw new Error('Ingrese un RUC válido, con o sin dígito verificador.');
    const local = await this.localLookup(ruc);
    if (local) return local;
    const response = await fetch('https://ruc.sun.com.py/api/ruc/' + encodeURIComponent(ruc), {
      headers: process.env.RUC_API_KEY ? { 'X-API-Key': process.env.RUC_API_KEY } : {},
      signal: AbortSignal.timeout(10000),
    }).catch(() => { throw new Error('Este RUC no figura en el padrón local y no se pudo conectar con la consulta en línea. Puede ingresar los datos manualmente.'); });
    if (response.status === 404) throw new Error('RUC no encontrado. Revise el número y el dígito verificador.');
    if (response.status === 429) throw new Error('Este RUC requiere consulta en línea y se alcanzó el cupo del proveedor. Puede cargar el cliente manualmente.');
    if (!response.ok) throw new Error('El proveedor de RUC no está disponible. Puede cargar el cliente manualmente.');
    const data: any = await response.json();
    if (typeof data.name !== 'string' || typeof data.fullRuc !== 'string' || data.fullRuc.split('-')[0] !== ruc.split('-')[0] || (ruc.includes('-') && data.fullRuc !== ruc)) {
      throw new Error('La consulta no devolvió una coincidencia exacta del RUC.');
    }
    return { name: data.name, documentId: data.fullRuc, state: data.state || '', source: 'ruc.sun.com.py', updatedAt: data.publicationDateText || '' };
  }
}
