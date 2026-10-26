// .tqto — port dari plugins/main/tqto.js Baileys.
// Satu-satunya penyesuaian: kredit mesin diubah ke Zapo (yang memang jalan).

export const tqtoPlugin = {
  commands: ['tqto'],
  category: 'main',
  async handler(ctx) {
    return ctx.reply([
      '🙏 *THANKS TO*',
      '',
      '• Allah SWT',
      '• Habibih Harahap (Owner & Developer)',
      '• Node.js & Zapo',
      '• Dan semua pengguna setia HABI AI',
      '',
      '> © 2026 Habibih Cloud ID',
    ].join('\n'));
  },
};
