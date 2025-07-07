module.exports = {
  name: 'register',
  desc: 'Daftar sebagai pengguna',
  category: 'user',
  async run(ctx, { db }) {
    const data = db.list();
    const id = ctx.senderId;

    if (data.user[id] && data.user[id].register) {
      return ctx.reply(`🧩 Kamu sudah terdaftar sebelumnya`);
    }

    data.user[id] = {
      name: ctx.username,
      limit: 30,
      register: true,
      premium: { status: false, expired: 0 },
      banned: { status: false, expired: 0 }
    };

    await db.save();
    return ctx.reply(`👋🏻 Yeay! Registrasi berhasil~\nHalo ${ctx.username}, selamat datang!`);
  }
};