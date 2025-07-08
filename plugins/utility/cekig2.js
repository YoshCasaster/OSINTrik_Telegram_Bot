const axios = require('axios');
const cheerio = require('cheerio');
const { checkLimitAndPermission } = require('../../core/limitHandler');

// Helper escape MarkdownV2
function escapeMarkdown(text) {
  return String(text || '').replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// Scraper IG stalk
async function igStalk(usn) {
  if (typeof usn !== "string") {
    throw new TypeError("Username is not a string. Please input a valid username.");
  }

  const { data } = await axios.get(`https://insta-stories-viewer.com/${usn}/`);
  const $ = cheerio.load(data);

  const avatar = $(".profile__avatar-pic").attr("src");
  const username = $(".profile__nickname").clone().children().remove().end().text().trim();
  const posts = $(".profile__stats-posts").text().trim();
  const followers = $(".profile__stats-followers").text().trim();
  const following = $(".profile__stats-follows").text().trim();
  const bio = $(".profile__description").text().trim();

  return {
    username,
    avatar,
    stats: {
      posts,
      followers,
      following
    },
    bio
  };
}

module.exports = {
  name: 'cekig2',
  desc: 'Cek profil Instagram (scrape, limit 5)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 5;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    if (!check.canUse) return ctx.reply(check.message);

    const usn = ctx.args?.[0]?.replace(/^@/, '');
    if (!usn) {
      return ctx.reply(escapeMarkdown('⚠️ Format salah!\n\nContoh: /cekig2 username'), {
        parse_mode: 'MarkdownV2'
      });
    }

    const processingMsg = await ctx.reply(escapeMarkdown('🔍 Mengambil data Instagram...'), {
      parse_mode: 'MarkdownV2'
    });

    try {
      const data = await igStalk(usn);

      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}

      if (!data || !data.username) {
        return ctx.reply(escapeMarkdown('❌ Tidak ditemukan data untuk username tersebut.'), {
          parse_mode: 'MarkdownV2'
        });
      }

      // Kirim foto profil jika ada
      if (data.avatar) {
        await ctx.replyWithPhoto(data.avatar, {
          caption: escapeMarkdown(`👤 Profil Instagram @${data.username}`),
          parse_mode: 'MarkdownV2'
        });
      }

     let msg = `👤 *Profil Instagram*\n\n`;
msg += `🔹 Username: @${escapeMarkdown(data.username)}\n`;
msg += `📸 Postingan: ${escapeMarkdown(data.stats.posts || '0')}\n`;
msg += `👥 Followers: ${escapeMarkdown(data.stats.followers || '0')}\n`;
msg += `👣 Mengikuti: ${escapeMarkdown(data.stats.following || '0')}\n`;
msg += `📝 Bio: ${escapeMarkdown(data.bio || '-')}\n`;
msg += `🔗 Link: https://instagram.com/${escapeMarkdown(data.username)}\n`;


      msg += check.isOwner
        ? `\n👑 Owner Mode: No Limit`
        : `\n💫 Limit: ${check.user.limit} (\\- ${requiredLimit})`;

      await ctx.reply('```\n' + msg + '\n```', { parse_mode: 'MarkdownV2' });

      if (!check.isOwner) {
        check.user.limit -= requiredLimit;
        await db.save();
      }
    } catch (err) {
      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}
      await ctx.reply(escapeMarkdown('❌ Terjadi kesalahan\n\n' + (err.message || 'Silakan coba lagi nanti')), {
        parse_mode: 'MarkdownV2'
      });
    }
  }
};