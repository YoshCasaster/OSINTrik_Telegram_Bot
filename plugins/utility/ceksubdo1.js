const axios = require('axios');
const { checkLimitAndPermission } = require('../../core/limitHandler');

function escapeMarkdown(text) {
  return String(text || '').replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

async function findSubdomains(domain, complite) {
  const headers = {
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'X-Requested-With': 'id.chie.subdomainfinder',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Host': 'crt.sh',
    'Referer': 'https://crt.sh/?q=[]&output=json',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Accept': '*/*',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S9210 Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.74 Mobile Safari/537.36'
  };

  let url = complite
    ? `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`
    : `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json&exclude=expired`;

  const response = await axios.get(url, { headers, timeout: 15000 });
  const x_data = response.data;
  const subdomains = new Set();
  for (const entry of x_data) {
    entry.name_value.split('\n').forEach(sub => subdomains.add(sub));
  }
  return Array.from(subdomains);
}

module.exports = {
  name: 'ceksubdo1',
  desc: 'Cari subdomain dari (limit 5)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 5;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    if (!check.canUse) return ctx.reply(check.message);

    const args = ctx.args || [];
    const domain = args[0]?.toLowerCase();
    const mode = args[1]?.toLowerCase() === 'complite';
    if (!domain || !/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(domain)) {
      return ctx.reply(escapeMarkdown('⚠️ Domain tidak valid!\n\nContoh: /ceksubdo1 example.com [quick|complite]'), {
        parse_mode: 'MarkdownV2'
      });
    }

    const processingMsg = await ctx.reply(escapeMarkdown('🔍 Mencari subdomain...'), {
      parse_mode: 'MarkdownV2'
    });

    try {
      const subdomains = await findSubdomains(domain, mode);

      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}

      if (!subdomains.length) {
        return ctx.reply(escapeMarkdown('❌ Tidak ada subdomain ditemukan.'), {
          parse_mode: 'MarkdownV2'
        });
      }

      let resultMsg = `📋 *Hasil Subdomain untuk* _${escapeMarkdown(domain)}_\n\n`;
      subdomains.slice(0, 50).forEach((sub, i) => {
        resultMsg += `${i + 1}. ${escapeMarkdown(sub)}\n`;
      });
      resultMsg += `\n✅ Total Subdomain Ditemukan: ${subdomains.length}`;
      resultMsg += mode ? '\n⚙️ Mode: Complite' : '\n⚙️ Mode: Quick';
      resultMsg += check.isOwner
        ? `\n👑 Owner Mode: No Limit`
        : `\n💫 Limit: ${check.user.limit} (\\- ${requiredLimit})`;

      await ctx.reply('```\n' + resultMsg + '\n```', { parse_mode: 'MarkdownV2' });

      if (!check.isOwner) {
        check.user.limit -= requiredLimit;
        await db.save();
      }
    } catch (err) {
      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}
      await ctx.reply(escapeMarkdown('❌ Terjadi kesalahan: ' + (err.message || 'Silakan coba lagi nanti')), {
        parse_mode: 'MarkdownV2'
      });
    }
  }
};