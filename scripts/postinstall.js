// postinstall — animasi saat `npm install` selesai.
// Sengaja ringan & tidak pernah menggagalkan install (try/catch + exit 0).

import { banner, ok, spinner } from '../src/lib/anim.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  banner(['HABI ZAPO — install selesai']);
  const steps = [
    'Paket zapo-js + store SQLite terpasang',
    'Animasi konsol siap (npm start)',
    'Sesi SQLite (.auth/state.sqlite) dibuat saat pertama connect',
  ];
  for (const label of steps) {
    const stop = spinner(label);
    await sleep(250);
    stop(label);
  }
  ok('Lanjut: isi config/channels.json (opsional), lalu npm start.');
  ok('Pairing: scan QR, atau BOT_NUMBER=628.. npm start untuk kode pairing.');
} catch {
  // Jangan pernah gagalkan `npm install`.
}
process.exit(0);
