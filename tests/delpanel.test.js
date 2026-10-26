// Tes plugin .delpanel Zapo (panel tiruan — tanpa jaringan).

import test from 'node:test';
import assert from 'node:assert/strict';
import { delpanelPlugin } from '../src/plugins/delpanel.js';

function ctx({ owner = true, args = [], panelClient = null } = {}) {
  const replies = [];
  return {
    replies,
    isOwner: () => owner,
    args,
    prefix: '.',
    config: { panel: { domain: '', apiKey: '' } },
    panelClient,
    reply: async (t) => { replies.push(t); return t; },
  };
}

test('bukan owner ditolak', async () => {
  const c = ctx({ owner: false, args: ['14'] });
  await delpanelPlugin.handler(c);
  assert.match(c.replies[0], /Khusus owner/);
});

test('tanpa ID = format salah', async () => {
  const c = ctx({ args: [] });
  await delpanelPlugin.handler(c);
  assert.match(c.replies[0], /Format salah/);
  assert.match(c.replies[0], /\.delpanel 14/);
});

test('sukses hapus', async () => {
  const c = ctx({ args: ['14'], panelClient: { deleteServer: async (id) => { assert.equal(id, '14'); return true; } } });
  await delpanelPlugin.handler(c);
  assert.match(c.replies[0], /berhasil dihapus/);
});

test('404 dari panel diteruskan sebagai pesan jelas', async () => {
  const c = ctx({
    args: ['13'],
    panelClient: { deleteServer: async () => { throw new Error('Server tidak ditemukan (ID 13 tidak ada di panel — cek .listserver)'); } },
  });
  await delpanelPlugin.handler(c);
  assert.match(c.replies[0], /tidak ditemukan/);
  assert.match(c.replies[0], /listserver/);
});
