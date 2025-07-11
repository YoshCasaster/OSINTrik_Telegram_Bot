const axios = require('axios');
const cheerio = require('cheerio');
const { checkLimitAndPermission } = require('../../core/limitHandler');

function escapeMarkdown(text) {
  return String(text || '').replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

async function searchGroups(keywords) {
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Referer": "https://groupda1.link/add/group/search",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html, */*; q=0.01",
    "Host": "groupda1.link",
    "Origin": "https://groupda1.link",
    "User-Agent": "Mozilla/5.0"
  };

  const results = [];
  for (const name of keywords.split(',')) {
    let loop_count = 0;
    let foundAny = false;
    while (true) {
      const data = {
        group_no: `${loop_count}`,
        search: true,
        keyword: name.trim()
      };
      const response = await axios.post("https://groupda1.link/add/group/loadresult", new URLSearchParams(data), { headers, timeout: 10000 });
      if (response.status !== 200 || !response.data || response.data.length === 0) break;
      const $ = cheerio.load(response.data);
      let found = false;
      for (const maindiv of $('.maindiv').toArray()) {
        const tag = $(maindiv).find('a[href]');
        if (!tag.length) continue;
        const link = tag.attr('href');
        const title = tag.attr('title').replace('Whatsapp group invite link: ', '');
        const description_tag = $(maindiv).find('p.descri');
        const description = description_tag.text().trim() || 'Tidak ada deskripsi';
        const group_id = link.split('/').pop();
        const group_link = `https://chat.whatsapp.com/${group_id}`;
        if (!results.some(g => g.Code === group_id)) {
          results.push({
            Name: title,
            Code: group_id,
            Link: group_link,
            Description: description,
            Keyword: name.trim()
          });
          found = true;
          foundAny = true;
        }
      }
      if (!found) break;
      loop_count++;
      await new Promise(r => setTimeout(r, 1000));
    }
    if (!foundAny) {
      results.push({
        Name: `Tidak ada hasil untuk '${name.trim()}'`,
        Code: '-',
        Link: '-',
        Description: '-',
        Keyword: name.trim()
      });
    }
  }
  return results;
}

module.exports = {
  name: 'cekgroupwa',
  desc: 'Cari grup WhatsApp publik by keyword (limit 5)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 5;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    if (!check.canUse) return ctx.reply(check.message);

    const keywords = ctx.args?.join(' ');
    if (!keywords) {
      return ctx.reply(escapeMarkdown('⚠️ Format salah!\n\nContoh: /cekgroupwa kata1,kata2'), {
        parse_mode: 'MarkdownV2'
      });
    }

    const processingMsg = await ctx.reply(escapeMarkdown('🔍 Mencari grup WhatsApp...'), {
      parse_mode: 'MarkdownV2'
    });

    try {
      const groups = await searchGroups(keywords);

      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}

      if (!groups.length) {
        return ctx.reply(escapeMarkdown('❌ Tidak ada grup ditemukan.'), {
          parse_mode: 'MarkdownV2'
        });
      }

      let resultMsg = '';
      let msgArr = [];
      let count = 0;
      for (const group of groups) {
        resultMsg += `📌 Nama Grup: ${escapeMarkdown(group.Name)}\n`;
        resultMsg += `🔗 Link: ${escapeMarkdown(group.Link)}\n`;
        resultMsg += `📝 Deskripsi: ${escapeMarkdown(group.Description)}\n`;
        resultMsg += `🔎 Keyword: ${escapeMarkdown(group.Keyword)}\n`;
        resultMsg += '──────────────────────────────\n';
        count++;
        if (resultMsg.length > 3500 || count % 20 === 0) {
          msgArr.push(resultMsg);
          resultMsg = '';
        }
      }
      if (resultMsg) msgArr.push(resultMsg);

      for (let i = 0; i < msgArr.length; i++) {
        let msg = `📋 *Hasil Grup WhatsApp*\n\n${msgArr[i]}`;
        msg += `\n✅ Total Grup Ditemukan: ${groups.length}`;
        msg += check.isOwner
          ? `\n👑 Owner Mode: No Limit`
          : `\n💫 Limit: ${check.user.limit} (\\- ${requiredLimit})`;
        await ctx.reply('```\n' + msg + '\n```', { parse_mode: 'MarkdownV2' });
      }

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