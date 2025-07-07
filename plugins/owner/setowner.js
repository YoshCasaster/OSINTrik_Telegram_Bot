const fs = require('fs');
const path = require('path');
const { isOwner } = require('../../core/owner');

module.exports = {
  name: 'setowner',
  desc: 'Set ID Telegram owner bot (khusus owner)',
  category: 'owner',
  async run(ctx, { db }) {
    const senderId = ctx.senderId;
    
    // Check if the user is the owner
    if (!isOwner(senderId)) {
      return ctx.reply('⚠️ Maaf, fitur ini hanya untuk owner bot!');
    }
    
    // Get command arguments
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length !== 1) {
      return ctx.reply('❌ Format salah! Gunakan: /setowner <id_telegram>');
    }
    
    const newOwnerId = args[0];
    
    // Validate that the ID is numeric
    if (!/^\d+$/.test(newOwnerId)) {
      return ctx.reply('❌ ID Telegram harus berupa angka!');
    }
    
    try {
      // Read the current config file
      const configPath = path.join(__dirname, '../../bot.config.js');
      let configContent = fs.readFileSync(configPath, 'utf8');
      
      // Replace the OWNER_ID value
      const newConfigContent = configContent.replace(
        /OWNER_ID: ['"].*['"]/,
        `OWNER_ID: '${newOwnerId}'`
      );
      
      // Write the updated config back to the file
      fs.writeFileSync(configPath, newConfigContent, 'utf8');
      
      return ctx.reply(`✅ Berhasil mengubah ID owner menjadi: ${newOwnerId}\n\nPerubahan akan berlaku setelah bot di-restart.`);
    } catch (error) {
      console.error('Error updating owner ID:', error);
      return ctx.reply(`❌ Terjadi kesalahan saat mengubah ID owner: ${error.message}`);
    }
  }
};
