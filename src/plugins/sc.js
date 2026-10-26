// .sc — port dari plugins/main/sc.js Baileys.
// Jumlah plugin = jumlah modul plugin Zapo yang terdaftar (ctx.pluginCount),
// BUKAN angka Baileys (549) — supaya angka di Zapo selalu jujur.
// Tombol campuran: Store (url) + Menu (quick_reply) + Owner (url).

export const scPlugin = {
  commands: ['sc', 'script'],
  category: 'main',
  async handler(ctx) {
    const botName = 'HABI AI';
    const body = [
      `🤖 *${botName} — SCRIPT INFO*`,
      '',
      `• Bot : ${botName}`,
      '• Brand : Habibih Cloud ID',
      `• Total Fitur : ${ctx.pluginCount} plugin (Zapo)`,
      '• Owner : Habibih Harahap',
      '• Store : https://store.servercloud.my.id',
      '',
      'Mau punya bot kayak gini? Chat owner / cek store di atas.',
    ].join('\n');
    const footer = '> © 2026 Habibih Cloud ID';
    try {
      return await ctx.replyMixed(body, footer, [
        { kind: 'cta_url', title: '🛒 Store', url: 'https://store.servercloud.my.id' },
        { kind: 'quick_reply', id: `${ctx.prefix}menu`, title: '📜 Menu' },
        { kind: 'cta_url', title: '👤 Owner', url: 'https://wa.me/6285181576338' },
      ]);
    } catch {
      return ctx.reply(`${body}\n\n${footer}`);
    }
  },
};
