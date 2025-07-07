const dns = require('dns').promises;
const { checkLimitAndPermission } = require('../../core/limitHandler');

async function getEmailInfo(email) {
  const info = {};
  
  // Parse email parts
  const parts = {
    domainAll: email.split('@')[1],
    name: email.split('@')[0],
    domain: (email.match(/@([^@.]+)\./) || [])[1],
    tld: `.${email.split('.').pop()}`
  };

  try {
    const mxRecords = await dns.resolveMx(parts.domainAll);
    info.mxServers = mxRecords.map(record => record.exchange);
    info.googleWorkspace = info.mxServers.some(server => server.includes('google.com'));
    info.microsoft365 = info.mxServers.some(server => server.includes('outlook.com'));
  } catch (error) {
    info.mxServers = null;
  }

  try {
    const spfRecords = await dns.resolveTxt(parts.domainAll);
    info.spfRecords = spfRecords.flat().filter(record => record.includes('v=spf1'));
  } catch (error) {
    info.spfRecords = null;
  }

  try {
    const dmarcRecords = await dns.resolveTxt(`_dmarc.${parts.domainAll}`);
    info.dmarcRecords = dmarcRecords.flat();
  } catch (error) {
    info.dmarcRecords = null;
  }

  return { info, ...parts };
}

// Add helper function for escaping special characters
function escapeMarkdown(text) {
  return text.toString().replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

module.exports = {
  name: 'cekmail1',
  desc: 'Cek informasi detail email (2 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 2;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    
    if (!check.canUse) {
      return ctx.reply(check.message);
    }
    
    const user = check.user;
    const email = ctx.args[0];

    if (!email || !email.includes('@') || !email.includes('.')) {
      return ctx.reply("```" + "⚠️ Format salah!\n\nContoh: /cekmail1 email@domain.com" + "```", {
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
    }

    const processingMsg = await ctx.reply("```" + "🔍 Mengecek informasi email...\n\nHarap tunggu sebentar" + "```", {
      parse_mode: "MarkdownV2"
    });

    try {
      const { info, domainAll, domain, tld, name } = await getEmailInfo(email);
      
      let message = `INFORMASI EMAIL\n\n`;
      message += `📧 EMAIL\n`;
      message += `Email: ${email}\n`;
      message += `Username: ${name}\n`;
      message += `Domain: ${domain}\n`;
      message += `TLD: ${tld}\n`;
      message += `Full Domain: ${domainAll}\n\n`;

      message += `🖥️ SERVER INFO\n`;
      if (info.mxServers) {
        message += `Mail Servers:\n${info.mxServers.join('\n')}\n\n`;
      } else {
        message += `Mail Servers: Tidak ditemukan\n\n`;
      }

      message += `🔒 KEAMANAN\n`;
      if (info.spfRecords) {
        message += `SPF Records:\n${info.spfRecords.join('\n')}\n\n`;
      } else {
        message += `SPF Records: Tidak ditemukan\n\n`;
      }

      if (info.dmarcRecords) {
        message += `DMARC Records:\n${info.dmarcRecords.join('\n')}\n\n`;
      } else {
        message += `DMARC Records: Tidak ditemukan\n\n`;
      }

      message += `💼 WORKSPACE\n`;
      if (info.googleWorkspace) {
        message += `Google Workspace: Ya\n`;
      } else if (info.microsoft365) {
        message += `Microsoft 365: Ya\n`;
      } else {
        message += `Workspace: Tidak terdeteksi\n`;
      }

      message += `\n🕒 Waktu: ${new Date().toLocaleString('id-ID')}`;
      message += !check.isOwner 
        ? `\n💫 Limit: ${user.limit} (-${requiredLimit})`
        : `\n👑 Owner Mode: No Limit`;
      message += `\n🤖 Bot by: @Toretinyy`;

      // Delete processing message
      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (error) {
        console.error('Failed to delete processing message:', error);
      }

      // Send result
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
      console.error('Error checking email:', error);
      
      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (deleteError) {
        console.error('Failed to delete processing message:', deleteError);
      }
      
      await ctx.reply('❌ *Terjadi kesalahan*\n\nSilakan coba lagi nanti\\.', {
        parse_mode: 'MarkdownV2',
        reply_to_message_id: ctx.message.message_id
      });
    }
  }
};