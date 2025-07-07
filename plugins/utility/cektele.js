const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const { checkLimitAndPermission } = require('../../core/limitHandler');
require('dotenv').config({ path: __dirname + '/.env' });

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class TelegramInfoChecker {
  constructor() {
    this.apiId = parseInt(process.env.TELEGRAM_API_ID);
    this.apiHash = process.env.TELEGRAM_API_HASH;
    this.sessionString = process.env.TELEGRAM_SESSION_URL;
  }

  async getClient() {
    try {
      const client = new TelegramClient(
        new StringSession(this.sessionString),
        this.apiId,
        this.apiHash,
        {
          connectionRetries: 3,
          retries: 3,
          downloadRetries: 3,
          requestRetries: 3,
          connectTimeout: 20000,
          autoReconnect: true,
          useIPV6: false,
          floodSleepThreshold: 60,
          deviceModel: "Desktop",
          systemVersion: "Windows 10"
        }
      );

      await client.connect();
      if (!client.connected) {
        throw new Error('Failed to connect to Telegram');
      }

      return client;
    } catch (error) {
      console.error('Error creating Telegram client:', error);
      throw error;
    }
  }

  async getInfo(phoneNumber) {
    let client;
    try {
      client = await this.getClient();

      const result = await Promise.race([
        client.invoke(new Api.contacts.ImportContacts({
          contacts: [new Api.InputPhoneContact({
            clientId: BigInt(0),
            phone: phoneNumber,
            firstName: '',
            lastName: ''
          })]
        })),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Operation timed out')), 30000)
        )
      ]);

      // ⏱️ Delay agar tidak terlalu cepat antar request
      await delay(8000);

      if (!result.users.length) {
        return null;
      }

      const user = result.users[0];

      const data = {
        id: user.id.toString(),
        status: user.status ? user.status.className : 'unknown',
        username: user.username || null,
        lastOnline: user.status && user.status.wasOnline
          ? user.status.wasOnline.toISOString()
          : null
      };

      await client.invoke(new Api.contacts.DeleteContacts({
        id: [user]
      }));

      return data;

    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  }
}

function escapeMarkdown(text) {
  return text.toString().replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

module.exports = {
  name: 'cektele',
  desc: 'Cek info Telegram dari nomor HP (10 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 10;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);

    if (!check.canUse) {
      return ctx.reply(check.message);
    }

    const user = check.user;
    const phoneNumber = ctx.message.text.split(' ').slice(1).join('').trim();

    if (!phoneNumber || !/^\+?\d+$/.test(phoneNumber)) {
      return ctx.reply("```⚠️ Format salah\\!\n\nContoh: /cektele \\+6281234567890```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }

    const processingMsg = await ctx.reply("```🔍 Mencari info Telegram\\.\\.\\.\n\nHarap tunggu sebentar```", {
      parse_mode: "MarkdownV2"
    });

    try {
      const checker = new TelegramInfoChecker();
      const info = await checker.getInfo(phoneNumber);

      let message = `*📱 INFO TELEGRAM*\n\n`;
      message += `☎️ Nomor: \`${escapeMarkdown(phoneNumber)}\`\n\n`;

      if (!info) {
        message += `❌ Nomor tidak terdaftar di Telegram\n`;
      } else {
        message += `✅ Terdaftar di Telegram\n`;
        message += `🆔 ID: \`${escapeMarkdown(info.id)}\`\n`;
        message += `👤 Username: \`${escapeMarkdown(info.username || 'Tidak ada')}\`\n`;
        message += `📊 Status: \`${escapeMarkdown(info.status)}\`\n`;
        if (info.lastOnline) {
          message += `🕒 Terakhir Online: \`${escapeMarkdown(info.lastOnline)}\`\n`;
        }
      }

      message += `\n${!check.isOwner
        ? `💫 Limit: ${escapeMarkdown(user.limit.toString())} \\(\\-${requiredLimit}\\)`
        : `👑 Owner Mode: No Limit`}`;

      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (error) {
        console.log('Failed to delete processing message:', error);
      }

      await ctx.reply(message, {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [{
              text: "🕵️ Menu OSINT",
              callback_data: "menu_osint"
            }]
          ]
        }
      });

      if (!check.isOwner) {
        user.limit -= requiredLimit;
        await db.save();
      }

    } catch (error) {
      console.error('Error in Telegram info check:', error);

      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (deleteError) {
        console.log('Failed to delete processing message:', deleteError);
      }

      await ctx.reply("```❌ Terjadi kesalahan\\!\n\nSilakan coba lagi nanti```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }
  }
};
