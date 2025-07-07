const axios = require('axios');
const { checkLimitAndPermission, reduceLimit } = require('../../core/limitHandler');

module.exports = {
  name: 'cekewallet',
  desc: 'Cek nomor di semua layanan e-wallet (5 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    // Cek limit dan permission dengan helper function
    const requiredLimit = 5;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    
    if (!check.canUse) {
      return ctx.reply(check.message);
    }
    
    const user = check.user;

    const args = ctx.args;
    const number = args[0];

    if (!number) {
      return ctx.reply('Penggunaan: /cekewallet <nomor>\nContoh: /cekewallet 08123456789');
    }

    try {
      // Validasi format nomor telepon
      if (!number || !/^[0-9+\-\s]+$/.test(number)) {
        return ctx.reply('❌ *Format nomor tidak valid*\n\nPastikan nomor telepon hanya berisi angka, spasi, atau karakter +.\n\nContoh: `/cekewallet 08123456789` atau `/cekewallet +62812345678`', { parse_mode: 'Markdown' });
      }
      
      // Mengirim pesan bahwa permintaan sedang diproses
      const processingMsg = await ctx.reply(`⏳ *Memulai pengecekan nomor ${number} di 5 platform eWallet...*\n\nHarap tunggu, proses mungkin memakan waktu beberapa detik.`, { parse_mode: 'Markdown' });

      // Bungkus dalam try-catch terpisah untuk mencegah error yang menyebabkan nodemon restart
      let result;
      try {
        // Mengecek semua layanan e-wallet sekaligus
        result = await checkAllEwallets(number);
      } catch (checkError) {
        // Tangani error dari checkAllEwallets tanpa melempar ke atas
        result = `HASIL PEMERIKSAAN EWALLET\n\n⚠️ INFORMASI\nTerjadi masalah saat memeriksa nomor ${number}.\n\nKemungkinan penyebab:\n- API sedang dibatasi (rate limited)\n- Layanan sedang tidak tersedia\n- Format nomor tidak didukung\n\nSilakan coba lagi dalam beberapa menit.`;
      }
      
      // Mengurangi limit pengguna jika bukan owner
      let limitInfo = '';
      try {
        if (!check.isOwner) {
          limitInfo = await reduceLimit(user, db, requiredLimit);
        } else {
          limitInfo = '\n\n👑 Owner Mode: Tidak menggunakan limit';
        }
      } catch (limitError) {
        // Jika ada error saat mengurangi limit, abaikan dan lanjutkan
        limitInfo = '\n\n⚠️ Catatan: Limit tidak dikurangi karena terjadi kesalahan';
      }
      
      
      try {
        await ctx.reply(
    "```" + result + limitInfo + "```", 
    {
        parse_mode: 'Markdown',
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
    }
);
      } catch (replyError) {
        // Jika gagal mengirim dengan Markdown, coba tanpa format
        await ctx.reply("Hasil pemeriksaan eWallet: Terjadi kesalahan saat memformat hasil. Silakan coba lagi.");
      }
    } catch (error) {
      // Tangani error tanpa logging ke console untuk mencegah nodemon restart
      try {
        let errorMessage = '❌ *Terjadi kesalahan*\n\n';
        
        // Berikan pesan error yang lebih user-friendly
        if (error.message && error.message.includes('tidak valid')) {
          errorMessage += error.message;
        } else if (error.message && error.message.includes('timeout')) {
          errorMessage += 'Waktu permintaan habis. Server API mungkin sedang sibuk atau tidak tersedia. Silakan coba lagi nanti.';
        } else if (error.message && error.message.includes('network')) {
          errorMessage += 'Terjadi masalah jaringan. Silakan periksa koneksi internet dan coba lagi.';
        } else {
          errorMessage += 'Maaf, terjadi kesalahan saat mencoba mengecek layanan eWallet. Silakan coba lagi nanti.';
        }
        
        await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
      } catch (finalError) {
        // Jika semua gagal, kirim pesan sederhana tanpa format
        await ctx.reply("Terjadi kesalahan saat memeriksa eWallet. Silakan coba lagi nanti.");
      }
    }
  }
};

/**
 * Fungsi untuk mengecek nomor di semua layanan e-wallet sekaligus
 * @param {string} number - Nomor telepon yang akan dicek
 * @returns {Promise<string>} - Hasil pengecekan dalam format teks
 */
