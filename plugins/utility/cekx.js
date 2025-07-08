const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const { checkLimitAndPermission } = require('../../core/limitHandler');

// Helper escape MarkdownV2
function escapeMarkdown(text) {
  return String(text || '').replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

class Twitter {
  constructor(username) {
    this.username = username;
  }

  flatten(tweet) {
    const { user, ...rest } = tweet;
    const flatUser = {};
    if (user && typeof user === 'object') {
      for (const key in user) {
        flatUser[`user_${key}`] = user[key];
      }
    }
    return { ...rest, ...flatUser };
  }

  async stalkNow() {
    const jar = new CookieJar();
    const client = wrapper(axios.create({
      jar,
      withCredentials: true
    }));

    await client.get("https://twitterviewer.net");

    const dataBody = { username: this.username };
    const headers = {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    };

    const { data } = await client.post("https://twitterviewer.net/api/get-user", dataBody, headers);
    const { data: tweetss } = await client.post("https://twitterviewer.net/api/get-user-tweets", dataBody, headers);

    return {
      ...data,
      tweets: tweetss.tweets.map(this.flatten)
    };
  }
}

module.exports = {
  name: 'cekx',
  desc: 'Cek profil & tweet X (Twitter) (5 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 5;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    if (!check.canUse) return ctx.reply(check.message);

    const username = ctx.args?.[0]?.replace(/^@/, '');
    if (!username) {
      return ctx.reply(escapeMarkdown('⚠️ Format salah!\n\nContoh: /cekx username'), {
        parse_mode: 'MarkdownV2'
      });
    }

    const processingMsg = await ctx.reply(escapeMarkdown('🔍 Mengambil data X (Twitter)...'), {
      parse_mode: 'MarkdownV2'
    });

    try {
      const twitter = new Twitter(username);
      const data = await twitter.stalkNow();

      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}

      // Perbaiki pengecekan data
      if (!data || !(data.screen_name || data.username || data.name)) {
        return ctx.reply(escapeMarkdown('❌ Tidak ditemukan data untuk username tersebut.'), {
          parse_mode: 'MarkdownV2'
        });
      }

      // Kirim foto profil jika ada
      if (data.profile_image_url_https) {
        await ctx.replyWithPhoto(data.profile_image_url_https, {
          caption: escapeMarkdown(`👤 Profil X (Twitter) @${data.screen_name || data.username || username}`),
          parse_mode: 'MarkdownV2'
        });
      }

      let msg = `*👤 Profil X (Twitter)*\n\n`;
      msg += `*Username*: @${escapeMarkdown(data.screen_name || data.username || username)}\n`;
      msg += `*Nama*: ${escapeMarkdown(data.name || '-')}\n`;
      msg += `*Bio*: ${escapeMarkdown(data.description || data.bio || '-')}\n`;
      msg += `*Followers*: ${escapeMarkdown(String(data.followers_count || data.followers || 0))}\n`;
      msg += `*Following*: ${escapeMarkdown(String(data.friends_count || data.following || 0))}\n`;
      msg += `*Verified*: ${escapeMarkdown(String(data.verified || data.user_is_blue_verified || false))}\n`;
      msg += `*Link*: https://x.com/${escapeMarkdown(data.screen_name || data.username || username)}\n`;

      msg += check.isOwner
        ? `\n👑 Owner Mode: No Limit`
        : `\n💫 Limit: ${check.user.limit} (\\- ${requiredLimit})`;

      await ctx.reply('```\n' + msg + '\n```', { parse_mode: 'MarkdownV2' });

      // Kirim 3 tweet terbaru (jika ada)
      if (data.tweets && data.tweets.length > 0) {
        for (let i = 0; i < Math.min(data.tweets.length, 3); i++) {
          const t = data.tweets[i];
          let tweetMsg = `*Tweet #${i + 1}*\n`;
          tweetMsg += `🗓️ ${escapeMarkdown(t.created_at || '-')}\n`;
          tweetMsg += `💬 ${escapeMarkdown(t.full_text || t.text || '-')}\n`;
          tweetMsg += `❤️ ${escapeMarkdown(String(t.favorite_count || 0))}   🔁 ${escapeMarkdown(String(t.retweet_count || 0))}\n`;
          tweetMsg += `🔗 https://x.com/${escapeMarkdown(data.screen_name || data.username || username)}/status/${escapeMarkdown(t.rest_id || t.id_str || t.id || '-')}`;
          await ctx.reply('```\n' + tweetMsg + '\n```', { parse_mode: 'MarkdownV2' });
        }
      }

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