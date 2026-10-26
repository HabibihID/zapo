// HABI Zapo — entry point.
//
// Jalankan:  npm start
// Pairing:   tanpa BOT_NUMBER -> QR tampil di terminal (scan dari HP).
//            dengan BOT_NUMBER=62812... -> kode pairing 8 karakter.
// Sesi tersimpan di SQLite (.auth/state.sqlite) — pairing cukup sekali.
// Auto-follow saluran jalan tiap connect (config/channels.json / HABI_CHANNELS).
// Router v1.1.0: .ping .menu .delpanel .upswgc + saran typo + tap tombol
// Native Flow. Bot HABI yang jalan saat ini TETAP memakai Baileys
// sampai cutover penuh — proyek ini disiapkan & diuji bertahap.
//
// Mode kering (tanpa koneksi WA, untuk tes):
//   HABI_ZAPO_DRY_RUN=1 npm start

import { WaClient, ConsoleLogger, createStore } from 'zapo-js';
import { createSqliteStore } from '@zapo-js/store-sqlite';
import qrcode from 'qrcode-terminal';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { banner, info, ok, spinner, warn, progressBar } from './lib/anim.js';
import { resolveBotIdentity, formatIdentityCard } from './lib/identity.js';
import { autoFollowChannels } from './lib/autofollow.js';
import { buildQuickReplyMessage, sendNativeFlow } from './lib/nativeflow.js';
import { config, loadChannels } from './config.js';
import { createRouter } from './lib/router.js';
import { pingPlugin } from './plugins/ping.js';
import { menuPlugin } from './plugins/menu.js';
import { delpanelPlugin } from './plugins/delpanel.js';
import { upswgcPlugin } from './plugins/upswgc.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dryRun() {
  banner(['HABI ZAPO — DRY RUN (tanpa koneksi WhatsApp)']);
  const stop = spinner('Animasi konsol');
  await sleep(600);
  stop('Animasi konsol OK');

  info('Identitas contoh (meJid LID + BOT_NUMBER):');
  const demo = resolveBotIdentity({
    meJid: '123456789012345:12@lid',
    meLid: '123456789012345@lid',
    pairingPhone: '6281234567890',
  });
  console.log(formatIdentityCard(demo));
  console.log(`  isMe('6281234567890@s.whatsapp.net') = ${demo.isMe('6281234567890@s.whatsapp.net')}`);
  console.log(`  isMe('123456789012345@lid') = ${demo.isMe('123456789012345@lid')}`);

  info('Payload Native Flow contoh (quick_reply):');
  console.log(JSON.stringify(buildQuickReplyMessage({
    body: 'Halo dari HABI Zapo!',
    footer: '© 2026 Habibih Cloud Official ID',
    buttons: [
      { id: 'menu', title: 'Menu' },
      { id: 'ping', title: 'Ping' },
    ],
  }), null, 2).slice(0, 600) + ' ...');

  info('Auto-follow contoh (mock client):');
  const mock = {
    newsletter: {
      listSubscribed: async () => [],
      fetchByInvite: async (code) => ({ jid: `999${code.length}@newsletter`, name: 'Saluran Demo' }),
      fetch: async (jid) => ({ jid, name: 'Saluran Demo' }),
      follow: async () => {},
    },
  };
  const res = await autoFollowChannels(mock, ['https://whatsapp.com/channel/0029DemoCode']);
  console.log(' ', JSON.stringify(res));
  ok('Dry run selesai — semua modul jalan tanpa koneksi WA.');
  process.exit(0);
}

