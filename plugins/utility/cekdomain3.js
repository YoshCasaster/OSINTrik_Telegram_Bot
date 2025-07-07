const axios = require('axios');
const { checkLimitAndPermission } = require('../../core/limitHandler');

// Helper escape MarkdownV2
function escapeMarkdown(text) {
  return String(text || '').replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

module.exports = {
  name: 'cekdomain3',
  desc: 'Cek info domain/IP via ip-api.com (5 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 5;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    if (!check.canUse) return ctx.reply(check.message);

    // Ambil domain/IP dari argumen
    const query = ctx.args?.[0];
    if (!query) {
      return ctx.reply(escapeMarkdown('⚠️ Format salah!\n\nContoh: /cekdomain3 google.com'), {
        parse_mode: 'MarkdownV2'
      });
    }

    const processingMsg = await ctx.reply(escapeMarkdown('🔍 Mengecek domain/IP...'), {
      parse_mode: 'MarkdownV2'
    });

    try {
      const url = `http://ip-api.com/json/${encodeURIComponent(query)}`;
      const { data } = await axios.get(url);

      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}

      if (!data || data.status !== 'success') {
        return ctx.reply(escapeMarkdown('❌ Tidak ditemukan data untuk domain/IP tersebut.'), {
          parse_mode: 'MarkdownV2'
        });
      }

     let message = `🌐 HASIL CEK DOMAIN/IP\n\n`;
message += `💻 IP: ${escapeMarkdown(data.query || '-')}\n`;
message += `✅ Status: ${escapeMarkdown(data.status || '-')}\n`;
message += `📍 Region: ${escapeMarkdown(data.regionName || '-')}\n`;
message += `🌎 Country: ${escapeMarkdown(data.country || '-')}\n`;
message += `🏙️ City: ${escapeMarkdown(data.city || '-')}\n`;
message += `📡 ISP: ${escapeMarkdown(data.isp || '-')}\n`;
message += `🧭 Lat,Lon: ${escapeMarkdown(String(data.lat))}, ${escapeMarkdown(String(data.lon))}\n`;
message += `📮 ZIP Code: ${escapeMarkdown(data.zip || '-')}\n`;
message += `🕒 Timezone: ${escapeMarkdown(data.timezone || '-')}\n`;
message += `📶 AS: ${escapeMarkdown(data.as || '-')}\n`;


      message += check.isOwner
        ? `\n👑 Owner Mode: No Limit`
        : `\n💫 Limit: ${check.user.limit} (\\- ${requiredLimit})`;

      await ctx.reply('```\n' + message + '\n```', { parse_mode: 'MarkdownV2' });

      if (!check.isOwner) {
        check.user.limit -= requiredLimit;
        await db.save();
      }
    } catch (err) {
      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}
      await ctx.reply(escapeMarkdown('❌ Terjadi kesalahan saat mengakses data.'), {
        parse_mode: 'MarkdownV2'
      });
    }
  }
};