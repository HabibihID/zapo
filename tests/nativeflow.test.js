import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuickReplyMessage,
  buildListMessage,
  buildCtaUrlMessage,
  sendNativeFlow,
  parseInteractiveResponse,
} from '../src/lib/nativeflow.js';

test('quick_reply: bentuk nativeFlowMessage benar', () => {
  const m = buildQuickReplyMessage({
    body: 'Halo',
    footer: 'foot',
    buttons: [
      { id: 'menu', title: 'Menu' },
      { id: 'ping', title: 'Ping' },
    ],
  });
  const nf = m.interactiveMessage.nativeFlowMessage;
  assert.equal(m.interactiveMessage.body.text, 'Halo');
  assert.equal(nf.buttons.length, 2);
  assert.equal(nf.buttons[0].name, 'quick_reply');
  assert.deepEqual(JSON.parse(nf.buttons[0].buttonParamsJson), { display_text: 'Menu', id: 'menu' });
});

test('quick_reply: validasi jumlah dan isi tombol', () => {
  assert.throws(() => buildQuickReplyMessage({ body: 'x', buttons: [] }), /1\.\.3/);
  assert.throws(() => buildQuickReplyMessage({
    body: 'x',
    buttons: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' }, { id: 'd', title: 'D' }],
  }), /1\.\.3/);
  assert.throws(() => buildQuickReplyMessage({ body: 'x', buttons: [{ id: '', title: 'A' }] }), /button\.id/);
});

test('single_select: bentuk daftar berseksi benar', () => {
  const m = buildListMessage({
    body: 'Pilih kategori',
    buttonTitle: 'Lihat Kategori',
    sections: [{ title: 'Utama', rows: [{ id: 'a', title: 'Fitur A', description: 'desc' }] }],
  });
  const btn = m.interactiveMessage.nativeFlowMessage.buttons[0];
  assert.equal(btn.name, 'single_select');
  const params = JSON.parse(btn.buttonParamsJson);
  assert.equal(params.title, 'Lihat Kategori');
  assert.equal(params.sections[0].rows[0].id, 'a');
});

test('cta_url: validasi URL', () => {
  assert.throws(() => buildCtaUrlMessage({ body: 'x', buttons: [{ id: 'a', title: 'A', url: 'ftp://x' }] }), /http/);
  const m = buildCtaUrlMessage({ body: 'x', buttons: [{ id: 'a', title: 'Panel', url: 'https://example.com' }] });
  assert.equal(m.interactiveMessage.nativeFlowMessage.buttons[0].name, 'cta_url');
});

test('sendNativeFlow menolak client/pesan yang salah', async () => {
  await assert.rejects(() => sendNativeFlow({}, '62812@s.whatsapp.net', buildQuickReplyMessage({
    body: 'x', buttons: [{ id: 'a', title: 'A' }],
  })), /client Zapo/);
  await assert.rejects(() => sendNativeFlow(
    { message: { send: async () => {} } },
    '62812@s.whatsapp.net',
    { conversation: 'bukan native flow' },
  ), /Native Flow/);
});

test('sendNativeFlow meneruskan pesan ke client.message.send', async () => {
  let got = null;
  const client = { message: { send: async (to, msg) => { got = { to, msg }; return { id: '1' }; } } };
  const m = buildQuickReplyMessage({ body: 'x', buttons: [{ id: 'a', title: 'A' }] });
  await sendNativeFlow(client, '62812@s.whatsapp.net', m);
  assert.equal(got.to, '62812@s.whatsapp.net');
  assert.equal(got.msg, m);
});

test('parseInteractiveResponse membaca jawaban tombol', () => {
  const qr = parseInteractiveResponse({
    interactiveResponseMessage: {
      nativeFlowResponseMessage: { paramsJson: JSON.stringify({ id: 'menu', display_text: 'Menu' }) },
    },
  });
  assert.deepEqual(qr, { kind: 'quick_reply', id: 'menu', title: 'Menu' });
  const list = parseInteractiveResponse({
    listResponseMessage: { singleSelectReply: { selectedRowId: 'a', title: 'Fitur A' } },
  });
  assert.deepEqual(list, { kind: 'list', id: 'a', title: 'Fitur A' });
  assert.equal(parseInteractiveResponse({ conversation: 'halo' }), null);
  const wrapped = parseInteractiveResponse({
    ephemeralMessage: {
      message: {
        interactiveResponseMessage: {
          nativeFlowResponseMessage: { paramsJson: JSON.stringify({ id: 'x', display_text: 'X' }) },
        },
      },
    },
  });
  assert.equal(wrapped.id, 'x');
});
