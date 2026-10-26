# HABI Zapo

Core bot HABI berbasis **Zapo** (`zapo-js` v1.10, implementasi protokol WhatsApp Web dari nol — bukan fork Baileys).

> **STATUS: SIAP, BELUM MIGRASI.** Bot HABI yang jalan saat ini tetap memakai Baileys.
> Proyek ini hanya disiapkan dulu. Pindah ke Zapo HANYA saat user menyuruh pindah.

## Yang sudah jadi

- **Koneksi Zapo**: QR terminal + pairing code (`BOT_NUMBER`), sesi SQLite persisten (`.auth/state.sqlite`), reconnect otomatis dengan backoff (berhenti bila perangkat di-unlink/logout).
- **Perbaikan `client.me` → identitas bot** (`src/lib/identity.js`): menormalisasi nomor HP + LID dari `credentials.meJid`/`meLid`. Satu akun bisa tampil sebagai `628..@s.whatsapp.net` atau `123..@lid`; `isMe()` menerima keduanya (termasuk suffix device `:xx`). Bila `meJid` berbentuk LID dan `BOT_NUMBER` tidak diisi, nomor dikembalikan `null` + peringatan — tidak pernah dikarang.
- **Auto-follow 4 saluran** (`src/lib/autofollow.js`): terima link saluran / kode invite / JID `@newsletter`, selesaikan ke JID via `newsletter.fetchByInvite`, lewati yang sudah diikuti, satu gagal tidak menggagalkan yang lain. Daftar di `config/channels.json` atau env `HABI_CHANNELS` (pisah koma).
- **Tombol Native Flow** (`src/lib/nativeflow.js`): builder `quick_reply` (maks 3), `single_select` (daftar berseksi — bentuk menu utama HABI), dan `cta_url`, plus parser jawaban tombol masuk. Dikirim sebagai `Proto.IMessage` mentah lewat `client.message.send`.
- **Animasi konsol** (`src/lib/anim.js`, tanpa dependensi): banner + spinner + progress bar. Jalan otomatis saat `npm install` (postinstall) dan `npm start`.

## Jalankan

```bash
npm install        # animasi postinstall jalan otomatis
npm test           # unit test (identitas, native flow, auto-follow)
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

`config/channels.json` — isi dengan link/kode invite/JID saluran, contoh di `config/channels.example.json`. Kosong = auto-follow dilewati (bukan error).

Privasi: repo publik sengaja dikirim dengan `config/channels.json` kosong. Daftar saluran asli JANGAN PERNAH di-commit — isi lewat env `HABI_CHANNELS` di server pribadi. Log juga tidak pernah menampilkan JID/link/kode saluran, hanya jumlah dan status.

## Demo router

Saat ini hanya router demo: kirim `ping` → dibalas `pong` + tombol Native Flow (penanda hidup). Router HABI penuh (540 plugin) dipasang saat migrasi, BUKAN sekarang.

## Status tes (jujur)

Terverifikasi:
- Unit test 16/16 lolos (identitas, native flow, auto-follow).
- Dry run (`HABI_ZAPO_DRY_RUN=1`) + animasi postinstall jalan.
- `npm start` membuat store SQLite dan mencoba soket WA.

Belum terverifikasi live (butuh HP user + jaringan langsung):
- Pairing QR / kode pairing, auto-follow saluran asli, dan kirim Native Flow asli.
- Catatan: dari sandbox Muse, soket `wss://web.whatsapp.com` timeout karena egress sandbox tidak mengizinkan koneksi langsung — ini batasan sandbox, bukan bug kode. Jalankan `npm start` di panel/VPS/PC yang internetnya langsung untuk pairing.

## Catatan

- Node minimal 20.9 (Zapo). Panel Pterodactyl egg Node 20 memenuhi syarat.
- `.auth/` (sesi) dan `node_modules/` tidak ikut repo — lihat `.gitignore`.
- Jangan pernah commit kredensial / file sesi ke GitHub.
