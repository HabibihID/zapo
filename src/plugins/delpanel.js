// .delpanel — port dari plugins/panel/delpanel.js Baileys.
// Owner-only. Pesan error memakai detail dari lib/panel.js (404 = ID tidak
// ada, bukan "Gagal hapus server" generik).
//
// ctx.panelClient bisa di-inject (tes) — default: klien panel dari config.

import { createPanelClient } from '../lib/panel.js';

export const delpanelPlugin = {
  commands: ['delpanel', 'hapuspanel'],
  category: 'panel',
  async handler(ctx) {
    if (!ctx.isOwner()) return ctx.reply('❌ Khusus owner bot.');
    const id = (ctx.args[0] || '').trim();
    if (!id) {
      return ctx.reply(
        `⚠️ *Format salah*\n\n*${ctx.prefix}delpanel* <id server>\nContoh: ${ctx.prefix}delpanel 14`,
      );
    }
    const panel = ctx.panelClient || createPanelClient({
      domain: ctx.config.panel.domain,
      apiKey: ctx.config.panel.apiKey,
    });
    try {
      await panel.deleteServer(id);
      return ctx.reply(`✅ Server ${id} berhasil dihapus dari panel.`);
    } catch (err) {
      return ctx.reply(`❌ ${err?.message || err}`);
    }
  },
};
