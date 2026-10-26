// Tes batch 1 kategori main Zapo: peraturan, donasi, sc, tqto, runtime
// + builder pesan campuran (quick_reply + cta_url satu pesan).

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMixedMessage } from '../src/lib/nativeflow.js';
import { createRouter } from '../src/lib/router.js';
import { peraturanPlugin } from '../src/plugins/peraturan.js';
import { donasiPlugin } from '../src/plugins/donasi.js';
import { scPlugin } from '../src/plugins/sc.js';
import { tqtoPlugin } from '../src/plugins/tqto.js';
import { runtimePlugin } from '../src/plugins/runtime.js';

const OWNER = '6285181576338@s.whatsapp.net';
const config = {
  prefix: '.',
  ownerNumbers: ['6285181576338'],
  panel: { domain: '', apiKey: '' },
  donation: { danaNumber: '6281234567890', danaName: 'Habibih Harahap' },
};

function mockClient() {
  const sent = [];
  return {
    sent,
    message: { send: async (to, msg) => { sent.push({ to, msg }); return { id: 'x' }; } },
    status: { send: async () => ({}) },
  };
}

function run(plugin, { text = '', args = [], message = null } = {}) {
  const client = mockClient();
  const router = createRouter({ plugins: [plugin], config, log: () => {} });
  const event = {
    key: { remoteJid: '120363@g.us', participant: OWNER, fromMe: false, isGroup: true },
    pushName: 'Habibih',
    message: message || { conversation: `.${plugin.commands[0]}${args.length ? ` ${args.join(' ')}` : ''}` },
  };
  return { client, promise: router.handleMessage({ client, event }) };
}

test('buildMixedMessage: quick_reply + cta_url satu pesan', () => {
  const m = buildMixedMessage({
    body: 'info',
    footer: 'f',
    buttons: [
      { kind: 'cta_url', title: 'Store', url: 'https://example.com' },
      { kind: 'quick_reply', id: '.menu', title: 'Menu' },
    ],
  });
  const buttons = m.interactiveMessage.nativeFlowMessage.buttons;
  assert.equal(buttons.length, 2);
  assert.equal(buttons[0].name, 'cta_url');
  assert.equal(buttons[1].name, 'quick_reply');
  assert.equal(JSON.parse(buttons[1].buttonParamsJson).id, '.menu');
  assert.throws(() => buildMixedMessage({ body: 'x', buttons: [{ kind: 'cta_url', title: 'A', url: 'ftp://x' }] }), /http/);
});

test('.peraturan: teks peraturan + tombol MENU/DONASI', async () => {
  const { client, promise } = run(peraturanPlugin);
  const res = await promise;
  assert.equal(res.status, 'handled');
  const msg = client.sent[0].msg;
  assert.match(msg.interactiveMessage.body.text, /PERATURAN BOT/);
  const buttons = msg.interactiveMessage.nativeFlowMessage.buttons;
  assert.equal(buttons.length, 2);
  assert.equal(JSON.parse(buttons[0].buttonParamsJson).id, '.menu');
  assert.equal(JSON.parse(buttons[1].buttonParamsJson).id, '.donasi');
});

test('.donasi: menu tombol + sub dana + qris belum tersedia', async () => {
  const m1 = run(donasiPlugin);
  await m1.promise;
  const buttons = m1.client.sent[0].msg.interactiveMessage.nativeFlowMessage.buttons;
  assert.equal(JSON.parse(buttons[0].buttonParamsJson).id, '.donasi dana');
  assert.equal(JSON.parse(buttons[1].buttonParamsJson).id, '.donasi qris');

  const m2 = run(donasiPlugin, { args: ['dana'] });
  await m2.promise;
  assert.match(m2.client.sent[0].msg.conversation, /DANA/);
  assert.match(m2.client.sent[0].msg.conversation, /6281234567890/);

  const m3 = run(donasiPlugin, { args: ['qris'] });
  await m3.promise;
  assert.match(m3.client.sent[0].msg.conversation, /belum tersedia di Zapo/);
});

test('.sc: tombol campuran + hitung plugin Zapo (bukan 549)', async () => {
  const client = mockClient();
  const router = createRouter({ plugins: [scPlugin, tqtoPlugin, runtimePlugin], config, log: () => {} });
  const event = {
    key: { remoteJid: '120363@g.us', participant: OWNER, fromMe: false, isGroup: true },
    pushName: 'Habibih',
    message: { conversation: '.sc' },
  };
  const res = await router.handleMessage({ client, event });
  assert.equal(res.status, 'handled');
  const msg = client.sent[0].msg;
  assert.match(msg.interactiveMessage.body.text, /SCRIPT INFO/);
  assert.match(msg.interactiveMessage.body.text, /3 plugin \(Zapo\)/);
  const buttons = msg.interactiveMessage.nativeFlowMessage.buttons;
  assert.equal(buttons[0].name, 'cta_url');
  assert.equal(buttons[1].name, 'quick_reply');
  assert.equal(buttons[2].name, 'cta_url');
});

test('.tqto & .runtime: teks statis + format uptime', async () => {
  const t = run(tqtoPlugin);
  await t.promise;
  assert.match(t.client.sent[0].msg.conversation, /THANKS TO/);
  assert.match(t.client.sent[0].msg.conversation, /Zapo/);

  const r = run(runtimePlugin);
  await r.promise;
  assert.match(r.client.sent[0].msg.conversation, /RUNTIME BOT/);
  assert.match(r.client.sent[0].msg.conversation, /detik/);
});
