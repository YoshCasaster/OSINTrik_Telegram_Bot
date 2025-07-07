const os = require('os');
const { isOwner } = require('../../core/owner');
const { version } = require('../../package.json');

module.exports = {
  name: 'botstatus',
  desc: 'Lihat status bot (khusus owner)',
  category: 'owner',
  async run(ctx, { db }) {
    const senderId = ctx.senderId;
    
    // Check if the user is the owner
    if (!isOwner(senderId)) {
      return ctx.reply('⚠️ Maaf, fitur ini hanya untuk owner bot!');
    }
    
    try {
      // Get database statistics
      const data = db.list();
      const totalUsers = Object.keys(data.user).length;
      const registeredUsers = Object.values(data.user).filter(user => user.register).length;
      const totalGroups = Object.keys(data.group).length;
      
      // Get system information
      const uptime = formatUptime(os.uptime());
      const memory = formatMemoryUsage();
      const platform = `${os.type()} ${os.release()} (${os.platform()})`;
      const cpuModel = os.cpus()[0].model;
      const cpuCores = os.cpus().length;
      
      // Format the message
      const message = `
📊 *STATUS BOT OSINTRIX*

*INFORMASI BOT*
• Versi: v${version}
• Uptime: ${uptime}
• Platform: ${platform}
• CPU: ${cpuModel} (${cpuCores} cores)
• Memory: ${memory}

*STATISTIK DATABASE*
• Total User: ${totalUsers}
• User Terdaftar: ${registeredUsers}
• Total Grup: ${totalGroups}

*PLUGIN TERINSTALL*
• Total Plugin: ${ctx.commands.size}

*FITUR OSINT*
• cekewallet - Cek nomor di semua layanan e-wallet
• cekdpt - Cek data pemilih di KPU berdasarkan NIK
• cekpddikti - Cek data mahasiswa/dosen di PDDIKTI

*FITUR OWNER*
• addlimit - Tambah limit user
• listusers - Lihat daftar semua user
• setowner - Set ID Telegram owner bot
• botstatus - Lihat status bot

🤖 *Bot by:* @Toretinyy
      `.trim();
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error getting bot status:', error);
      return ctx.reply(`❌ Terjadi kesalahan saat mengambil status bot: ${error.message}`);
    }
  }
};

/**
 * Format uptime in a human-readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} - Formatted uptime
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  let result = '';
  if (days > 0) result += `${days}d `;
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  result += `${secs}s`;
  
  return result;
}

/**
 * Format memory usage in a human-readable format
 * @returns {string} - Formatted memory usage
 */
function formatMemoryUsage() {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  const total = os.totalmem() / 1024 / 1024;
  const free = os.freemem() / 1024 / 1024;
  
  return `${used.toFixed(2)} MB / ${total.toFixed(2)} MB (${free.toFixed(2)} MB free)`;
}
