const axios = require('axios');
const { checkLimitAndPermission } = require('../../core/limitHandler');


const sites = {
  'Instagram': username => `https://www.instagram.com/${username}`,
  'Twitter': username => `https://twitter.com/${username}`,
  'Facebook': username => `https://www.facebook.com/${username}`,
  'GitHub': username => `https://github.com/${username}`,
  'LinkedIn': username => `https://www.linkedin.com/in/${username}`,
  'YouTube': username => `https://www.youtube.com/@${username}`,
  'TikTok': username => `https://www.tiktok.com/@${username}`,
  'Reddit': username => `https://www.reddit.com/user/${username}`,
  'Pinterest': username => `https://www.pinterest.com/${username}`,
  'Tumblr': username => `https://${username}.tumblr.com`,
  'Twitch': username => `https://www.twitch.tv/${username}`,
  'Medium': username => `https://medium.com/@${username}`,
  'DeviantArt': username => `https://www.deviantart.com/${username}`,
  'Behance': username => `https://www.behance.net/${username}`,
  'SoundCloud': username => `https://soundcloud.com/${username}`
};

async function checkUsername(username) {
  const results = [];
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  for (const [site, getUrl] of Object.entries(sites)) {
    try {
      await delay(Math.random() * 500 + 100);
      const response = await axios.get(getUrl(username), {
        timeout: 10000,
        validateStatus: status => status < 500,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      results.push({
        site,
        exists: response.status === 200,
        url: getUrl(username)
      });
    } catch (error) {
      console.error(`Error checking ${site}:`, error.message);
      results.push({
        site,
        exists: false,
        error: true,
        url: getUrl(username)
      });
    }
  }
  return results;
}

module.exports = {
  name: 'cekusername',
  desc: 'Cek username di berbagai platform (3 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 3;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    
    if (!check.canUse) {
      return ctx.reply(check.message);
    }
    
    const user = check.user;
    const username = ctx.args[0];

    if (!username) {
      return ctx.reply("```" + "⚠️ Format salah!\n\nContoh: /cekusername johndoe" + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      return ctx.reply("```" + "⚠️ Username tidak valid!\n\nHanya boleh mengandung huruf, angka, _, ., -" + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }

    const processingMsg = await ctx.reply("```" + `🔍 Mencari username di ${Object.keys(sites).length} platform...\n\nHarap tunggu sebentar` + "```", {
      parse_mode: "MarkdownV2"
    });

    try {
      const results = await checkUsername(username);
      
      let message = `HASIL PENCARIAN USERNAME\n\n`;
      message += `Username: ${username}\n\n`;
      
      const found = results.filter(r => r.exists);
      const notFound = results.filter(r => !r.exists && !r.error);
      const errors = results.filter(r => r.error);
      
      if (found.length > 0) {
        message += `✅ DITEMUKAN (${found.length})\n`;
        found.forEach(result => {
          message += `• ${result.site}\n`;
          message += `  ${result.url}\n`;
        });
        message += '\n';
      }

      if (notFound.length > 0) {
        message += `❌ TIDAK DITEMUKAN (${notFound.length})\n`;
        notFound.forEach(result => {
          message += `• ${result.site}\n`;
        });
        message += '\n';
      }

      if (errors.length > 0) {
        message += `⚠️ GAGAL CEK (${errors.length})\n`;
        errors.forEach(result => {
          message += `• ${result.site}\n`;
        });
        message += '\n';
      }

      message += !check.isOwner 
        ? `\n💫 Limit: ${user.limit} (-${requiredLimit})`
        : `\n👑 Owner Mode: No Limit`;
      
      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (error) {
        console.error('Failed to delete processing message:', error);
      }

      await ctx.reply("```" + message + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id,
        disable_web_page_preview: true,
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

      if (!check.isOwner) {
        user.limit -= requiredLimit;
        await db.save();
      }

    } catch (error) {
      console.error('Error in cekusername:', error);
      
      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (deleteError) {
        console.error('Failed to delete processing message:', deleteError);
      }
      
      await ctx.reply("```" + "❌ Terjadi kesalahan\n\nSilakan coba lagi nanti" + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }
  }
};