const axios = require('axios');
const { checkLimitAndPermission, reduceLimit } = require('../../core/limitHandler');

module.exports = {
  name: 'cekdomain2',
  desc: 'Cek detail domain dengan Whois & DNS (5 limit)',
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
      return ctx.reply('⚠️ Format salah!\n*Contoh:* /cekdomain2 domain.com', {
        parse_mode: 'Markdown'
      });
    }

    // Send processing message
    const processingMsg = await ctx.reply('🔍 *Mencari informasi detail domain...*\n\nHarap tunggu sebentar.', { 
      parse_mode: 'Markdown' 
    });

    try {
      // Make the API request
      const response = await axios.get(`https://fastrestapis.fasturl.cloud/tool/whois?domain=${domain}`, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.data || response.data.status !== 200) {
        throw new Error('Tidak ada hasil yang ditemukan untuk domain tersebut.');
      }

      const result = response.data.result;

      // Format the message content
      let message = `HASIL CEK DOMAIN DETAIL\n\n`;
      message += `📌 Domain: ${result.domain}\n`;
      message += `🌐 IP Address: ${result.ip_addresses?.join(', ') || 'Tidak tersedia'}\n\n`;

      // DNS Records
      message += `🔍 DNS RECORDS\n`;
      const dns = result.dns_records;
      message += `A Record: ${dns.A?.join(', ') || 'Tidak ada'}\n`;
      message += `AAAA Record: ${Array.isArray(dns.AAAA) ? dns.AAAA.join(', ') : 'Tidak ada'}\n`;
      message += `MX Record: ${Array.isArray(dns.MX) ? dns.MX.join(', ') : 'Tidak ada'}\n`;
      message += `TXT Record: ${Array.isArray(dns.TXT) ? dns.TXT.join(', ') : 'Tidak ada'}\n\n`;

      // Nameservers
      message += `🌐 NAMESERVERS\n`;
      if (result.nameservers && result.nameservers.length > 0) {
        result.nameservers.forEach(ns => {
          message += `${ns}\n`;
        });
      } else {
        message += 'Tidak ada nameserver\n';
      }
      message += '\n';

      // SSL/TLS Info if available
      if (result.ssl_tls_info?.certificate) {
        const cert = result.ssl_tls_info.certificate;
        message += `🔒 SSL/TLS INFO\n`;
        message += `Issuer: ${cert.issuer[1]?.[0]?.[1] || 'Tidak tersedia'}\n`;
        message += `Valid Until: ${cert.notAfter || 'Tidak tersedia'}\n`;
        message += `Protocol: ${result.ssl_tls_info.protocol || 'Tidak tersedia'}\n\n`;
      }

      // Reverse DNS
      if (result.reverse_dns && result.reverse_dns.length > 0) {
        message += `🔄 REVERSE DNS\n`;
        result.reverse_dns.forEach(rdns => {
          message += `IP: ${rdns.ip}\n`;
          message += `Hostname: ${rdns.hostnames.join(', ')}\n`;
        });
        message += '\n';
      }

      // Headers info
      message += `🖥️ SERVER INFO\n`;
      message += `Server: ${result.headers?.server || 'Tidak tersedia'}\n`;
      message += `Cache Control: ${result.headers?.cache_control || 'Tidak tersedia'}\n\n`;

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
      
      if (error.code === 'ENOTFOUND') {
        errorMessage = '❌ Koneksi ke server gagal\\. Silakan coba lagi nanti\\.';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = '❌ Waktu koneksi habis\\. Server mungkin sedang sibuk\\.';
      } else if (error.response?.status === 404) {
        errorMessage = '❌ Domain tidak ditemukan atau tidak terdaftar\\.';
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