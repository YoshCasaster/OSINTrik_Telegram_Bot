const axios = require('axios');
const { checkLimitAndPermission, reduceLimit } = require('../../core/limitHandler');

module.exports = {
  name: 'cekdomain',
  desc: 'Cek informasi domain (5 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    // Check limit and permissions
    const requiredLimit = 5;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    
    if (!check.canUse) {
      return ctx.reply(check.message);
    }
    
    const user = check.user;

    // Get domain from command arguments
    const domain = ctx.args[0];
    if (!domain) {
      return ctx.reply('⚠️ Format salah!\n*Contoh:* /cekdomain nama.domain.com', {
        parse_mode: 'Markdown'
      });
    }

    // Send processing message
    const processingMsg = await ctx.reply('🔍 *Mencari informasi domain...*\n\nHarap tunggu sebentar.', { parse_mode: 'Markdown' });

    try {
      // Make the API request
      const response = await axios.get(`https://fastrestapis.fasturl.cloud/tool/iplookup?query=${domain}`, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.data || response.data.status !== 200) {
        throw new Error('Tidak ada hasil yang ditemukan untuk domain tersebut.');
      }

      const result = response.data.result;

      // Format nameservers if available
      const nameservers = Array.isArray(result.nameserver) 
        ? result.nameserver.join('\n') 
        : 'Tidak tersedia';

      // Format the message content
      let message = `HASIL CEK DOMAIN\n\n`;
      message += `📌 Domain: ${result.name || domain}\n`;
      message += `🔒 Status: ${result.status || 'Tidak tersedia'}\n`;
      message += `📅 Dibuat: ${result.created || 'Tidak tersedia'}\n`;
      message += `📅 Kedaluwarsa: ${result.expires || 'Tidak tersedia'}\n`;
      message += `🔄 Diperbarui: ${result.changed || 'Tidak tersedia'}\n\n`;
      
      message += `👤 REGISTRAR\n`;
      message += `Nama: ${result.registrar?.name || 'Tidak tersedia'}\n`;
      message += `Email: ${result.registrar?.email || 'Tidak tersedia'}\n`;
      message += `URL: ${result.registrar?.url || 'Tidak tersedia'}\n`;
      message += `Phone: ${result.registrar?.phone || 'Tidak tersedia'}\n\n`;
      
      message += `🖥️ SERVER INFO\n`;
      message += `Server: ${result.server || 'Tidak tersedia'}\n`;
      message += `IP Address: ${result.ips || 'Tidak tersedia'}\n`;
      message += `DNSSEC: ${result.dnssec || 'Tidak tersedia'}\n\n`;
      
      message += `🌐 NAMESERVERS\n`;
      message += `${nameservers}\n\n`;

      // Add owner location if available
      if (result.contacts?.owner?.[0]?.state && result.contacts?.owner?.[0]?.country) {
        message += `📍 LOCATION\n`;
        message += `State: ${result.contacts.owner[0].state}\n`;
        message += `Country: ${result.contacts.owner[0].country}\n\n`;
      }

      // Add limit info
      message += !check.isOwner 
        ? `\n💫 Limit: ${user.limit} (-${requiredLimit})`
        : `\n👑 Owner Mode: No Limit`;

      // Delete processing message
      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (error) {
        console.error('Failed to delete processing message:', error);
      }

      // Send formatted response
      await ctx.reply("```" + message + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🕵️ Menu OSINT",
                callback_data: "menu_osint"
              }
            ]
          ]
        }
      });

      // Reduce limit if not owner
      if (!check.isOwner) {
        user.limit -= requiredLimit;
        await db.save();
      }

    } catch (error) {
      console.error('Error checking domain:', error);
      
      let errorMessage = '❌ *Terjadi kesalahan*\n\n';
      
      if (error.message.includes('tidak ditemukan')) {
        errorMessage = '❌ Domain tidak ditemukan atau tidak terdaftar\\.';
      } else if (error.message.includes('timeout')) {
        errorMessage = '❌ Waktu permintaan habis\\. Server mungkin sedang sibuk\\.';
      } else {
        errorMessage += 'Terjadi kesalahan saat mencoba mengecek domain\\. Silakan coba lagi nanti\\.';
      }
      
      // Delete processing message
      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (deleteError) {
        console.error('Failed to delete processing message:', deleteError);
      }
      
      await ctx.reply(errorMessage, { 
        parse_mode: 'MarkdownV2',
        reply_to_message_id: ctx.message.message_id 
      });
    }
  }
};

// Helper function to escape special characters for MarkdownV2
function escapeMarkdown(text) {
  return text.toString().replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}