async function main() {
  if (config.dryRun) return dryRun();

  banner(['HABI ZAPO', 'Core bot HABI berbasis Zapo (zapo-js)', 'Status: SIAP, belum migrasi — Baileys tetap jalan']);

  // SQLite tidak membuat folder induk sendiri — siapkan dulu.
  mkdirSync(dirname(config.storePath), { recursive: true });
  const store = createStore({
    backends: { sqlite: createSqliteStore({ path: config.storePath }) },
    providers: {
      auth: 'sqlite',
      signal: 'sqlite',
      preKey: 'sqlite',
      session: 'sqlite',
      identity: 'sqlite',
      senderKey: 'sqlite',
      appState: 'sqlite',
      privacyToken: 'sqlite',
      messages: 'sqlite',
      threads: 'sqlite',
      contacts: 'sqlite',
    },
  });
  ok(`Store SQLite siap (${config.storePath})`);

  const client = new WaClient({ store, sessionId: config.sessionId }, new ConsoleLogger('warn'));
  let reconnectTimer = null;
  let reconnectDelayMs = 3000;
  let shuttingDown = false;
  let botIdentity = null;

  client.on('auth_qr', ({ qr }) => {
    info('Scan QR ini dari HP (WhatsApp > Perangkat tertaut):');
    qrcode.generate(qr, { small: true });
  });

  client.on('auth_pairing_required', async () => {
    if (!config.botNumber) {
      warn('Belum ada pairing: scan QR di atas, atau jalankan ulang dengan BOT_NUMBER=628.. untuk kode pairing.');
      return;
    }
    const stop = spinner(`Meminta kode pairing untuk ${config.botNumber}`);
    try {
      await client.auth.requestPairingCode(config.botNumber);
    } catch (err) {
      stop();
      warn(`Gagal minta pairing code: ${err.message}`);
    }
  });

  client.on('auth_pairing_code', ({ code }) => {
    console.log(`\n  ╔══════════════════╗\n  ║  KODE PAIRING: ${code}  ║\n  ╚══════════════════╝`);
    info('Masukkan kode di HP: WhatsApp > Perangkat tertaut > Tautkan dengan nomor telepon.');
  });

  client.on('auth_paired', async ({ credentials }) => {
    ok('Pairing berhasil!');
    const identity = resolveBotIdentity({
      meJid: credentials.meJid,
      meLid: credentials.meLid,
      pairingPhone: config.botNumber,
    });
    console.log('  Identitas bot:');
    console.log(formatIdentityCard(identity));
    botIdentity = identity;
  });

  client.on('connection', async (event) => {
    if (event.status === 'open') {
      reconnectDelayMs = 3000;
      ok(`Terhubung ke WhatsApp${event.isNewLogin ? ' (login baru)' : ''}.`);

      // Auto-follow saluran milik user.
      const channels = loadChannels();
      if (channels.length === 0) {
        warn('Auto-follow dilewati: config/channels.json kosong & HABI_CHANNELS tidak diisi.');
      } else {
        const stop = spinner(`Auto-follow ${channels.length} saluran`);
        const results = await autoFollowChannels(client, channels, { log: () => {} });
        stop(`Auto-follow selesai (${results.filter((r) => r.status !== 'failed').length}/${results.length} OK)`);
        // Privasi: log TIDAK PERNAH menampilkan JID/link/kode saluran.
        const hideIds = (s) => String(s ?? '')
          .replace(/\d{10,}@newsletter/g, '[saluran]')
          .replace(/whatsapp\.com\/channel\/[A-Za-z0-9_-]+/g, '[saluran]')
          .replace(/0029[A-Za-z0-9_-]+/g, '[saluran]');
        results.forEach((r, i) => {
          progressBar(i + 1, results.length, r.status);
        });
        results.forEach((r, i) => {
          if (r.status === 'failed') warn(`  gagal saluran ke-${i + 1}: ${hideIds(r.error)}`);
        });
      }
      ok('Bot siap. Router Zapo aktif: .ping .menu .delpanel .upswgc (tap tombol = perintah).');
      return;
    }
    if (event.status === 'close') {
      if (event.isLogout || shuttingDown) {
        warn(`Koneksi ditutup${event.isLogout ? ' (perangkat di-unlink — pairing ulang diperlukan)' : ''}. Tidak reconnect.`);
        return;
      }
      warn(`Koneksi putus (${event.reason ?? 'tanpa alasan'}). Reconnect dalam ${reconnectDelayMs / 1000} detik...`);
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        reconnectDelayMs = Math.min(reconnectDelayMs * 2, 30000);
        client.connect().catch((err) => warn(`Reconnect gagal: ${err.message}`));
      }, reconnectDelayMs);
    }
  });

  // Router HABI penuh (v1.1.0): perintah teks + tap tombol Native Flow.
  // Plugin baru didaftarkan di array ini; tiap plugin = { commands, handler }.
  const router = createRouter({
    plugins: [pingPlugin, menuPlugin, delpanelPlugin, upswgcPlugin],
    config,
    log: (line) => console.log(`  ${line}`),
  });

  client.on('message', async (event) => {
    try {
      await router.handleMessage({ client, event });
    } catch (err) {
      warn(`Router gagal: ${err.message}`);
    }
  });

  process.on('SIGINT', () => {
    shuttingDown = true;
    info('Mematikan HABI Zapo...');
    process.exit(0);
  });

  const stop = spinner('Menghubungkan ke WhatsApp');
  try {
    await client.connect();
    stop('Terhubung ke WhatsApp');
  } catch (err) {
    stop();
    warn(`connect() gagal: ${err.message}`);
    warn('Cek jaringan / ulangi npm start. Sesi tersimpan tetap aman di SQLite.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\nFatal: ${err?.message ?? err}`);
  process.exit(1);
});
