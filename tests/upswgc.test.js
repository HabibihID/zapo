// Tes plugin .upswgc Zapo: teks, foto, video, guard owner/grup.
// Unduhan media di-inject (tanpa jaringan); status.send ditiru.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { upswgcPlugin } from '../src/plugins/upswgc.js';

function ctx({ owner = true, isGroup = true, text = '', message = {}, statusImpl = null, downloadMedia = null } = {}) {
  const replies = [];
  const statusCalls = [];
  return {
    replies,
    statusCalls,
    isOwner: () => owner,
    isGroup,
    text,
    prefix: '.',
    event: { message },
    client: {
      status: {
        send: async (input) => {
          statusCalls.push(input);
          if (statusImpl) await statusImpl(input);
          return {};
        },
      },
    },
    downloadMedia,
    reply: async (t) => { replies.push(t); return t; },
  };
}

test('bukan owner & bukan grup ditolak', async () => {
  const c1 = ctx({ owner: false, text: 'Halo' });
  await upswgcPlugin.handler(c1);
  assert.match(c1.replies[0], /Khusus owner/);

  const c2 = ctx({ isGroup: false, text: 'Halo' });
  await upswgcPlugin.handler(c2);
  assert.match(c2.replies[0], /di dalam grup/);
});

test('tanpa teks & tanpa media = format salah', async () => {
  const c = ctx({ message: { conversation: '.upswgc' } });
  await upswgcPlugin.handler(c);
  assert.match(c.replies[0], /Format salah/);
});

test('teks saja → status.send teks + balasan sukses', async () => {
  const c = ctx({ text: 'Pengumuman penting' });
  await upswgcPlugin.handler(c);
  assert.equal(c.statusCalls.length, 1);
  assert.deepEqual(c.statusCalls[0].content, { type: 'text', text: 'Pengumuman penting' });
  assert.deepEqual(c.statusCalls[0].recipients, []);
  assert.equal(c.statusCalls[0].statusSetting, 'contacts');
  assert.match(c.replies[0], /berhasil diposting/);
});

test('foto sendiri (caption perintah) → status.send image + caption', async () => {
  const fakeDownload = async () => Readable.from([Buffer.from('fake-jpeg-bytes')]);
  const c = ctx({
    text: 'Pengumuman foto',
    message: { imageMessage: { mimetype: 'image/jpeg', caption: '.upswgc Pengumuman foto' } },
    downloadMedia: fakeDownload,
  });
  await upswgcPlugin.handler(c);
  assert.equal(c.statusCalls.length, 1);
  const content = c.statusCalls[0].content;
  assert.equal(content.type, 'image');
  assert.equal(content.mimetype, 'image/jpeg');
  assert.equal(content.caption, 'Pengumuman foto');
  assert.ok(Buffer.isBuffer(content.media));
  assert.match(c.replies[0], /berhasil diposting/);
});

test('reply ke video → status.send video + caption', async () => {
  const fakeDownload = async () => Readable.from([Buffer.from('fake-mp4-bytes')]);
  const c = ctx({
    text: 'Pengumuman video',
    message: {
      extendedTextMessage: {
        text: '.upswgc Pengumuman video',
        contextInfo: { quotedMessage: { videoMessage: { mimetype: 'video/mp4' } } },
      },
    },
    downloadMedia: fakeDownload,
  });
  await upswgcPlugin.handler(c);
  assert.equal(c.statusCalls.length, 1);
  const content = c.statusCalls[0].content;
  assert.equal(content.type, 'video');
  assert.equal(content.mimetype, 'video/mp4');
  assert.equal(content.caption, 'Pengumuman video');
});

test('status.send gagal → pesan gagal jelas, tanpa crash', async () => {
  const c = ctx({
    text: 'Halo',
    statusImpl: async () => { throw new Error('463 token hilang'); },
  });
  await upswgcPlugin.handler(c);
  assert.match(c.replies[0], /Gagal mengirim status/);
  assert.match(c.replies[0], /463/);
});
