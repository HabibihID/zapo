// .upswgc — port dari plugins/owner/upswgc.js Baileys, DENGAN foto/video.
//
// Perbedaan jujur vs Baileys (sudah dicek di type definition zapo-js):
//   - Baileys v4 teks-only karena groupStatusMessageV2 (proto field 103)
//     tidak mendukung media — dan field itu TIDAK ADA di proto Zapo.
//   - Zapo punya client.status.send (status broadcast) yang kontennya
//     MENDUKUNG image/video + caption (WaSendImageMessage/WaSendVideoMessage).
//   Jadi versi Zapo memposting ke STATUS bot (SW) lewat status.send —
//   foto/video + caption — lalu memberi tahu grup. Bukan lagi pesan
//   groupStatusMessageV2 ke dalam grup, karena mekanisme itu tidak ada di Zapo.
//
// Cara pakai (khusus owner, di dalam grup):
//   .upswgc Pengumuman penting
//   .upswgc Pengumuman (dengan caption pada foto/video yang dikirim)
//   .upswgc Pengumuman (reply ke foto/video)
// Distribusi status mengikuti privasi status akun ('contacts').
//
// ctx.downloadMedia bisa di-inject (tes) — default: downloadMediaMessage
// dari zapo-js (unduh media pesan masuk dari CDN WhatsApp).

import { downloadMediaMessage } from 'zapo-js';
import { unwrapMessage } from '../lib/router.js';

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function quotedMessageOf(message) {
  const m = unwrapMessage(message);
  return (
    m?.extendedTextMessage?.contextInfo?.quotedMessage ||
    m?.imageMessage?.contextInfo?.quotedMessage ||
    m?.videoMessage?.contextInfo?.quotedMessage ||
    null
  );
}

// Cari media (foto/video) pada pesan perintah atau pesan yang di-reply.
// Kembali { kind: 'image'|'video', buffer, mimetype } atau null.
async function extractMedia(ctx) {
  const download = ctx.downloadMedia || downloadMediaMessage;
  const own = unwrapMessage(ctx.event?.message);
  const candidates = [];
  if (own?.imageMessage) candidates.push({ kind: 'image', message: own, node: own.imageMessage });
  if (own?.videoMessage) candidates.push({ kind: 'video', message: own, node: own.videoMessage });
  const quoted = quotedMessageOf(ctx.event?.message);
  const quotedUnwrapped = quoted ? unwrapMessage(quoted) : null;
  if (quotedUnwrapped?.imageMessage) candidates.push({ kind: 'image', message: quotedUnwrapped, node: quotedUnwrapped.imageMessage });
  if (quotedUnwrapped?.videoMessage) candidates.push({ kind: 'video', message: quotedUnwrapped, node: quotedUnwrapped.videoMessage });

  for (const candidate of candidates) {
    try {
      const stream = await download(candidate.message);
      const buffer = await streamToBuffer(stream);
      if (!buffer.length) continue;
      return {
        kind: candidate.kind,
        buffer,
        mimetype: candidate.node.mimetype || (candidate.kind === 'image' ? 'image/jpeg' : 'video/mp4'),
      };
    } catch {
      // Media ini gagal diunduh — coba kandidat berikutnya, jangan crash.
    }
  }
  return null;
}

export const upswgcPlugin = {
  commands: ['upswgc', 'swgc'],
  category: 'owner',
  async handler(ctx) {
    if (!ctx.isOwner()) return ctx.reply('❌ Khusus owner bot.');
    if (!ctx.isGroup) return ctx.reply('❌ Perintah ini hanya bisa dipakai di dalam grup.');

    const text = (ctx.text || '').trim();
    const media = await extractMedia(ctx);
    if (!text && !media) {
      return ctx.reply(
        `⚠️ *Format salah*\n\n*${ctx.prefix}upswgc* Pengumuman penting\nKirim bersama foto/video, atau reply foto/video.`,
      );
    }

    try {
      const content = media
        ? {
            type: media.kind,
            media: media.buffer,
            mimetype: media.mimetype,
            ...(text ? { caption: text } : {}),
          }
        : { type: 'text', text };
      // recipients: [] + statusSetting 'contacts' = distribusi mengikuti
      // privasi status akun (kontak). Makna recipients perlu tes live
      // (lihat README: daftar yang masih menunggu tes lapangan).
      await ctx.client.status.send({ content, recipients: [], statusSetting: 'contacts' });
      return ctx.reply('✅ Status berhasil diposting.');
    } catch (err) {
      return ctx.reply(`❌ Gagal mengirim status.\n${err?.message || ''}`.trim());
    }
  },
};
