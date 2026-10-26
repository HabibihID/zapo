// .peraturan — port dari plugins/main/peraturan.js Baileys (teks sama persis).
// Gambar rules.jpg tidak ikut di Zapo (aset Baileys, belum dipindah) —
// pesan dikirim teks + tombol, tanpa gambar.

const rulesText = [
  '╭───〔 📜 PERATURAN BOT 〕',
  '│',
  '│ 1. Gunakan bot dengan bijak.',
  '│    Jangan mengirim spam atau',
  '│    permintaan berulang secara',
  '│    berlebihan.',
  '│',
  '│ 2. Dilarang menggunakan fitur',
  '│    untuk penipuan, tindakan ilegal,',
  '│    atau aktivitas yang merugikan',
  '│    orang lain.',
  '│',
  '│ 3. Hormati batas penggunaan setiap',
  '│    fitur. Jika suatu fitur sedang',
  '│    bermasalah, tunggu beberapa',
  '│    saat sebelum mencoba kembali.',
  '│',
  '│ 4. Jangan mencoba mengeksploitasi',
  '│    bug, membebani server, atau',
  '│    mengganggu stabilitas bot.',
  '│',
  '│ 5. Untuk fitur yang bekerja di group,',
  '│    ikuti aturan dan kebijakan group',
  '│    masing-masing.',
  '│',
  '│ 6. Jangan membagikan data pribadi',
  '│    atau informasi sensitif melalui',
  '│    bot maupun kepada pengguna lain.',
  '│',
  '│ 7. Beberapa fitur dapat berubah,',
  '│    dibatasi, atau dinonaktifkan',
  '│    sewaktu-waktu untuk pemeliharaan.',
  '│',
  '│ Dengan menggunakan Habibih Cloud ID, Anda',
  '│ dianggap telah memahami dan',
  '│ menyetujui peraturan penggunaan.',
  '│',
  '╰───────────────',
].join('\n');

export const peraturanPlugin = {
  commands: ['peraturan', 'aturan'],
  category: 'main',
  async handler(ctx) {
    return ctx.replyButtons(
      rulesText,
      '© 2026 Habibih Cloud Official ID',
      [
        { id: `${ctx.prefix}menu`, title: '⌂ MENU' },
        { id: `${ctx.prefix}donasi`, title: '✧ DONASI' },
      ],
    );
  },
};
