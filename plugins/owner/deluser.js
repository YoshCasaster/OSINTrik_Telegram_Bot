module.exports = {
  name: 'deluser',
  desc: 'Menghapus user dari database',
  category: 'owner',
  async run(ctx, { db }) {
    if (!ctx.from || !ctx.args[0]) {
      return ctx.reply('Format: /deluser username');
    }
    const inputUsername = ctx.args[0].replace(/^@/, '').toLowerCase();
    const idx = db.data.users.findIndex(
      u => u.username && u.username.toLowerCase() === inputUsername
    );
    if (idx === -1) {
      return ctx.reply(`❌ User dengan username ${ctx.args[0]} tidak ditemukan!`);
    }
    db.data.users.splice(idx, 1);
    db.save();
    ctx.reply(`✅ User ${ctx.args[0]} berhasil dihapus dari database.`);
  }
};