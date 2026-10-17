// Build a compact, separate reference directory from all ten official DNIT files.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const readline = require('node:readline');
async function build(inputDir, outputDir, updatedAt) {
  const version = 'padron-' + Date.now();
  const target = path.join(outputDir, version);
  fs.mkdirSync(target, { recursive: true });
  const counts = {};
  const skippedLegacy = {};
  const skippedInvalid = {};
  for (let digit = 0; digit <= 9; digit++) {
    const records = Object.create(null);
    skippedLegacy[digit] = 0;
    skippedInvalid[digit] = 0;
    const file = path.join(inputDir, String(digit), 'ruc' + digit + '.txt');
    const lines = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line.trim()) continue;
      const [ruc, name, dv, , state] = line.split('|');
      if (/^\d+[A-Z]+$/.test(ruc)) { skippedLegacy[digit]++; continue; }
      if (!/^\d+$/.test(ruc) || !/^\d$/.test(dv) || !name?.trim() || !state?.trim() || ruc.slice(-1) !== String(digit) || name.includes('\uFFFD')) {
        skippedInvalid[digit]++;
        if (skippedInvalid[digit] > 100) throw new Error('Demasiados registros inválidos en ' + file);
        continue;
      }
      if (records[ruc]) throw new Error('RUC duplicado: ' + ruc);
      records[ruc] = [name.trim(), dv, state.trim()];
    }
    counts[digit] = Object.keys(records).length;
    if (!counts[digit]) throw new Error('Archivo vacío: ' + file);
    fs.writeFileSync(path.join(target, digit + '.json.gz'), zlib.gzipSync(JSON.stringify(records), { level: 9 }));
  }
  // Only publish a manifest once all ten groups have been built successfully.
  const manifest = { version, updatedAt, importedAt: new Date().toISOString(), source: 'DNIT', sourceUrl: 'https://www.dnit.gov.py/web/portal-institucional/listado-de-ruc-con-sus-equivalencias', localDigits: [0,1,2,3,4,5,6,7,8,9], counts, skippedLegacy, skippedInvalid, total: Object.values(counts).reduce((a,b) => a+b, 0) };
  fs.writeFileSync(path.join(outputDir, 'manifest.next.json'), JSON.stringify(manifest, null, 2));
  fs.renameSync(path.join(outputDir, 'manifest.next.json'), path.join(outputDir, 'manifest.json'));
  // Retire previous downloaded snapshots after the new one is fully published.
  const root = path.resolve(outputDir);
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^padron-\d+$/.test(entry.name) || entry.name === version) continue;
    const oldDirectory = path.resolve(root, entry.name);
    if (path.dirname(oldDirectory) !== root) throw new Error('Ruta fuera del directorio de padrones');
    try { fs.rmSync(oldDirectory, { recursive: true }); } catch (error) { console.warn('No se pudo retirar el padrón anterior:', error.message); }
  }
  console.log(JSON.stringify(manifest, null, 2));
}
module.exports = { build };
if (require.main === module) build(process.argv[2], process.argv[3], process.argv[4]).catch(error => { console.error(error); process.exitCode = 1; });
