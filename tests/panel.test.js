// Tes klien panel Zapo (fetch tiruan — tanpa jaringan).

import test from 'node:test';
import assert from 'node:assert/strict';
import { createPanelClient } from '../src/lib/panel.js';

function fakeFetch({ ok, status, body }) {
  return async () => ({ ok, status, json: async () => body });
}

test('deleteServer: 204 = sukses', async () => {
  const panel = createPanelClient({
    domain: 'https://panel.example', apiKey: 'k',
    fetchImpl: fakeFetch({ ok: true, status: 204, body: null }),
  });
  assert.equal(await panel.deleteServer('14'), true);
});

test('deleteServer: 404 = pesan bisa ditindak (cek .listserver)', async () => {
  const panel = createPanelClient({
    domain: 'https://panel.example', apiKey: 'k',
    fetchImpl: fakeFetch({ ok: false, status: 404, body: { errors: [{ detail: 'No query results' }] } }),
  });
  await assert.rejects(() => panel.deleteServer('13'), /Server tidak ditemukan.*13.*listserver/);
});

test('deleteServer: 500 membawa status + detail panel', async () => {
  const panel = createPanelClient({
    domain: 'https://panel.example', apiKey: 'k',
    fetchImpl: fakeFetch({ ok: false, status: 500, body: { errors: [{ detail: 'Database down' }] } }),
  });
  await assert.rejects(() => panel.deleteServer('14'), /HTTP 500.*Database down/);
});

test('panel tanpa domain/key menolak dengan pesan konfigurasi', async () => {
  const panel = createPanelClient({ domain: '', apiKey: '' });
  await assert.rejects(() => panel.deleteServer('14'), /belum dikonfigurasi/);
  await assert.rejects(() => panel.listServers(), /belum dikonfigurasi/);
});

test('listServers: memetakan attributes', async () => {
  const panel = createPanelClient({
    domain: 'https://panel.example', apiKey: 'k',
    fetchImpl: fakeFetch({
      ok: true, status: 200,
      body: { data: [{ attributes: { id: 14, name: 'vanostrt2' } }, { attributes: { id: 15, name: 'sakir server' } }] },
    }),
  });
  const list = await panel.listServers();
  assert.equal(list.length, 2);
  assert.equal(list[0].name, 'vanostrt2');
});
