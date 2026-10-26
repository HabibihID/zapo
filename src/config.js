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
  // Konfigurasi bot (setara config/settings.js Baileys, tapi lewat env —
  // TIDAK ADA kunci/API key yang ditulis di repo ini).
  prefix: process.env.HABI_PREFIX || '.',
  botName: process.env.HABI_BOT_NAME || 'HABI AI',
  // Nomor owner (digit saja, pisah koma). Default = nomor admin publik
  // Habibi Store (sudah tercantum di source Baileys & halaman toko).
  ownerNumbers: (process.env.HABI_OWNER_NUMBERS || '6285181576338')
    .split(',')
    .map((s) => s.replace(/\D/g, ''))
    .filter(Boolean),
  // Panel Pterodactyl (untuk .delpanel dkk). WAJIB diisi lewat env di panel;
  // kosong = plugin panel menolak dengan pesan jelas (bukan error samar).
  panel: {
    domain: (process.env.PANEL_DOMAIN || '').replace(/\/+$/, ''),
    apiKey: process.env.PANEL_API_KEY || '',
  },
  // Donasi (untuk .donasi dana). Nomor DANA TIDAK PERNAH ditulis di repo —
  // isi lewat env di server; kosong = balasan "Belum dikonfigurasi".
  donation: {
    danaNumber: (process.env.HABI_DANA_NUMBER || '').replace(/\s+/g, ''),
    danaName: process.env.HABI_DANA_NAME || 'Habibih Harahap',
  },
};
