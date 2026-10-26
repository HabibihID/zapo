// Tes mesin saran typo Zapo (port scorer Baileys).

import test from 'node:test';
import assert from 'node:assert/strict';
import { findBestCommandMatch, sendTypoSuggestion } from '../src/lib/typo.js';

const entries = [
  { command: 'delpanel', category: 'panel' },
  { command: 'ping', category: 'umum' },
  { command: 'menu', category: 'umum' },
  { command: 'upswgc', category: 'owner' },
];

test('delpanelr → delpanel', () => {
  const m = findBestCommandMatch('delpanelr', entries);
  assert.equal(m.command, 'delpanel');
  assert.ok(m.similarity >= 80);
});

test('perintah jauh tidak dipaksakan jadi saran', () => {
  assert.equal(findBestCommandMatch('zzzqqq', entries), null);
  assert.equal(findBestCommandMatch('', entries), null);
});

test('tombol saran membawa argumen (".delpanel 13")', async () => {
  const sent = [];
  const client = { message: { send: async (to, msg) => { sent.push({ to, msg }); } } };
  const ok = await sendTypoSuggestion(client, '120363@g.us', '.', 'delpanelr', '13', entries);
  assert.equal(ok, true);
  assert.equal(sent.length, 1);
  const button = sent[0].msg.interactiveMessage.nativeFlowMessage.buttons[0];
  const params = JSON.parse(button.buttonParamsJson);
  assert.equal(params.id, '.delpanel 13');
  assert.ok(sent[0].msg.interactiveMessage.body.text.includes('delpanel'));
});

test('tanpa saran = tidak ada pesan terkirim', async () => {
  const sent = [];
  const client = { message: { send: async (to, msg) => { sent.push({ to, msg }); } } };
  const ok = await sendTypoSuggestion(client, '120363@g.us', '.', 'zzzqqq', '', entries);
  assert.equal(ok, false);
  assert.equal(sent.length, 0);
});
