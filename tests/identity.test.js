import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBotIdentity, splitJid } from '../src/lib/identity.js';

test('meJid nomor: phone + device dikenali', () => {
  const id = resolveBotIdentity({ meJid: '6281234567890:12@s.whatsapp.net', meLid: '123456789@lid' });
  assert.equal(id.phone, '6281234567890');
  assert.equal(id.phoneJid, '6281234567890@s.whatsapp.net');
  assert.equal(id.lid, '123456789');
  assert.equal(id.lidJid, '123456789@lid');
  assert.equal(id.device, 12);
  assert.equal(id.phoneResolved, true);
});

test('meJid LID + BOT_NUMBER: phone dari pairing, lid dari meJid', () => {
  const id = resolveBotIdentity({ meJid: '123456789:3@lid', pairingPhone: '62812-3456-7890' });
  assert.equal(id.phone, '6281234567890');
  assert.equal(id.phoneSource, 'pairingPhone');
  assert.equal(id.lid, '123456789');
  assert.equal(id.device, 3);
});

test('meJid LID tanpa nomor: phone null + peringatan, bukan karangan', () => {
  const id = resolveBotIdentity({ meJid: '123456789@lid' });
  assert.equal(id.phone, null);
  assert.equal(id.phoneResolved, false);
  assert.ok(id.warnings.length > 0);
});

test('isMe menerima nomor, LID, suffix device, dan digit mentah', () => {
  const id = resolveBotIdentity({ meJid: '6281234567890@s.whatsapp.net', meLid: '123456789@lid' });
  assert.equal(id.isMe('6281234567890@s.whatsapp.net'), true);
  assert.equal(id.isMe('6281234567890:5@s.whatsapp.net'), true);
  assert.equal(id.isMe('123456789@lid'), true);
  assert.equal(id.isMe('123456789:2@lid'), true);
  assert.equal(id.isMe('6281234567890'), true);
  assert.equal(id.isMe('6289999999999@s.whatsapp.net'), false);
  assert.equal(id.isMe('1234567890123@g.us'), false);
  assert.equal(id.isMe('1234567890123@newsletter'), false);
  assert.equal(id.isMe(''), false);
  assert.equal(id.isMe(null), false);
});

test('splitJid menangani device suffix dan input jelek', () => {
  assert.deepEqual(splitJid('62812:7@s.whatsapp.net'), { user: '62812', device: 7, server: 's.whatsapp.net' });
  assert.equal(splitJid('bukan-jid'), null);
  assert.equal(splitJid(null), null);
});
