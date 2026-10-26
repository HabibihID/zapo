// .donasi — port dari plugins/main/donasi.js Baileys.
// Menu utama: teks + tombol DANA / QRIS (tap = perintah berargumen).
// Sub-perintah: .donasi dana (nomor dari env HABI_DANA_NUMBER — TIDAK
// PERNAH ditulis di repo), .donasi qris (gambar QRIS belum dipindah ke
// Zapo, jadi balasan menjelaskan itu — bukan gambar palsu).

const donationMenuText = [
  '╭───〔 💝 DONASI HABI AI 〕',
  '│',
  '│ Terima kasih sudah mendukung',
  '│ perkembangan dan pemeliharaan',
  '│ Habibih Cloud ID.',
  '│',
  '│ Dukungan Anda membantu biaya',
  '│ server, pengembangan fitur,',
  '│ serta menjaga bot tetap aktif.',
  '│',
  '╰──────────────',
  '',
  'Silakan pilih metode pembayaran di bawah ini.',
].join('\n');

export const donasiPlugin = {
  commands: ['donasi'],
  category: 'main',
  async handler(ctx) {
    const action = String(ctx.args?.[0] || '').toLowerCase();
    if (action === 'dana') {
      const number = ctx.config.donation?.danaNumber || 'Belum dikonfigurasi';
      const name = ctx.config.donation?.danaName || 'Habibih Harahap';
      return ctx.reply([
        '╭───〔 💳 DANA 〕',
        '│',
        `│ Nama   : ${name}`,
        `│ Nomor  : ${number}`,
        '│',
        '│ Silakan kirim donasi sesuai',
        '│ kemampuan Anda. Terima kasih',
        '│ atas dukungannya! 🙏',
        '╰──────────────',
      ].join('\n'));
    }
    if (action === 'qris') {
      return ctx.reply('❌ Gambar QRIS belum tersedia di Zapo (aset QRIS Baileys belum dipindah). Sementara pakai .donasi dana.');
    }
    return ctx.replyButtons(
      donationMenuText,
      '© 2026 Habibih Cloud Official ID',
      [
        { id: `${ctx.prefix}donasi dana`, title: 'DANA' },
        { id: `${ctx.prefix}donasi qris`, title: 'QRIS' },
      ],
    );
  },
};
