# HABI Zapo

Core bot HABI berbasis **Zapo** (`zapo-js` v1.10, implementasi protokol WhatsApp Web dari nol — bukan fork Baileys).

> **STATUS v1.1.0: KONFIGURASI + ROUTER AKTIF, MIGRASI BERTAHAP.**
> Bot HABI yang jalan saat ini tetap memakai Baileys sampai cutover penuh.
> Migrasi ke Zapo DIPERINTAHKAN user 2026-10-26: konfigurasi sekarang, fix
> semua button, audit semua kode, tes per command sampai nol error.

## Yang sudah jadi

- **Koneksi Zapo**: QR terminal + pairing code (`BOT_NUMBER`), sesi SQLite persisten (`.auth/state.sqlite`), reconnect otomatis dengan backoff (berhenti bila perangkat di-unlink/logout).
- **Perbaikan `client.me` → identitas bot** (`src/lib/identity.js`): menormalisasi nomor HP + LID dari `credentials.meJid`/`meLid`. Satu akun bisa tampil sebagai `628..@s.whatsapp.net` atau `123..@lid`; `isMe()` menerima keduanya (termasuk suffix device `:xx`). Bila `meJid` berbentuk LID dan `BOT_NUMBER` tidak diisi, nomor dikembalikan `null` + peringatan — tidak pernah dikarang.
- **Auto-follow 4 saluran** (`src/lib/autofollow.js`): terima link saluran / kode invite / JID `@newsletter`, selesaikan ke JID via `newsletter.fetchByInvite`, lewati yang sudah diikuti, satu gagal tidak menggagalkan yang lain. Daftar di `config/channels.json` atau env `HABI_CHANNELS` (pisah koma).
- **Tombol Native Flow** (`src/lib/nativeflow.js`): builder `quick_reply` (maks 3), `single_select` (daftar berseksi — bentuk menu utama HABI), dan `cta_url`, plus parser jawaban tombol masuk. Dikirim sebagai `Proto.IMessage` mentah lewat `client.message.send`.
- **Animasi konsol** (`src/lib/anim.js`, tanpa dependensi): banner + spinner + progress bar. Jalan otomatis saat `npm install` (postinstall) dan `npm start`.
- **Router perintah v1.1.0** (`src/lib/router.js`): perintah teks + caption media + **tap tombol Native Flow** (isi tombol = perintah; tap `.delpanel 13` sama dengan mengetiknya). Command tak dikenal → saran typo (mesin skor port Baileys, `src/lib/typo.js`) dengan tombol yang **membawa argumen** (fix bug Baileys: dulu argumen hilang saat tombol ditekan). Log menampilkan kiriman & tap Native Flow (jenis + judul tombol); nomor dimask, tanpa JID di log.
- **Plugin v1.1.0** (`src/plugins/`): `.ping`, `.menu`, `.delpanel` (panel Pterodactyl, `src/lib/panel.js` — error membawa status + detail panel; 404 = ID tidak ada, cek `.listserver`), `.upswgc` (lihat catatan di bawah).
- **Penempatan tombol**: tombol quick_reply/single_select/cta_url selalu berada **di bawah isi pesan** (body + footer) dalam satu pesan InteractiveMessage. Tidak ada lagi tombol legacy `buttonsMessage` — semua tombol lewat Native Flow.

## .upswgc di Zapo (foto/video) — perbedaan jujur vs Baileys

- Baileys v4 teks-only karena `groupStatusMessageV2` (proto field 103) tidak mendukung media — dan field itu **tidak ada di proto Zapo** (dicek di type definition).
- Zapo punya `client.status.send` (status broadcast) yang kontennya **mendukung image/video + caption**. Jadi `.upswgc` Zapo memposting ke **STATUS bot** (foto/video/teks + caption), lalu memberi tahu grup — bukan pesan `groupStatusMessageV2` ke dalam grup.
- Cara pakai (owner, di grup): `.upswgc teks` / kirim bersama foto-video / reply foto-video. Distribusi status mengikuti privasi akun (`statusSetting: 'contacts'`).

## Jalankan

```bash
npm install        # animasi postinstall jalan otomatis
npm test           # unit test (identitas, native flow, auto-follow, router, panel, typo, delpanel, upswgc)
npm start          # pairing QR di terminal
BOT_NUMBER=62812xxxx npm start   # pairing pakai kode 8 karakter
HABI_ZAPO_DRY_RUN=1 npm start    # demo tanpa koneksi WA (tes modul)
```

## Konfigurasi

| Env | Fungsi |
| --- | --- |
| `BOT_NUMBER` | Nomor untuk pairing code; juga pelengkap identitas saat `meJid` berbentuk LID |
| `HABI_CHANNELS` | Daftar saluran auto-follow (pisah koma), mengalahkan `config/channels.json` |
| `HABI_SESSION` | ID sesi (default `habi`) |
| `HABI_STORE` | Path SQLite sesi (default `.auth/state.sqlite`) |
| `HABI_ZAPO_DRY_RUN=1` | Mode kering tanpa koneksi WA |
| `HABI_PREFIX` | Prefix perintah (default `.`) |
| `HABI_BOT_NAME` | Nama bot (default `HABI AI`) |
| `HABI_OWNER_NUMBERS` | Nomor owner, digit saja, pisah koma (default nomor admin publik Habibi Store) |
| `PANEL_DOMAIN` | Domain panel Pterodactyl (wajib untuk plugin panel) |
| `PANEL_API_KEY` | Application API key panel (wajib; **tidak pernah di-commit**) |

`config/channels.json` — isi dengan link/kode invite/JID saluran, contoh di `config/channels.example.json`. Kosong = auto-follow dilewati (bukan error).

Privasi: repo publik sengaja dikirim dengan `config/channels.json` kosong. Daftar saluran asli JANGAN PERNAH di-commit — isi lewat env `HABI_CHANNELS` di server pribadi. Log juga tidak pernah menampilkan JID/link/kode saluran, hanya jumlah dan status.

## Status tes (jujur)

Terverifikasi (otomatis, tanpa jaringan):
- Unit test **42/42 lolos** (identitas, native flow, auto-follow, router per command, panel, typo, delpanel, upswgc teks/foto/video).
- Dry run (`HABI_ZAPO_DRY_RUN=1`) + animasi postinstall jalan.
- `npm start` membuat store SQLite dan mencoba soket WA.

Belum terverifikasi live (butuh panel/PC user + HP):
- Pairing QR / kode pairing, auto-follow saluran asli, kirim Native Flow asli.
- Hapus server panel live lewat `.delpanel` (API panel ditiru di tes).
- Posting status foto/video live lewat `.upswgc` — termasuk makna `recipients: []` pada `client.status.send` (type definition tidak memberi contoh; dipakai asumsi distribusi mengikuti privasi akun).
- Catatan: dari sandbox Muse, soket `wss://web.whatsapp.com` timeout karena egress sandbox tidak mengizinkan koneksi langsung — ini batasan sandbox, bukan bug kode. Jalankan `npm start` di panel/VPS/PC yang internetnya langsung untuk pairing.

Roadmap: port 549 plugin Baileys per kategori; bot Baileys tetap jalan sampai cutover penuh.

## Catatan

- Node minimal 20.9 (Zapo). Panel Pterodactyl egg Node 20 memenuhi syarat.
- `.auth/` (sesi) dan `node_modules/` tidak ikut repo — lihat `.gitignore`.
- Jangan pernah commit kredensial / file sesi ke GitHub.
