const EmailChecker = require('../../osint_modules/emailChecker');
const { checkLimitAndPermission } = require('../../core/limitHandler');

module.exports = {
  name: 'cekmail2',
  desc: 'Cek email di berbagai platform (5 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 5;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    
    if (!check.canUse) {
      return ctx.reply(check.message);
    }
    
    const user = check.user;
    const email = ctx.args[0];

    if (!email || !email.includes('@')) {
      return ctx.reply("```" + "⚠️ Format salah!\n\nContoh: /cekmail2 example@gmail.com" + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }

    const processingMsg = await ctx.reply("```" + "🔍 Mencari akun terkait...\n\nHarap tunggu sebentar" + "```", {
      parse_mode: "MarkdownV2"
    });

    try {
      const checker = new EmailChecker();
      const results = await checker.checkEmail(email);

      let message = `🔍 HASIL CEK EMAIL\n\n`;
      message += `📧 Email: ${email}\n\n`;

      if (results.length > 0) {
        message += `✅ Ditemukan ${results.length} akun:\n\n`;
        results.forEach(result => {
          message += `🌐 ${result.domain}\n`;
          if (result.email_recovery) message += `📧 Recovery: ${result.email_recovery}\n`;
          if (result.phone_number) message += `📱 Phone: ${result.phone_number}\n`;
          if (result.others) message += `ℹ️ Info: ${result.others}\n`;
          message += `\n`;
        });
      } else {
        message += `❌ Tidak ditemukan akun terkait\n`;
      }

      message += !check.isOwner 
        ? `\n💫 Limit: ${user.limit} (-${requiredLimit})`
        : `\n👑 Owner Mode: No Limit`;

      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (error) {
        console.error('Failed to delete processing message:', error);
      }

      await ctx.reply("```" + message + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🕵️ Menu OSINT", callback_data: "menu_osint" }]
          ]
        }
      });

      if (!check.isOwner) {
        user.limit -= requiredLimit;
        await db.save();
      }

    } catch (error) {
      console.error('Error in email check:', error);
      
      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (deleteError) {
        console.error('Failed to delete processing message:', deleteError);
      }
      
      await ctx.reply("```" + "❌ Terjadi kesalahan\n\nSilakan coba lagi nanti" + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }
  }
};