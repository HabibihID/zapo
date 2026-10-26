// Tes router Zapo: parsing, tap tombol Native Flow, saran typo.
// Dijalankan: node --test tests/*.test.js (tanpa jaringan, client tiruan).

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouter, parseCommand, extractText } from '../src/lib/router.js';

const OWNER = '6285181576338@s.whatsapp.net';
const config = { prefix: '.', ownerNumbers: ['6285181576338'], panel: { domain: '', apiKey: '' } };

function mockClient() {
  const sent = [];
  return {
    sent,
    message: { send: async (to, msg) => { sent.push({ to, msg }); return { id: 'x' }; } },
    status: { send: async () => ({}) },
  };
}

function makeEvent({ chat = '120363@g.us', sender = OWNER, message, pushName = 'Habibih', fromMe = false, isGroup = true } = {}) {
  return { key: { remoteJid: chat, participant: sender, fromMe, isGroup }, pushName, message };
}

function buttonTapEvent(id) {
  return makeEvent({
    message: {
      interactiveResponseMessage: {
        nativeFlowResponseMessage: { paramsJson: JSON.stringify({ id, display_text: id }) },
      },
    },
  });
}

test('parseCommand: command + args + text', () => {
  const p = parseCommand('.delpanel 13', '.');
  assert.equal(p.command, 'delpanel');
  assert.deepEqual(p.args, ['13']);
  assert.equal(p.text, '13');
  assert.equal(parseCommand('halo', '.'), null);
  assert.equal(parseCommand('.UPSWGC Halo', '.').command, 'upswgc');
});

test('extractText: ketikan, caption, dan tap tombol', () => {
  assert.deepEqual(extractText({ conversation: '.ping' }), { text: '.ping', via: 'text' });
  assert.deepEqual(extractText({ imageMessage: { caption: '.upswgc Halo' } }), { text: '.upswgc Halo', via: 'text' });
  assert.deepEqual(
    extractText(buttonTapEvent('.delpanel 13').message),
    { text: '.delpanel 13', via: 'button' },
  );
});

test('handleMessage: teks perintah diteruskan ke plugin dengan args', async () => {
  const calls = [];
  const plugin = { commands: ['delpanel'], category: 'panel', handler: async (ctx) => { calls.push(ctx); } };
  const router = createRouter({ plugins: [plugin], config, log: () => {} });
  const client = mockClient();
  const res = await router.handleMessage({
    client,
    event: makeEvent({ message: { conversation: '.delpanel 13' } }),
  });
  assert.equal(res.status, 'handled');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, ['13']);
  assert.equal(calls[0].text, '13');
  assert.equal(calls[0].isGroup, true);
  assert.equal(calls[0].isOwner(), true);
});

test('handleMessage: tap tombol ".delpanel 13" = ketik ".delpanel 13"', async () => {
  const calls = [];
  const plugin = { commands: ['delpanel'], category: 'panel', handler: async (ctx) => { calls.push(ctx); } };
  const router = createRouter({ plugins: [plugin], config, log: () => {} });
  const res = await router.handleMessage({ client: mockClient(), event: buttonTapEvent('.delpanel 13') });
  assert.equal(res.status, 'handled');
  assert.deepEqual(calls[0].args, ['13']);
});

test('handleMessage: tap tombol tanpa prefix (id "ping") jalan sebagai perintah', async () => {
  let ran = 0;
  const ping = { commands: ['ping'], category: 'umum', handler: async () => { ran++; } };
  const router = createRouter({ plugins: [ping], config, log: () => {} });
  const res = await router.handleMessage({ client: mockClient(), event: buttonTapEvent('ping') });
  assert.equal(res.status, 'handled');
  assert.equal(ran, 1);
});

test('handleMessage: typo ".delpanelr 13" → tombol ".delpanel 13" (argumen ikut)', async () => {
  const delpanel = { commands: ['delpanel'], category: 'panel', handler: async () => {} };
  const ping = { commands: ['ping'], category: 'umum', handler: async () => {} };
  const router = createRouter({ plugins: [delpanel, ping], config, log: () => {} });
  const client = mockClient();
  const res = await router.handleMessage({
    client,
    event: makeEvent({ message: { conversation: '.delpanelr 13' } }),
  });
  assert.equal(res.status, 'typo');
  assert.equal(res.match.command, 'delpanel');
  assert.equal(client.sent.length, 1);
  const payload = client.sent[0].msg;
  const button = payload.interactiveMessage.nativeFlowMessage.buttons[0];
  assert.equal(button.name, 'quick_reply');
  const params = JSON.parse(button.buttonParamsJson);
  assert.equal(params.id, '.delpanel 13');
  assert.equal(params.display_text, '.delpanel 13');
});

test('handleMessage: pesan sendiri & bukan perintah diabaikan', async () => {
  let ran = 0;
  const ping = { commands: ['ping'], category: 'umum', handler: async () => { ran++; } };
  const router = createRouter({ plugins: [ping], config, log: () => {} });
  const client = mockClient();
  const r1 = await router.handleMessage({
    client,
    event: makeEvent({ message: { conversation: '.ping' }, fromMe: true }),
  });
  const r2 = await router.handleMessage({
    client,
    event: makeEvent({ message: { conversation: 'halo semua' } }),
  });
  const r3 = await router.handleMessage({
    client,
    event: makeEvent({ message: { conversation: '.zzzqqq' } }),
  });
  assert.equal(r1.status, 'ignored');
  assert.equal(r2.status, 'ignored');
  assert.equal(r3.status, 'unknown');
  assert.equal(ran, 0);
  assert.equal(client.sent.length, 0);
});
