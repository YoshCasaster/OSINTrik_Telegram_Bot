const axios = require('axios');
const cheerio = require('cheerio');
const { checkLimitAndPermission } = require('../../core/limitHandler');

async function checkDataBreach(email) {
  try {
    const url = 'https://periksadata.com/';
    const formData = new URLSearchParams();
    formData.append('email', email);

    const response = await axios.post(url, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const info = $('.text-center.col-md-6.col-lg-5 > div > h2').text();
    
    if (info === 'WAH SELAMAT!') {
      return [];
    }

    const breaches = [];
    $('div.col-md-6').each((i, element) => {
      try {
        const img = $(element).find('div > div > img').attr('src');
        const title = $(element).find('div.feature__body > h5').text().trim();
        const boldElements = $(element).find('div.feature__body > p > b');
        
        if (boldElements.length >= 3) {
          const date = $(boldElements[0]).text().trim();
          const breachedData = $(boldElements[1]).text().trim();
          const totalBreach = $(boldElements[2]).text().trim();

          breaches.push({
            img,
            title,
            date,
            breached_data: breachedData,
            total_breach: totalBreach
          });
        }
      } catch (error) {
        console.error('Error parsing breach data:', error);
      }
    });

    return breaches;
  } catch (error) {
    console.error('Error checking data breach:', error);
    throw error;
  }
}

module.exports = {
  name: 'cekbocor',
  desc: 'Cek kebocoran data email (8 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 8;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);

    if (!check.canUse) {
      return ctx.reply(check.message);
    }

    const user = check.user;
    const email = ctx.message.text.split(' ').slice(1).join(' ');

    if (!email || !email.includes('@')) {
      return ctx.reply("```" + "⚠️ Format salah!\n\nContoh: /cekbocor email@domain.com" + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }

    const processingMsg = await ctx.reply("```" + "🔍 Memeriksa kebocoran data...\n\nHarap tunggu sebentar" + "```", {
      parse_mode: "MarkdownV2"
    });

    try {
      const breaches = await checkDataBreach(email);
      const perPage = 3;
      const totalPages = Math.ceil(breaches.length / perPage);

      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}

      if (breaches.length === 0) {
        await ctx.reply("```" +
          `📊 HASIL CEK KEBOCORAN DATA\n\n` +
          `📧 Email: ${email}\n\n` +
          `✅ SELAMAT! Email Anda tidak ditemukan dalam kebocoran data.\n` +
          (check.isOwner
            ? `👑 Owner Mode: No Limit`
            : `💫 Limit: ${user.limit} (-${requiredLimit})`)
          + "```", {
          parse_mode: "MarkdownV2",
          reply_to_message_id: ctx.message.message_id
        });
      } else {
        for (let page = 1; page <= totalPages; page++) {
          const start = (page - 1) * perPage;
          const end = start + perPage;
          const currentBreaches = breaches.slice(start, end);

          let message = `📊 HASIL CEK KEBOCORAN DATA\n\n`;
          message += `📧 Email: ${email}\n\n`;
          message += `⚠️ Ditemukan dalam ${breaches.length} kebocoran data:\n\n`;
          currentBreaches.forEach((breach, index) => {
            message += `🔴 Kebocoran #${start + index + 1}\n`;
            message += `• Sumber: ${breach.title}\n`;
            message += `• Tanggal: ${breach.date}\n`;
            message += `• Data: ${breach.breached_data}\n`;
            message += `• Total: ${breach.total_breach}\n\n`;
          });
          message += `Halaman ${page} dari ${totalPages}\n\n`;
          message += check.isOwner
            ? `👑 Owner Mode: No Limit`
            : `💫 Limit: ${user.limit} (-${requiredLimit})`;

          await ctx.reply("```" + message + "```", {
            parse_mode: "MarkdownV2",
            reply_to_message_id: ctx.message.message_id
          });
        }
      }

      if (!check.isOwner) {
        user.limit -= requiredLimit;
        await db.save();
      }

    } catch (error) {
      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}
      await ctx.reply("```" + "❌ Terjadi kesalahan\n\nSilakan coba lagi nanti" + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }
  }
};