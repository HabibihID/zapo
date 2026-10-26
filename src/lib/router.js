// Router perintah HABI Zapo — pengganti core/router-pesan.js Baileys.
//
// Alur pesan masuk:
//   teks biasa / caption media / tap tombol Native Flow
//     → extractText (tap tombol = isi params.id tombol itu)
//     → parseCommand (prefix, mis. ".delpanel 13")
//     → plugin terdaftar (atau saran typo bila command tak dikenal)
//     → balasan teks / Native Flow
//
// Penempatan tombol (ini yang ditanyakan user: "di mana dia tepat button"):
//   - Tombol quick_reply/single_select/cta_url selalu berada DI BAWAH isi
//     pesan (body + footer) di dalam satu pesan InteractiveMessage —
//     dibangun nativeflow.js, dikirim lewat client.message.send.
//   - Tap tombol kembali sebagai interactiveResponseMessage; router membaca
//     params.id-nya sebagai teks perintah, jadi tap ".delpanel 13" persis
//     sama dengan mengetik ".delpanel 13" (argumen ikut).
//
// Log: nomor dimask (6 digit pertama + "..."), nama dipotong — tidak ada
// JID/link di log, mengikuti aturan privasi saluran.

import { buildQuickReplyMessage, parseInteractiveResponse, sendNativeFlow } from './nativeflow.js';
import { findBestCommandMatch, sendTypoSuggestion } from './typo.js';

export function digitsOf(jid) {
  return String(jid || '').split('@')[0].replace(/\D/g, '');
}

export function parseCommand(text, prefix) {
  if (!text.startsWith(prefix)) return null;
  const withoutPrefix = text.slice(prefix.length).trim();
  const [command, ...rest] = withoutPrefix.split(/\s+/);
  return {
    command: (command || '').toLowerCase(),
    args: rest,
    text: rest.join(' '),
  };
}

function unwrapMessage(message) {
  let current = message;
  for (let i = 0; i < 6; i++) {
    const next =
      current?.ephemeralMessage?.message ||
      current?.viewOnceMessage?.message ||
      current?.viewOnceMessageV2?.message ||
      current?.deviceSentMessage?.message ||
      current?.documentWithCaptionMessage?.message;
    if (!next || next === current) break;
    current = next;
  }
  return current || {};
}

export { unwrapMessage };

// Baca teks perintah dari pesan masuk. Kembali { text, via } dengan
// via = 'button' bila berasal dari tap tombol, 'text' bila dari ketikan.
export function extractText(message) {
  const response = parseInteractiveResponse(message);
  if (response?.id) return { text: response.id, via: 'button' };
  const m = unwrapMessage(message);
  const text =
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    m?.documentMessage?.caption ||
    '';
  return { text, via: 'text' };
}

function maskNumber(jid) {
  const digits = digitsOf(jid);
  if (!digits) return '?';
  return digits.length > 6 ? `${digits.slice(0, 6)}...` : digits;
}

function shortName(name) {
  const s = String(name || '').trim();
  if (!s) return 'tanpa nama';
  return s.length > 24 ? `${s.slice(0, 24)}...` : s;
}

export function createRouter({ plugins, config, log = () => {} }) {
  const byName = new Map();
  for (const plugin of plugins) {
    for (const name of plugin.commands) byName.set(name, plugin);
  }
  const entries = () => plugins.flatMap((p) => p.commands.map((c) => ({ command: c, category: p.category || 'umum' })));

  async function handleMessage({ client, event }) {
    const key = event?.key || {};
    if (key.fromMe) return { status: 'ignored', reason: 'fromMe' };
    const chat = key.remoteJid;
    if (!chat) return { status: 'ignored', reason: 'no-chat' };
    const sender = key.participant || chat;
    const isGroup = Boolean(key.isGroup) || chat.endsWith('@g.us');

    const { text: rawText, via } = extractText(event?.message);
    const text = (rawText || '').trim();
    if (!text) return { status: 'ignored', reason: 'no-text' };

    let parsed = null;
    if (text.startsWith(config.prefix)) {
      parsed = parseCommand(text, config.prefix);
    } else if (byName.has(text)) {
      // Tap tombol quick_reply tanpa prefix (id 'ping', 'menu', ...).
      parsed = { command: text, args: [], text: '' };
    }
    if (!parsed || !parsed.command) return { status: 'ignored', reason: 'not-command' };

    const ctx = {
      client,
      event,
      chat,
      sender,
      isGroup,
      args: parsed.args,
      text: parsed.text,
      prefix: config.prefix,
      config,
      isOwner: () => config.ownerNumbers.includes(digitsOf(sender)),
      reply: (t) => client.message.send(chat, { conversation: t }),
      replyButtons: (body, footer, buttons) => {
        log(`[Native Flow] kirim quick_reply: ${buttons.map((b) => `"${b.title}"`).join(', ')}`);
        return sendNativeFlow(client, chat, buildQuickReplyMessage({ body, footer, buttons }));
      },
    };

    if (via === 'button') {
      log(`[Native Flow] tap tombol → "${text}"`);
    }
    log(`⚡ COMMAND: ${text} (${parsed.command}) • ${isGroup ? 'grup' : 'pribadi'} • dari ${shortName(event?.pushName)} ${maskNumber(sender)}`);

    const plugin = byName.get(parsed.command);
    if (!plugin) {
      const match = findBestCommandMatch(parsed.command, entries());
      if (match) {
        const sent = await sendTypoSuggestion(client, chat, config.prefix, parsed.command, parsed.text, entries());
        return { status: 'typo', command: parsed.command, match, sent };
      }
      return { status: 'unknown', command: parsed.command };
    }

    try {
      await plugin.handler(ctx);
      return { status: 'handled', command: parsed.command };
    } catch (err) {
      log(`[router] error ${parsed.command}: ${err?.message || err}`);
      try {
        await ctx.reply(`❌ Terjadi kesalahan: ${err?.message || err}`);
      } catch {}
      return { status: 'error', command: parsed.command, error: err };
    }
  }

  return { handleMessage, entries, byName };
}
