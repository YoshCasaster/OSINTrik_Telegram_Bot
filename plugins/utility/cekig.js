const axios = require('axios');
const { checkLimitAndPermission } = require('../../core/limitHandler');

function escapeMarkdownV2(text) {
  return String(text || '-').replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

module.exports = {
  name: 'cekig',
  desc: 'Cek profil Instagram (4 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 4;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);

    if (!check.canUse) {
      return ctx.reply(check.message);
    }

    const user = check.user;
    const username = ctx.args[0]?.replace(/^@/, '').trim();

    if (!username) {
      return ctx.reply("```" + "⚠️ Format salah!\n\nContoh: /cekig username" + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }

    const processingMsg = await ctx.reply("```" + "🔍 Mengecek profil Instagram...\n\nHarap tunggu sebentar" + "```", {
      parse_mode: "MarkdownV2"
    });

    try {
      const response = await axios.get(`https://api.yogik.id/stalk/instagram?user=${encodeURIComponent(username)}`, {
        timeout: 10000
      });

      if (!response.data.status || !response.data.result) {
        throw new Error('User tidak ditemukan atau data tidak tersedia.');
      }

      const data = response.data.result;


      let basicInfo = `📸 Instagram Profile Stalker 📸\n\n`;
      basicInfo += `👤 Nama: ${escapeMarkdownV2(data.name)}\n`;
      basicInfo += `🔗 Username: ${escapeMarkdownV2(data.username)}\n`;
      basicInfo += `🖊️ Bio: ${escapeMarkdownV2(data.bio)}\n\n`;
      basicInfo += `📷 Post: ${escapeMarkdownV2(data.posts)}\n`;
      basicInfo += `👥 Followers: ${escapeMarkdownV2(data.followers)}\n`;
      basicInfo += `➡️ Following: ${escapeMarkdownV2(data.following)}\n`;


      let detailedInfo = `📌 INFORMASI DETAIL\n\n`;
      detailedInfo += `🔗 Username: ${escapeMarkdownV2(data.username)}\n`;
      detailedInfo += `🖊️ Bio: ${escapeMarkdownV2(data.bio)}\n`;
      detailedInfo += `📷 Post: ${escapeMarkdownV2(data.posts)}\n`;
      detailedInfo += `👥 Followers: ${escapeMarkdownV2(data.followers)}\n`;
      detailedInfo += `➡️ Following: ${escapeMarkdownV2(data.following)}\n\n`;
      detailedInfo += check.isOwner
        ? `👑 Owner Mode: No Limit`
        : `💫 Limit: ${user.limit} (-${requiredLimit})`;

      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (error) {
    
      }

  
      if (data.avatar) {
        await ctx.replyWithPhoto({ url: data.avatar }, {
          caption: "```" + basicInfo + "```",
          parse_mode: "MarkdownV2",
          reply_to_message_id: ctx.message.message_id
        });
      } else {
        await ctx.reply("```" + basicInfo + "```", {
          parse_mode: "MarkdownV2",
          reply_to_message_id: ctx.message.message_id
        });
      }

 h
      await ctx.reply("```" + detailedInfo + "```", {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔗 Buka Profil",
                url: `https://instagram.com/${username}`
              }
            ],
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
      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}
      await ctx.reply("```" + "❌ Terjadi kesalahan\n\nUser tidak ditemukan atau server sedang bermasalah" + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }
  }
};