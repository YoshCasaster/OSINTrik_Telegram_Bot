module.exports = {
  name: 'ping',
  desc: 'Cek respon bot',
  category: 'utility',
  async run(ctx, { db }) {
    const name = ctx.username || 'User';
    db.list().user[ctx.senderId].register = true
    await ctx.reply(`Pong! Hai ${name}, bot aktif!`);
  }
};