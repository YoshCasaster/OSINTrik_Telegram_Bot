const { checkLimitAndPermission, reduceLimit } = require('../../core/limitHandler');
const ExifReader = require('exifreader');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const os = require('os');


async function downloadImage(url, ctx) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const tempPath = path.join(os.tmpdir(), `image_${ctx.from.id}_${Date.now()}.jpg`);
    await fs.writeFile(tempPath, response.data);
    return tempPath;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw new Error('Gagal mengunduh gambar. ' + error.message);
  }
}

async function getImageInfo(filePath) {
  const info = {};
  
  try {
    const metadata = await sharp(filePath).metadata();
    info.dimensions = {
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      format: metadata.format
    };
    
    const exifData = await ExifReader.load(await fs.readFile(filePath));
    
    if (exifData.GPSLatitude && exifData.GPSLongitude) {
      info.gps = {
        latitude: convertDMSToDD(exifData.GPSLatitude.value, exifData.GPSLatitudeRef?.value),
        longitude: convertDMSToDD(exifData.GPSLongitude.value, exifData.GPSLongitudeRef?.value)
      };
    }
    
    info.exif = {
      make: exifData.Make?.description || 'Tidak tersedia',
      model: exifData.Model?.description || 'Tidak tersedia',
      software: exifData.Software?.description || 'Tidak tersedia',
      dateTime: exifData.DateTime?.description || 'Tidak tersedia',
      exposureTime: exifData.ExposureTime?.description || 'Tidak tersedia',
      fNumber: exifData.FNumber?.description || 'Tidak tersedia',
      iso: exifData.ISOSpeedRatings?.description || 'Tidak tersedia',
      focalLength: exifData.FocalLength?.description || 'Tidak tersedia'
    };
    
    return info;
  } catch (error) {
    console.error('Error getting image info:', error);
    throw new Error('Gagal mendapatkan informasi gambar. ' + error.message);
  }
}

function convertDMSToDD(dms, ref) {
  const degrees = dms[0];
  const minutes = dms[1];
  const seconds = dms[2];
  let dd = degrees + minutes/60 + seconds/3600;
  if (ref === 'S' || ref === 'W') dd = dd * -1;
  return dd;
}

async function cleanup(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error cleaning up file:', error);
  }
}


function escapeMarkdown(text) {
  return text.toString().replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}


module.exports = {
  name: 'cekimg',
  desc: 'Cek metadata gambar (10 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 10;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    
    if (!check.canUse) {
      return ctx.reply(check.message);
    }
    
    const user = check.user;

    if (
      !(
        ctx.message.reply_to_message?.photo ||
        ctx.message.photo ||
        (ctx.message.reply_to_message?.document && ctx.message.reply_to_message.document.mime_type.startsWith('image/')) ||
        (ctx.message.document && ctx.message.document.mime_type.startsWith('image/'))
      )
    ) {
      return ctx.reply(escapeMarkdown('⚠️ Format salah!\n\nKirim atau balas pesan dengan gambar (foto/dokumen) lalu ketik /cekimg'), {
        parse_mode: 'MarkdownV2'
      });
    }


    const processingMsg = await ctx.reply('🔍 *Menganalisis metadata gambar*\n\nHarap tunggu sebentar', {
      parse_mode: 'MarkdownV2'
    });

    let tempFilePath = null;

    try {
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
      const file = await ctx.telegram.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${ctx.telegram.token}/${file.file_path}`;
      
      tempFilePath = await downloadImage(fileUrl, ctx);
      const info = await getImageInfo(tempFilePath);

  
      let message = `📸 *HASIL ANALISIS GAMBAR*\n\n`;
      message += `📏 *DIMENSI*\n`;
      message += `Lebar: \`${escapeMarkdown(info.dimensions.width)}px\`\n`;
      message += `Tinggi: \`${escapeMarkdown(info.dimensions.height)}px\`\n`;
      message += `Format: \`${escapeMarkdown(info.dimensions.format.toUpperCase())}\`\n\n`;
      
      message += `📷 *METADATA EXIF*\n`;
      message += `Kamera: \`${escapeMarkdown(info.exif.make)} ${escapeMarkdown(info.exif.model)}\`\n`;
      message += `Software: \`${escapeMarkdown(info.exif.software)}\`\n`;
      message += `Waktu: \`${escapeMarkdown(info.exif.dateTime)}\`\n`;
      message += `Exposure: \`${escapeMarkdown(info.exif.exposureTime)}\`\n`;
      message += `F\\-Number: \`${escapeMarkdown(info.exif.fNumber)}\`\n`;
      message += `ISO: \`${escapeMarkdown(info.exif.iso)}\`\n`;
      message += `Focal Length: \`${escapeMarkdown(info.exif.focalLength)}\`\n\n`;

      if (info.gps) {
        message += `📍 *LOKASI GPS*\n`;
        message += `Latitude: \`${escapeMarkdown(info.gps.latitude)}\`\n`;
        message += `Longitude: \`${escapeMarkdown(info.gps.longitude)}\`\n\n`;
        
        await ctx.telegram.sendLocation(ctx.chat.id, info.gps.latitude, info.gps.longitude);
      }


      message += !check.isOwner 
        ? `\n💫 Limit: \`${escapeMarkdown(user.limit)}\` \\(\\-${requiredLimit}\\)`
        : `\n👑 Owner Mode: \`No Limit\``;

      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (error) {
        console.error('Failed to delete processing message:', error);
      }

      await ctx.reply(message, {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🕵️ Menu OSINT",
                callback_data: "menu_osint"
              }
            ]
          ]
        }
      });

      if (!check.isOwner) {
        user.limit -= requiredLimit;
        await db.save();
      }

    } catch (error) {
      console.error('Error in cekimg:', error);
      
      let errorMessage = '❌ *Terjadi kesalahan*\n\n';
      
      if (error.message.includes('gambar')) {
        errorMessage = '❌ ' + escapeMarkdown(error.message);
      } else if (error.message.includes('timeout')) {
        errorMessage = '❌ Waktu permintaan habis\\. Server mungkin sedang sibuk';
      } else {
        errorMessage += 'Terjadi kesalahan saat menganalisis gambar\\. Silakan coba lagi nanti';
      }
      
      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (deleteError) {
        console.error('Failed to delete processing message:', deleteError);
      }
      
      await ctx.reply(errorMessage, {
        parse_mode: 'MarkdownV2',
        reply_to_message_id: ctx.message.message_id
      });
    } finally {
      if (tempFilePath) {
        await cleanup(tempFilePath);
      }
    }
  }
};