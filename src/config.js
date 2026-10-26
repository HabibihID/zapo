import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Daftar saluran yang di-auto-follow saat connect.
// Urutan sumber: env HABI_CHANNELS (pisah koma) > config/channels.json.
// Isi channels.json dengan link/kode invite/JID @newsletter, mis:
//   ["https://whatsapp.com/channel/0029AbC...", "1234567890123@newsletter"]
// Kosong = auto-follow dilewati (bukan error).
export function loadChannels() {
  const fromEnv = (process.env.HABI_CHANNELS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;
  const path = join(ROOT, 'config', 'channels.json');
  if (existsSync(path)) {
    try {
      const arr = JSON.parse(readFileSync(path, 'utf8'));
      if (Array.isArray(arr)) return arr.map((s) => String(s).trim()).filter(Boolean);
    } catch {
      // File rusak = anggap kosong, jangan matikan bot.
    }
  }
  return [];
}

export const config = {
  sessionId: process.env.HABI_SESSION || 'habi',
  storePath: process.env.HABI_STORE || join(ROOT, '.auth', 'state.sqlite'),
  // Nomor yang dipakai minta pairing code (format bebas, mis. 62812...).
  // Juga dipakai resolveBotIdentity saat meJid berbentuk LID.
  botNumber: (process.env.BOT_NUMBER ?? '').replace(/\D/g, '') || null,
  dryRun: process.env.HABI_ZAPO_DRY_RUN === '1',
};
