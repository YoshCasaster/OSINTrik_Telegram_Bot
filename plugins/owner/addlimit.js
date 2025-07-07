const { isOwner } = require('../../core/owner');

module.exports = {
  name: 'addlimit',
  desc: 'Tambah limit user (khusus owner)',
  category: 'owner',
  async run(ctx, { db }) {
    const senderId = ctx.senderId;
    
    // Check if the user is the owner
    if (!isOwner(senderId)) {
      return ctx.reply('⚠️ Maaf, fitur ini hanya untuk owner bot!');
    }
    
    // Get command arguments
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length !== 2) {
      return ctx.reply('❌ Format salah! Gunakan: /addlimit username jumlah');
    }
    
    const username = args[0];
    const amount = parseInt(args[1]);
    
    if (isNaN(amount)) {
      return ctx.reply('❌ Jumlah limit harus berupa angka!');
    }
    
    // Get all users
    const data = db.list();
    let targetUser = null;
    let targetUserId = null;
    
    // Find user by username
    for (const [userId, user] of Object.entries(data.user)) {
      if (user.name === username) {
        targetUser = user;
        targetUserId = userId;
        break;
      }
    }
    
    if (!targetUser) {
      return ctx.reply(`❌ User dengan username ${username} tidak ditemukan!`);
    }
    
    // Add limit to the user
    const oldLimit = targetUser.limit;
    targetUser.limit += amount;
    
    // Save changes
    await db.save();
    
    return ctx.reply(`✅ Berhasil menambahkan ${amount} limit ke ${username}!\n\nLimit sebelumnya: ${oldLimit}\nLimit sekarang: ${targetUser.limit}`);
  }
};
