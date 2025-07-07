const { chromium } = require('playwright');
const { checkLimitAndPermission } = require('../../core/limitHandler');

module.exports = {
  name: 'cekfb',
  desc: 'Cek akun Facebook by nomor/email (5 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 5;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);

    if (!check.canUse) {
      return ctx.reply(check.message);
    }

    const user = check.user;
    const input = ctx.args[0];

    if (!input) {
      return ctx.reply("```" + "⚠️ Format salah!\n\nContoh: /cekfb 628xxxxxxxxxx atau /cekfb email@gmail.com" + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }


    if (!/^(\+?62\d{9,13}|[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)$/.test(input)) {
      return ctx.reply("```" + "⚠️ Format nomor/email tidak valid!" + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }

    const processingMsg = await ctx.reply("```" + "🔍 Mencari akun Facebook...\n\nHarap tunggu sebentar" + "```", {
      parse_mode: "MarkdownV2"
    });

    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('https://web.facebook.com/login/identify?ctx=recover', { timeout: 30000 });
      await page.waitForSelector('#identify_email');
      await page.fill('#identify_email', input);
      await page.click('#did_submit');
      await page.waitForTimeout(4000);

      let message = `🔍 HASIL CEK FACEBOOK\n\n`;
      message += `🔢 Input: ${input}\n\n`;


      const errorElement = await page.$('div._9o4h');
      if (errorElement) {
        message += `❌ Hasil: Tidak ditemukan akun\n`;
        message += `ℹ️ Tidak ada akun terkait input ini.`;
        try { await ctx.deleteMessage(processingMsg.message_id); } catch {}
        return await ctx.reply("```" + message + "```", {
          parse_mode: "MarkdownV2",
          reply_to_message_id: ctx.message.message_id
        });
      }


      let name = '-';
      let photoUrl = null;


      const nameElement = await page.$('.uiHeaderTitle, .uiHeader');
      if (nameElement) {
        name = (await nameElement.textContent()).trim();
      }

      const imgElement = await page.$('img[src*="profile/pic.php"]');
      if (imgElement) {
        photoUrl = await imgElement.getAttribute('src');
      }

      message += `✅ Hasil: Ditemukan akun\n`;
      message += `${name}\n`;
      message += !check.isOwner
        ? `\n💫 Limit: ${user.limit} (-${requiredLimit})`
        : `\n👑 Owner Mode: No Limit`;

      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}

      if (photoUrl) {
        await ctx.replyWithPhoto(photoUrl, {
          caption: "```" + message + "```",
          parse_mode: "MarkdownV2",
          reply_to_message_id: ctx.message.message_id
        });
      } else {
        await ctx.reply("```" + message + "```", {
          parse_mode: "MarkdownV2",
          reply_to_message_id: ctx.message.message_id
        });
      }

      if (!check.isOwner) {
        user.limit -= requiredLimit;
        await db.save();
      }

    } catch (error) {
      console.error('Error checking Facebook:', error);
      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}
      await ctx.reply("```" + "❌ Terjadi kesalahan\n\nSilakan coba lagi nanti" + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    } finally {
      if (browser) await browser.close();
    }
  }
};