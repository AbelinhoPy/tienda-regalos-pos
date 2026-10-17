const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { RucService } = require('../dist/services/ruc.service');

test('padrón local sin red, DV y consulta externa de la mitad restante', async () => {
  const directory = path.resolve(__dirname, '../data/ruc');
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.localDigits, [0,1,2,3,4]);
  assert.ok(manifest.total > 100000);
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls++; throw new Error('offline'); };
  try {
    for (const digit of manifest.localDigits) {
      const records = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(directory, manifest.version, digit + '.json.gz'))));
      assert.equal(Object.keys(records).length, manifest.counts[digit]);
      const base = Object.keys(records)[0];
      const [name, dv] = records[base];
      const result = await RucService.lookup(base);
      assert.equal(result.name, name);
      assert.equal(result.documentId, base + '-' + dv);
      assert.equal(result.source, 'DNIT (padrón local)');
      assert.equal((await RucService.lookup(base + '-' + dv)).name, name);
      await assert.rejects(() => RucService.lookup(base + '-' + ((Number(dv) + 1) % 10)), /verificador/);
    }
    assert.equal(calls, 0, 'Los cinco grupos locales no deben consumir consultas');
    for (const digit of [5,6,7,8,9]) {
      const base = '8000000' + digit;
      global.fetch = async url => { calls++; assert.ok(url.endsWith('/' + base)); return { ok: true, json: async () => ({ name: 'Cliente de prueba', fullRuc: base + '-0', state: 'ACTIVO' }) }; };
      assert.equal((await RucService.lookup(base)).source, 'ruc.sun.com.py');
    }
    assert.equal(calls, 5);
    global.fetch = async () => ({ status: 429, ok: false });
    await assert.rejects(() => RucService.lookup('80000005'), /cupo/);
    global.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(() => RucService.lookup('80000005'), /manualmente/);
    await assert.rejects(() => RucService.lookup('abc'), /válido/);
  } finally { global.fetch = originalFetch; }
});
