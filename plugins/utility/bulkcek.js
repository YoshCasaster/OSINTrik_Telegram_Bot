const axios = require('axios');
const cheerio = require('cheerio');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const { checkLimitAndPermission } = require('../../core/limitHandler');


function escapeMarkdown(text) {
  return String(text || '').replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}


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


async function tiktokStalk(username) {
  const response = await axios.get(`https://arincy.vercel.app/api/ttstalk?username=${username}`, {
    timeout: 10000
  });

  if (!response.data.status || !response.data.data) {
    throw new Error('User tidak ditemukan atau data tidak tersedia.');
  }

  return response.data.data;
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
  name: 'bulksearch',
  desc: 'Cari username di 3 platform (Instagram, TikTok, X/Twitter) - 10 limit',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 10;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    if (!check.canUse) return ctx.reply(check.message);

    const username = ctx.args?.[0]?.replace(/^@/, '');
    if (!username) {
      return ctx.reply(escapeMarkdown('⚠️ Format salah!\n\nContoh: /bulksearch username'), {
        parse_mode: 'MarkdownV2'
      });
    }

    const processingMsg = await ctx.reply(escapeMarkdown('🔍 Mencari di 3 platform (Instagram, TikTok, X/Twitter)...\n\nHarap tunggu sebentar...'), {
      parse_mode: 'MarkdownV2'
    });

    const results = {
      instagram: null,
      tiktok: null,
      twitter: null,
      errors: []
    };

  
    const searches = [
      // Instagram
      igStalk(username).then(data => {
        results.instagram = data;
      }).catch(err => {
        results.errors.push(`Instagram: ${err.message}`);
      }),

      // TikTok
      tiktokStalk(username).then(data => {
        results.tiktok = data;
      }).catch(err => {
        results.errors.push(`TikTok: ${err.message}`);
      }),

      // Twitter/X
      new Twitter(username).stalkNow().then(data => {
        results.twitter = data;
      }).catch(err => {
        results.errors.push(`Twitter/X: ${err.message}`);
      })
    ];


    await Promise.allSettled(searches);

    try {
      await ctx.deleteMessage(processingMsg.message_id);
    } catch {}


    let summaryMsg = `🔍 *BULK SEARCH RESULTS*\n`;
    summaryMsg += `👤 Username: @${escapeMarkdown(username)}\n`;
    summaryMsg += `📊 Platform ditemukan: ${[results.instagram, results.tiktok, results.twitter].filter(Boolean).length}/3\n\n`;


    summaryMsg += `📱 *Status Platform:*\n`;
    summaryMsg += `• Instagram: ${results.instagram ? '✅ Ditemukan' : '❌ Tidak ditemukan'}\n`;
    summaryMsg += `• TikTok: ${results.tiktok ? '✅ Ditemukan' : '❌ Tidak ditemukan'}\n`;
    summaryMsg += `• Twitter/X: ${results.twitter ? '✅ Ditemukan' : '❌ Tidak ditemukan'}\n\n`;

  
    if (results.errors.length > 0) {
      summaryMsg += `⚠️ *Errors:*\n`;
      results.errors.forEach(error => {
        summaryMsg += `• ${escapeMarkdown(error)}\n`;
      });
      summaryMsg += `\n`;
    }

    summaryMsg += check.isOwner
      ? `👑 Owner Mode: No Limit`
      : `💫 Limit: ${check.user.limit} (\\- ${requiredLimit})`;

    await ctx.reply('```\n' + summaryMsg + '\n```', { parse_mode: 'MarkdownV2' });


    if (results.instagram && results.instagram.username) {
      let igMsg = `📸 *INSTAGRAM PROFILE*\n\n`;
      igMsg += `👤 Username: @${escapeMarkdown(results.instagram.username)}\n`;
      igMsg += `📮 Posts: ${escapeMarkdown(results.instagram.stats.posts || '0')}\n`;
      igMsg += `👥 Followers: ${escapeMarkdown(results.instagram.stats.followers || '0')}\n`;
      igMsg += `👣 Following: ${escapeMarkdown(results.instagram.stats.following || '0')}\n`;
      igMsg += `📝 Bio: ${escapeMarkdown(results.instagram.bio || '-')}\n`;
      igMsg += `🔗 Link: https://instagram.com/${escapeMarkdown(results.instagram.username)}`;

      if (results.instagram.avatar) {
        await ctx.replyWithPhoto(results.instagram.avatar, {
          caption: '```\n' + igMsg + '\n```',
          parse_mode: 'MarkdownV2'
        });
      } else {
        await ctx.reply('```\n' + igMsg + '\n```', { parse_mode: 'MarkdownV2' });
      }
    }


    if (results.tiktok && results.tiktok.user) {
      const user = results.tiktok.user;
      const stats = results.tiktok.stats || {};
      
      let ttMsg = `🎵 *TIKTOK PROFILE*\n\n`;
      ttMsg += `👤 Username: @${escapeMarkdown(user.uniqueId || username)}\n`;
      ttMsg += `📛 Nama: ${escapeMarkdown(user.nickname || '-')}\n`;
      ttMsg += `✅ Verified: ${user.verified ? 'Ya' : 'Tidak'}\n`;
      ttMsg += `🔐 Private: ${user.privateAccount || user.secret ? 'Ya' : 'Tidak'}\n`;
      ttMsg += `👥 Followers: ${escapeMarkdown(stats.followerCount?.toLocaleString('id-ID') || '0')}\n`;
      ttMsg += `❤️ Likes: ${escapeMarkdown(stats.heartCount?.toLocaleString('id-ID') || '0')}\n`;
      ttMsg += `🎥 Videos: ${escapeMarkdown(stats.videoCount?.toLocaleString('id-ID') || '0')}\n`;
      ttMsg += `📝 Bio: ${escapeMarkdown(user.signature || '-')}\n`;
      ttMsg += `🔗 Link: https://www.tiktok.com/@${escapeMarkdown(user.uniqueId || username)}`;

      const avatarUrl = user.avatarLarger || user.avatarMedium || user.avatarThumb;
      if (avatarUrl) {
        await ctx.replyWithPhoto({ url: avatarUrl }, {
          caption: '```\n' + ttMsg + '\n```',
          parse_mode: 'MarkdownV2'
        });
      } else {
        await ctx.reply('```\n' + ttMsg + '\n```', { parse_mode: 'MarkdownV2' });
      }
    }

    if (results.twitter && (results.twitter.screen_name || results.twitter.username || results.twitter.name)) {
      let xMsg = `🐦 *X (TWITTER) PROFILE*\n\n`;
      xMsg += `👤 Username: @${escapeMarkdown(results.twitter.screen_name || results.twitter.username || username)}\n`;
      xMsg += `📛 Nama: ${escapeMarkdown(results.twitter.name || '-')}\n`;
      xMsg += `📝 Bio: ${escapeMarkdown(results.twitter.description || results.twitter.bio || '-')}\n`;
      xMsg += `👥 Followers: ${escapeMarkdown(String(results.twitter.followers_count || results.twitter.followers || 0))}\n`;
      xMsg += `👣 Following: ${escapeMarkdown(String(results.twitter.friends_count || results.twitter.following || 0))}\n`;
      xMsg += `✅ Verified: ${escapeMarkdown(String(results.twitter.verified || results.twitter.user_is_blue_verified || 'Tidak'))}\n`;
      xMsg += `🔗 Link: https://x.com/${escapeMarkdown(results.twitter.screen_name || results.twitter.username || username)}`;

      if (results.twitter.profile_image_url_https) {
        await ctx.replyWithPhoto(results.twitter.profile_image_url_https, {
          caption: '```\n' + xMsg + '\n```',
          parse_mode: 'MarkdownV2'
        });
      } else {
        await ctx.reply('```\n' + xMsg + '\n```', { parse_mode: 'MarkdownV2' });
      }

      if (results.twitter.tweets && results.twitter.tweets.length > 0) {
        const t = results.twitter.tweets[0];
        let tweetMsg = `🐦 *Latest Tweet*\n\n`;
        tweetMsg += `🗓️ ${escapeMarkdown(t.created_at || '-')}\n`;
        tweetMsg += `💬 ${escapeMarkdown(t.full_text || t.text || '-')}\n`;
        tweetMsg += `❤️ ${escapeMarkdown(String(t.favorite_count || 0))}   🔁 ${escapeMarkdown(String(t.retweet_count || 0))}\n`;
        tweetMsg += `🔗 https://x.com/${escapeMarkdown(results.twitter.screen_name || results.twitter.username || username)}/status/${escapeMarkdown(t.rest_id || t.id_str || t.id || '-')}`;
        await ctx.reply('```\n' + tweetMsg + '\n```', { parse_mode: 'MarkdownV2' });
      }
    }

    if (!results.instagram && !results.tiktok && !results.twitter) {
      await ctx.reply(escapeMarkdown('❌ Username tidak ditemukan di semua platform!\n\nSilakan coba dengan username yang berbeda.'), {
        parse_mode: 'MarkdownV2'
      });
    }

    if (!check.isOwner) {
      check.user.limit -= requiredLimit;
      await db.save();
    }
  }
};