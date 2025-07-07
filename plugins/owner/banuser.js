module.exports = {
  name: 'banuser',
  desc: 'Ban user agar tidak bisa akses bot',
  category: 'owner',
  async run(ctx, { db }) {
    // Inisialisasi struktur jika belum ada
    if (!db.data) db.data = {};
    if (!db.data.users) db.data.users = [];

    if (!ctx.from || !ctx.args[0]) {
      return ctx.reply('Format: /banuser username');
    }
    const inputUsername = ctx.args[0].replace(/^@/, '').toLowerCase();
    const user = db.data.users.find(
      u => u.username && u.username.toLowerCase() === inputUsername
    );
    if (!user) {
      return ctx.reply(`❌ User dengan username ${ctx.args[0]} tidak ditemukan!`);
    }
    user.banned = true;
    db.save();
    ctx.reply(`✅ User ${ctx.args[0]} berhasil dibanned.`);
  }
};