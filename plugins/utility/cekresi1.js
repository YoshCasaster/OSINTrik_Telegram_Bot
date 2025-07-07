const axios = require('axios');
const qs = require('qs');
const { checkLimitAndPermission } = require('../../core/limitHandler');

// Helper for MarkdownV2 escape
function escapeMarkdown(text) {
  return String(text || '').replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// Get courier list from loman.id
async function getCourierList() {
  try {
    const res = await axios.get('https://loman.id/resapp/getdropdown.php', {
      headers: {
        'user-agent': 'Postify/1.0.0',
        'content-type': 'application/x-www-form-urlencoded'
      },
      timeout: 5000
    });
    if (res.data?.status !== 'berhasil') return [];
    return res.data.data.map(c => c.title);
  } catch {
    return [];
  }
}

module.exports = {
  name: 'cekresi',
  desc: 'Cek resi pengiriman (5 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 5;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);

    if (!check.canUse) {
      return ctx.reply(check.message);
    }

    const user = check.user;
    const args = ctx.message.text.split(' ').slice(1);
    const resi = args[0];
    const ekspedisi = args[1];

    if (!resi) {
      return ctx.reply(escapeMarkdown('⚠️ Format salah!\n\nContoh: /cekresi nomorresi [ekspedisi]\n\nContoh: /cekresi JP1234567890 JNE'), {
        parse_mode: 'MarkdownV2',
        reply_to_message_id: ctx.message.message_id
      });
    }

    // Jika ekspedisi tidak diisi, tampilkan daftar ekspedisi
    if (!ekspedisi) {
      const couriers = await getCourierList();
      return ctx.reply(
        escapeMarkdown(
          '⚠️ Kamu harus memasukkan nama ekspedisi!\n\nContoh: /cekresi JP1234567890 JNE\n\nDaftar ekspedisi:\n- ' +
          couriers.join('\n- ')
        ),
        { parse_mode: 'MarkdownV2', reply_to_message_id: ctx.message.message_id }
      );
    }

    const processingMsg = await ctx.reply(escapeMarkdown('🔍 Mengecek resi...\n\nHarap tunggu sebentar'), {
      parse_mode: 'MarkdownV2'
    });

    try {
      const data = qs.stringify({ resi, ex: ekspedisi });
      const response = await axios.post(
        'https://loman.id/resapp/',
        data,
        {
          headers: {
            'user-agent': 'Postify/1.0.0',
            'content-type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}

      if (response.data?.status !== 'berhasil') {
        return ctx.reply(escapeMarkdown('❌ Resi tidak ditemukan atau server error.'), {
          parse_mode: 'MarkdownV2',
          reply_to_message_id: ctx.message.message_id
        });
      }

      const detail = response.data.details || {};
      const history = Array.isArray(response.data.history)
        ? response.data.history.map(item => ({
            datetime: item.tanggal,
            description: item.details
          }))
        : [];

      let message = `📦 *HASIL CEK RESI*\n\n`;
      message += `*Ekspedisi*: ${escapeMarkdown(ekspedisi)}\n`;
      message += `*No Resi*: ${escapeMarkdown(resi)}\n`;
      message += `*Status*: ${escapeMarkdown(detail.status || 'Tidak diketahui')}\n`;
      if (detail.infopengiriman) message += `*Info*: ${escapeMarkdown(detail.infopengiriman)}\n`;
      if (detail.ucapan) message += `*Tips*: ${escapeMarkdown(detail.ucapan)}\n`;

      if (history.length > 0) {
        message += `\n*Riwayat:*\n`;
        history.slice(0, 10).forEach((item, i) => {
          message += `${i + 1}. ${escapeMarkdown(item.datetime)}\n   ${escapeMarkdown(item.description)}\n`;
        });
      } else {
        message += `\nTidak ada riwayat pengiriman ditemukan.`;
      }

      message += check.isOwner
        ? `\n\n👑 Owner Mode: No Limit`
        : `\n\n💫 Limit: ${user.limit} (-${requiredLimit})`;

      await ctx.reply(message, {
        parse_mode: 'MarkdownV2',
        reply_to_message_id: ctx.message.message_id
      });

      if (!check.isOwner) {
        user.limit -= requiredLimit;
        await db.save();
      }
    } catch (error) {
      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}
      await ctx.reply(escapeMarkdown('❌ Terjadi kesalahan\n\nSilakan coba lagi nanti'), {
        parse_mode: 'MarkdownV2',
        reply_to_message_id: ctx.message.message_id
      });
    }
  }
};