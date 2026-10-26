// .menu — daftar perintah Zapo v1.1.0 (port menu penuh menyusul per kategori).
// Sengaja ringkas & jujur: hanya perintah yang sudah ter-port yang
// ditampilkan, supaya tidak ada tombol/menu yang mengarah ke perintah mati.

export const menuPlugin = {
  commands: ['menu'],
  category: 'umum',
  async handler(ctx) {
    return ctx.reply(
      [
        '*HABI Zapo — Menu v1.1.0*',
        '',
        'Perintah yang sudah aktif di Zapo:',
        `• ${ctx.prefix}ping — cek bot hidup`,
        `• ${ctx.prefix}delpanel <id> — hapus server panel (owner)`,
        `• ${ctx.prefix}upswgc <teks> — posting status foto/video/teks (owner, di grup)`,
        `• ${ctx.prefix}menu — daftar ini`,
        '',
        'Port penuh 549 plugin Baileys menyusul per kategori; bot Baileys tetap jalan sampai cutover.',
      ].join('\n'),
    );
  },
};
