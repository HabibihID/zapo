// .ping — penanda hidup Zapo (dulu demo router di index.js).
// Tombol quick_reply di bawah pesan: [Menu] [Ping lagi] — tap keduanya
// dirutekan router sebagai perintah 'menu' / 'ping'.

export const pingPlugin = {
  commands: ['ping'],
  category: 'umum',
  async handler(ctx) {
    return ctx.replyButtons(
      'pong! HABI Zapo hidup.',
      '© 2026 Habibih Cloud Official ID',
      [
        { id: 'menu', title: 'Menu' },
        { id: 'ping', title: 'Ping lagi' },
      ],
    );
  },
};
