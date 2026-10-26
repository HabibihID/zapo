// .runtime — port dari plugins/main/runtime.js Baileys (format sama persis).

function fmtUptime(sec) {
  const s = Math.floor(sec);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const parts = [];
  if (d > 0) parts.push(`${d} hari`);
  if (h > 0 || d > 0) parts.push(`${h} jam`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m} menit`);
  parts.push(`${ss} detik`);
  return parts.join(', ');
}

export const runtimePlugin = {
  commands: ['runtime', 'uptime'],
  category: 'main',
  async handler(ctx) {
    return ctx.reply(
      `⏱️ *RUNTIME BOT*\nBot sudah aktif selama:\n${fmtUptime(process.uptime())}`,
    );
  },
};
