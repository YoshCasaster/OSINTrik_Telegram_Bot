const { checkLimitAndPermission } = require('../../core/limitHandler');
const dns = require('dns').promises;
const net = require('net');

// Helper escape MarkdownV2
function escapeMarkdown(text) {
  return String(text || '').replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// SMTP validation (simple, not 100% reliable, especially for Gmail/Yahoo)
async function smtpValidate(email) {
  const domain = email.split('@')[1];
  if (!domain) return { valid: false, reason: 'Format email tidak valid.' };

  try {
    // Cari MX record
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { valid: false, reason: 'Domain tidak memiliki MX record.' };
    }
    // Ambil MX prioritas tertinggi
    const mx = mxRecords.sort((a, b) => a.priority - b.priority)[0].exchange;

    // SMTP handshake (HELO, MAIL FROM, RCPT TO)
    return await new Promise((resolve) => {
      const socket = net.createConnection(25, mx);
      let response = '';
      let step = 0;
      let finished = false;
      socket.setTimeout(3000);

      socket.on('data', (data) => {
        response += data.toString();
        if (step === 0 && /220/.test(response)) {
          socket.write('HELO example.com\r\n');
          step++;
        } else if (step === 1 && /250/.test(response)) {
          socket.write('MAIL FROM:<check@example.com>\r\n');
          step++;
        } else if (step === 2 && /250/.test(response)) {
          socket.write(`RCPT TO:<${email}>\r\n`);
          step++;
        } else if (step === 3) {
          if (/250/.test(response)) {
            finished = true;
            socket.end('QUIT\r\n');
            resolve({ valid: true });
          } else if (/550|553|554/.test(response)) {
            finished = true;
            socket.end('QUIT\r\n');
            resolve({ valid: false, reason: 'Mailbox tidak ditemukan atau ditolak.' });
          }
        }
      });

      socket.on('timeout', () => {
        if (!finished) {
          finished = true;
          socket.destroy();
          resolve({ valid: false, reason: 'Timeout saat validasi SMTP.' });
        }
      });

      socket.on('error', () => {
        if (!finished) {
          finished = true;
          resolve({ valid: false, reason: 'Tidak dapat terhubung ke server email.' });
        }
      });

      socket.on('end', () => {
        if (!finished) {
          finished = true;
          resolve({ valid: false, reason: 'Koneksi SMTP berakhir.' });
        }
      });
    });
  } catch (err) {
    return { valid: false, reason: 'Gagal validasi: ' + (err.message || err) };
  }
}

module.exports = {
  name: 'cekstatusmail',
  desc: 'Cek status email via SMTP (5 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    console.log('Perintah cekstatusmail diterima:', ctx.message.text);

    const requiredLimit = 5;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    if (!check.canUse) return ctx.reply(check.message);

    const email = ctx.args?.[0];
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return ctx.reply(escapeMarkdown(
        `⚠️ Format salah!\n\nContoh: /cekstatusmail example@gmail.com\n\n⛔ Potensi Kendala:\n- Tidak semua domain email mengizinkan validasi SMTP (bisa gagal meski email aktif).\n- validate_email tidak selalu 100% akurat.\n- Tidak mendukung Gmail/Yahoo secara optimal karena proteksi server mereka.`
      ), { parse_mode: 'MarkdownV2' });
    }

    const processingMsg = await ctx.reply(escapeMarkdown('🔍 Mengecek status email...'), {
      parse_mode: 'MarkdownV2'
    });

    try {
      const result = await smtpValidate(email);

      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}

      let message = `📧 *HASIL CEK STATUS EMAIL*\n\n`;
      message += `*Email*: ${escapeMarkdown(email)}\n`;
      if (result.valid) {
        message += `✅ Status: *Valid / Aktif*\n`;
      } else {
        message += `❌ Status: *Tidak valid / Tidak aktif*\n`;
        if (result.reason) message += `\n📝 Info: ${escapeMarkdown(result.reason)}`;
      }
      message += '\n\n⛔ Potensi Kendala:\n' +
        escapeMarkdown('- Tidak semua domain email mengizinkan validasi SMTP (bisa gagal meski email aktif).') + '\n' +
        escapeMarkdown('- validate_email tidak selalu 100% akurat.') + '\n' +
        escapeMarkdown('- Tidak mendukung Gmail/Yahoo secara optimal karena proteksi server mereka.');

      await ctx.reply(message, {
        parse_mode: 'MarkdownV2'
      });

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