const fetch = require('node-fetch');
const { checkLimitAndPermission } = require('../../core/limitHandler');

// Helper escape MarkdownV2
function escapeMarkdown(text) {
  return String(text || '').replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// Scraper Google Images terbaru
const googleSearchImage = async (query) => {
  if (!query) throw Error(`kata pencarian tidak boleh kosong`);
  const usp = {
    "as_st": "y",
    "as_q": query,
    "as_epq": "",
    "as_oq": "",
    "as_eq": "",
    "imgsz": "l",
    "imgar": "",
    "imgcolor": "",
    "imgtype": "jpg",
    "cr": "",
    "as_sitesearch": "",
    "as_filetype": "",
    "tbs": "",
    "udm": "2"
  };

  const headers = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
  };

  const response = await fetch("https://www.google.com/search?" + new URLSearchParams(usp).toString(), {
    headers
  });

  if (!response.ok) throw Error(`gagal hit api ${response.status} ${response.statusText}\n${await response.text() || null}`);

  const html = await response.text();
  const match = html.match(/var m=(.*?);var a=m/)?.[1] || null;
  if (!match) throw Error("no match found!");
  const json = JSON.parse(match);
  const images = Object.entries(json).filter(v => v[1]?.[1]?.[3]?.[0]).map(v =>
    ({
      title: v[1]?.[1]?.[25]?.[2003]?.[3] || null,
      imageUrl: v[1][1][3][0] || null,
      height: v[1][1][3][1] || null,
      width: v[1][1][3][2] || null,
      imageSize: v[1]?.[1]?.[25]?.[2000]?.[2] || null,
      referer: v[1]?.[1]?.[25]?.[2003]?.[2] || null,
      aboutUrl: v[1]?.[1]?.[25]?.[2003]?.[33] || null
    })
  );

  if (!images.length) throw Error(`hasil pencarian ${query} kosong.`);
  images.pop(); // buang element akhir
  return { total: images.length, images };
};

module.exports = {
  name: 'searchimg',
  desc: 'Cari gambar Google Images by kata kunci (5 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 5;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    if (!check.canUse) return ctx.reply(check.message);

    // Ambil query dari argumen
    const query = ctx.args?.join(' ') || '';
    if (!query) {
      return ctx.reply(escapeMarkdown('⚠️ Format salah!\n\nContoh: /cekimg2 furina fanart'), {
        parse_mode: 'MarkdownV2'
      });
    }

    const processingMsg = await ctx.reply(escapeMarkdown('🔍 Mencari gambar di Google Images...'), {
      parse_mode: 'MarkdownV2'
    });

    try {
      const result = await googleSearchImage(query);

      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}

      if (!result.images || result.images.length === 0) {
        return ctx.reply(escapeMarkdown('❌ Tidak ditemukan hasil pencarian.'), {
          parse_mode: 'MarkdownV2'
        });
      }

      await ctx.reply(escapeMarkdown(`🎯 Ditemukan ${result.images.length} hasil untuk "${query}":`), {
        parse_mode: 'MarkdownV2'
      });

      for (let i = 0; i < Math.min(result.images.length, 5); i++) {
        const img = result.images[i];
        let caption = `*Hasil ${i + 1}:*\n`;
        caption += `📝 ${escapeMarkdown(img.title || 'No title')}\n`;
        caption += img.aboutUrl ? `🔗 [Lihat Halaman](${img.aboutUrl})\n` : '';
        caption += img.referer ? `🌐 [Referer](${img.referer})\n` : '';
        caption += check.isOwner
          ? `\n👑 Owner Mode: No Limit`
          : `\n💫 Limit: ${check.user.limit} (-${requiredLimit})`;

        // Kirim gambar jika ada
        if (img.imageUrl) {
          try {
            await ctx.replyWithPhoto(img.imageUrl, {
              caption,
              parse_mode: 'Markdown'
            });
          } catch {
            await ctx.reply(`${caption}\n🖼️ [Lihat Gambar](${img.imageUrl})`, {
              parse_mode: 'Markdown'
            });
          }
        } else {
          await ctx.reply(caption, { parse_mode: 'Markdown' });
        }
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