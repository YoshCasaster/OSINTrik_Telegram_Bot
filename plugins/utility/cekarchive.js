const axios = require('axios');
const { checkLimitAndPermission } = require('../../core/limitHandler');


function escapeMarkdown(text) {
  return String(text || '').replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// Fungsi pencarian archive.org
async function Searching(search) {
  const url = `https://web.archive.org/__wb/search/anchor?q=${encodeURIComponent(search)}`;
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
    }
  });
  return response.data;
}

module.exports = {
  name: 'cekarchive',
  desc: 'Cari arsip website di archive.org (5 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 5;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    if (!check.canUse) return ctx.reply(check.message);

   
    const query = ctx.args?.join(' ') || '';
    if (!query) {
      return ctx.reply(escapeMarkdown('⚠️ Format salah!\n\nContoh: /cekarchive kominfo'), {
        parse_mode: 'MarkdownV2'
      });
    }

    const processingMsg = await ctx.reply(escapeMarkdown('🔍 Mencari arsip di archive.org...'), {
      parse_mode: 'MarkdownV2'
    });

    try {
      const data = await Searching(query);

      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}

      if (!data?.results || data.results.length === 0) {
        return ctx.reply(escapeMarkdown('❌ Tidak ditemukan hasil arsip.'), {
          parse_mode: 'MarkdownV2'
        });
      }

      await ctx.reply(escapeMarkdown(`🎯 Ditemukan ${data.results.length} arsip untuk "${query}":`), {
        parse_mode: 'MarkdownV2'
      });

      for (let i = 0; i < Math.min(data.results.length, 5); i++) {
        const item = data.results[i];
        let caption = `*Hasil ${i + 1}:*\n`;
        caption += `🔗 [${escapeMarkdown(item.display_url || item.url)}](https://web.archive.org${item.url})\n`;
        if (item.timestamp) caption += `🕒 ${escapeMarkdown(item.timestamp)}\n`;
        if (item.title) caption += `📝 ${escapeMarkdown(item.title)}\n`;
        caption += check.isOwner
          ? `\n👑 Owner Mode: No Limit`
          : `\n💫 Limit: ${check.user.limit} (-${requiredLimit})`;

        await ctx.reply(caption, { parse_mode: 'MarkdownV2' });
        await new Promise(r => setTimeout(r, 1000));
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