async function checkAllEwallets(number) {
  // Format nomor telepon (hapus karakter non-numerik dan pastikan format yang benar)
  const cleanNumber = number.replace(/\D/g, '');
  
  // Pastikan nomor telepon valid (minimal 10 digit untuk Indonesia)
  if (cleanNumber.length < 10) {
    throw new Error('Nomor telepon tidak valid. Pastikan nomor memiliki minimal 10 digit.');
  }
  
  // Tambahkan kode negara jika belum ada
  let formattedNumber = cleanNumber;
  if (cleanNumber.startsWith('0')) {
    formattedNumber = '62' + cleanNumber.substring(1);
  } else if (!cleanNumber.startsWith('62')) {
    formattedNumber = '62' + cleanNumber;
  }
  
  // Daftar layanan e-wallet yang didukung
  const ewalletServices = [
    {
      code: 'dana',
      name: 'DANA',
      url: `https://api.yogik.id/stalk/rekening?account_number=${formattedNumber}&account_bank=dana`
    },
    {
      code: 'gopay',
      name: 'GoPay',
      url: `https://api.yogik.id/stalk/rekening?account_number=${formattedNumber}&account_bank=gopay`
    },
    {
      code: 'ovo',
      name: 'OVO',
      url: `https://api.yogik.id/stalk/rekening?account_number=${formattedNumber}&account_bank=ovo`
    },
    {
      code: 'shopeepay',
      name: 'ShopeePay',
      url: `https://api.yogik.id/stalk/rekening?account_number=${formattedNumber}&account_bank=shopeepay`
    },
    {
      code: 'linkaja',
      name: 'LinkAja',
      url: `https://api.yogik.id/stalk/rekening?account_number=${formattedNumber}&account_bank=linkaja`
    }
  ];
  
  const results = [];
  
  // Tidak perlu log ke konsol untuk menghindari output berulang
  
  // Melakukan pengecekan untuk setiap layanan e-wallet
  for (const service of ewalletServices) {
    try {
      // Tambahkan delay acak antara permintaan untuk menghindari rate limiting
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 500) + 100));
      
      let response;
      try {
        // Tambahkan timeout yang lebih panjang untuk menghindari kegagalan koneksi
        response = await axios.get(service.url, { 
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
      } catch (apiError) {
        // Tangani error API secara khusus untuk mencegah nodemon restart
        if (apiError.response && apiError.response.status === 429) {
          // Rate limiting - tambahkan ke hasil tanpa melempar error
          results.push({
            service: service.name,
            status: "⚠️ Dibatasi oleh API",
            name: "Tidak Tersedia (Rate Limited)"
          });
          continue; // Lanjut ke layanan berikutnya
        } else {
          // Error lain - tambahkan ke hasil tanpa melempar error
          results.push({
            service: service.name,
            status: "❌ Tidak tersedia",
            name: "Tidak Ditemukan"
          });
          continue; // Lanjut ke layanan berikutnya
        }
      }
      
      // Penanganan respons yang lebih baik
      if (response && response.status === 200) {
        const data = response.data; // Gunakan response.data langsung, bukan response.json
        
        // Periksa apakah respons berhasil dan memiliki data
        if (data && data.success === true && data.data) {
          const accountInfo = data.data;
          
          // Periksa apakah ada informasi pemilik akun
          if (accountInfo.account_holder) {
            results.push({
              service: service.name,
              status: "✅ Ditemukan",
              name: accountInfo.account_holder,
              number: accountInfo.account_number || formattedNumber
            });
          } else {
            results.push({
              service: service.name,
              status: "❌ Tidak terdaftar",
              name: "Tidak Ditemukan"
            });
          }
        } else {
          // Respons berhasil tapi tidak ada data yang valid
          results.push({
            service: service.name,
            status: "❌ Tidak terdaftar",
            name: "Tidak Ditemukan"
          });
        }
      } else {
        // Status HTTP bukan 200
        results.push({
          service: service.name,
          status: "❌ Tidak tersedia",
          name: "Tidak Ditemukan"
        });
      }
    } catch (error) {
      // Tangani error dengan lebih baik - jangan log error yang bisa menyebabkan nodemon restart
      // Hanya tambahkan ke hasil
      results.push({
        service: service.name,
        status: "❌ Tidak tersedia",
        name: "Tidak Ditemukan"
      });
    }
  }
  
  // Format hasil output lebih sederhana dan rapi
  let output = `HASIL PEMERIKSAAN EWALLET\n\n`;
  
  // Periksa apakah ada hasil yang ditemukan
  const foundResults = results.filter(r => r.status && r.status.includes('Ditemukan'));
  
  if (foundResults.length === 0) {
    output += `ℹ️ INFORMASI\nNomor ${formattedNumber} tidak ditemukan di semua layanan e-wallet yang dicek.\n\n`;
  }
  
  // Tampilkan hasil untuk setiap layanan
  for (const result of results) {
    const platform = result.service;
    const status = result.status || '❌ Tidak Tersedia';
    const owner = result.name || 'Tidak Ditemukan';
    
    output += `- ${platform}\n`;
    output += `  STATUS : ${status}\n`;
    output += `  PEMILIK : ${owner}\n\n`;
  }
  
  // Tambahkan detail nomor dan waktu pengecekan
  output += `📌 Nomor yang diperiksa: ${formattedNumber}\n`;
  output += `🕒 Hasil diperbarui pada: ${new Date().toLocaleString('id-ID')}\n`;
  output += `🤖 Bot by: @Toretinyy`;

  return output;
}
