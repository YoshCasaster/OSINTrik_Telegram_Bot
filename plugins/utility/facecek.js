const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const https = require('https');
const path = require('path');
const { checkLimitAndPermission } = require('../../core/limitHandler');

const APITOKEN = '0AbXhebLWur9PbFyL4QzSnozIQBSVa+W/TsxY6YIcqQA9Jb4CrNIQDg0V8eye9OY2iapllcvrjg=';
const TESTING_MODE = true;

function escapeMarkdown(text) {
  return String(text || '').replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

const downloadImage = (url, filename) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);
    https.get(url, response => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
      file.on('error', reject);
    });
  });
};

const search_by_face = async (image_file) => {
  const site = 'https://facecheck.id';
  const headers = {
    accept: 'application/json',
    Authorization: APITOKEN,
  };

  let form = new FormData();
  form.append('images', fs.createReadStream(image_file));
  form.append('id_search', '');

  let response = await axios.post(site + '/api/upload_pic', form, {
    headers: {
      ...form.getHeaders(),
      'accept': 'application/json',
      'Authorization': APITOKEN
    }
  });
  response = response.data;

  if (response.error) {
    return [`${response.error} (${response.code})`, null];
  }

  const id_search = response.id_search;
  const json_data = {
    id_search: id_search,
    with_progress: true,
    status_only: false,
    demo: TESTING_MODE,
  };

  while (true) {
    let res = await axios.post(site + '/api/search', json_data, { headers: headers });
    res = res.data;
    if (res.error) {
      return [`${res.error} (${res.code})`, null];
    }
    if (res.output) {
      return [null, res.output.items];
    }
    await new Promise(r => setTimeout(r, 1000));
  }
};

function getRandomProxy() {
  const proxies = fs.readFileSync(path.join(__dirname, '../../proxy.txt'), 'utf-8')
    .split('\n').map(x => x.trim()).filter(Boolean);
  if (proxies.length === 0) return null;
  const [host, port] = proxies[Math.floor(Math.random() * proxies.length)].split(':');
  return { host, port: parseInt(port, 10) };
}

module.exports = {
  name: 'facecek',
  desc: 'Cari wajah di internet (12 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 12;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);

    if (!check.canUse) {
      return ctx.reply(check.message);
    }


    let fileId;
    if (ctx.message.reply_to_message?.photo) {
      const photo = ctx.message.reply_to_message.photo;
      fileId = photo[photo.length - 1].file_id;
    } else if (ctx.message.photo) {
      const photo = ctx.message.photo;
      fileId = photo[photo.length - 1].file_id;
    } else if (ctx.message.reply_to_message?.document && ctx.message.reply_to_message.document.mime_type.startsWith('image/')) {
      fileId = ctx.message.reply_to_message.document.file_id;
    } else if (ctx.message.document && ctx.message.document.mime_type.startsWith('image/')) {
      fileId = ctx.message.document.file_id;
    }

    if (!fileId) {
      return ctx.reply(escapeMarkdown('⚠️ Format salah!\n\nKirim atau balas pesan dengan gambar lalu ketik /facecek'), {
        parse_mode: 'MarkdownV2'
      });
    }

    const processingMsg = await ctx.reply(escapeMarkdown('🔍 Mengunggah & mencari wajah...\nHarap tunggu beberapa detik.'), {
      parse_mode: 'MarkdownV2'
    });


    const fileUrl = await ctx.telegram.getFileLink(fileId);
    const tempFile = path.join(__dirname, `facecek_${Date.now()}.jpg`);
    try {
      await downloadImage(fileUrl.href, tempFile);

      const [error, results] = await search_by_face(tempFile);

      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}

      if (error) {
        return ctx.reply(escapeMarkdown('❌ ' + error), {
          parse_mode: 'MarkdownV2',
          reply_to_message_id: ctx.message.message_id
        });
      }

      if (!results || results.length === 0) {
        return ctx.reply(escapeMarkdown('❌ Tidak ditemukan hasil pencarian wajah.'), {
          parse_mode: 'MarkdownV2',
          reply_to_message_id: ctx.message.message_id
        });
      }


      for (let i = 0; i < Math.min(results.length, 5); i++) {
        const im = results[i];
        const score = im.score;
        const url = im.url;
        const image_base64 = im.base64;
        let caption = `*Hasil ${escapeMarkdown('#' + (i + 1))}*\n`;
        caption += `*Score*: ${escapeMarkdown(score)}\n`;
        caption += `*Link*: ${escapeMarkdown(url)}\n`;
        caption += check.isOwner
          ? `\n👑 Owner Mode: No Limit`
          : `\n💫 Limit: ${check.user.limit} (-${requiredLimit})`;

        const MAX_CAPTION = 1024;
        let safeCaption = caption.length > MAX_CAPTION ? caption.slice(0, MAX_CAPTION - 3) + '...' : caption;


        const buffer = Buffer.from(image_base64, 'base64');
        if (!buffer || buffer.length === 0) {
          await ctx.reply('❌ Gagal memproses gambar hasil pencarian.');
          continue;
        }
        await ctx.replyWithPhoto({ source: buffer }, {
          caption: safeCaption,
          parse_mode: 'MarkdownV2',
          reply_to_message_id: ctx.message.message_id
        });
      }

      if (!check.isOwner) {
        check.user.limit -= requiredLimit;
        await db.save();
      }
    } catch (err) {
      try { await ctx.deleteMessage(processingMsg.message_id); } catch {}
      await ctx.reply(escapeMarkdown('❌ Terjadi kesalahan\n\n' + (err.message || 'Silakan coba lagi nanti')), {
        parse_mode: 'MarkdownV2',
        reply_to_message_id: ctx.message.message_id
      });
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }
};