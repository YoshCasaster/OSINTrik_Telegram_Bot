const axios = require('axios');
const { checkLimitAndPermission } = require('../../core/limitHandler');

module.exports = {
  name: 'cektiktok',
  desc: 'Cek profil TikTok (5 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 5;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    
    if (!check.canUse) {
      return ctx.reply(check.message);
    }
    
    const user = check.user;
    const username = ctx.args[0];

    if (!username) {
      return ctx.reply("```" + "⚠️ Format salah!\n\nContoh: /cektiktok username" + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }

    const processingMsg = await ctx.reply("```" + "🔍 Mengecek profil TikTok...\n\nHarap tunggu sebentar" + "```", {
      parse_mode: "MarkdownV2"
    });

    try {
      const response = await axios.get(`https://arincy.vercel.app/api/ttstalk?username=${username}`, {
        timeout: 10000
      });

      if (!response.data.status || !response.data.data) {
        throw new Error('User tidak ditemukan atau data tidak tersedia.');
      }

      const data = response.data.data;

      // Split message into basic info and detailed info
      let basicInfo = `🎯 TikTok Profile Stalker 🎯\n\n`;
      basicInfo += `👤 Username: ${data.user?.uniqueId || '-'}\n`;
      basicInfo += `📛 Nama: ${data.user?.nickname || '-'}\n`;
      basicInfo += `🆔 ID: ${data.user?.id || '-'}\n`;
      basicInfo += `✅ Terverifikasi: ${data.user?.verified ? 'Ya' : 'Tidak'}\n`;
      basicInfo += `🔐 Privat: ${data.user?.privateAccount || data.user?.secret ? 'Ya' : 'Tidak'}\n`;
      basicInfo += `🖊️ Bio: ${data.user?.signature || 'Tidak tersedia'}\n\n`;
      
      basicInfo += `📊 Statistik\n`;
      basicInfo += `- 👥 Pengikut: ${data.stats?.followerCount?.toLocaleString('id-ID') || '0'}\n`;
      basicInfo += `- 👤 Mengikuti: ${data.stats?.followingCount?.toLocaleString('id-ID') || '0'}\n`;
      basicInfo += `- ❤️ Likes: ${data.stats?.heartCount?.toLocaleString('id-ID') || '0'}\n`;
      basicInfo += `- 🎥 Video: ${data.stats?.videoCount?.toLocaleString('id-ID') || '0'}\n`;

      let detailedInfo = `📌 INFORMASI DETAIL\n\n`;
      detailedInfo += `🌍 Region: ${data.user?.region || '-'}\n`;
      detailedInfo += `📅 Dibuat: ${data.user?.createTime ? new Date(data.user.createTime * 1000).toLocaleDateString('id-ID') : '-'}\n`;
      detailedInfo += `🗣️ Bahasa: ${data.user?.language || '-'}\n\n`;
      
      // Add settings info
      detailedInfo += `⚙️ PENGATURAN\n`;
      detailedInfo += `💬 Komentar: ${data.user?.commentSetting || '-'}\n`;
      detailedInfo += `⬇️ Download: ${data.user?.downloadSetting || '-'}\n`;
      detailedInfo += `🤝 Duet: ${data.user?.duetSetting || '-'}\n`;
      detailedInfo += `✂️ Stitch: ${data.user?.stitchSetting || '-'}\n\n`;

      // Add stats V2
      detailedInfo += `📊 Statistik V2\n`;
      detailedInfo += `- 👥 Pengikut: ${data.statsV2?.followerCount || '0'}\n`;
      detailedInfo += `- ❤️ Likes: ${data.statsV2?.heartCount || '0'}\n`;
      detailedInfo += `- 🎥 Video: ${data.statsV2?.videoCount || '0'}\n\n`;

      // Add limit info
      detailedInfo += !check.isOwner 
        ? `💫 Limit: ${user.limit} (-${requiredLimit})`
        : `👑 Owner Mode: No Limit`;

      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (error) {
        console.error('Failed to delete processing message:', error);
      }

      // Send profile picture with basic info
      const avatarUrl = data.user?.avatarLarger || data.user?.avatarMedium || data.user?.avatarThumb;
      if (avatarUrl) {
        await ctx.replyWithPhoto({ url: avatarUrl }, {
          caption: "```" + basicInfo + "```",
          parse_mode: "MarkdownV2",
          reply_to_message_id: ctx.message.message_id
        });
      }

      // Send detailed info as separate message
      await ctx.reply("```" + detailedInfo + "```", {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔗 Buka Profil",
                url: `https://www.tiktok.com/@${data.user?.uniqueId}`
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
      console.error('Error checking TikTok:', error);
      
      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (deleteError) {
        console.error('Failed to delete processing message:', deleteError);
      }
      
      await ctx.reply("```" + "❌ Terjadi kesalahan\n\nUser tidak ditemukan atau server sedang bermasalah" + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }
  }
};