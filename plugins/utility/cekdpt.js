const axios = require('axios');
const { chromium } = require('playwright');
const { checkLimitAndPermission, reduceLimit } = require('../../core/limitHandler');

module.exports = {
  name: 'ceknik',
  desc: 'Cek data pemilih di KPU berdasarkan NIK (10 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    // Cek limit dan permission dengan helper function
    const requiredLimit = 10;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    
    if (!check.canUse) {
      return ctx.reply(check.message);
    }
    
    const user = check.user;

    const args = ctx.args;
    const nik = args[0];

    if (!nik || nik.length !== 16 || !/^\d+$/.test(nik)) {
      return ctx.reply('❌ *Format NIK tidak valid*\n\nNIK harus terdiri dari 16 digit angka.\n\nContoh: `/cekdpt 1234567890123456`', { parse_mode: 'Markdown' });
    }

    // Mengirim pesan bahwa permintaan sedang diproses
    const processingMsg = await ctx.reply(`⏳ *Mencari data pemilih dengan NIK ${nik.substring(0, 6)}xxxxxxxxxx...*\n\nHarap tunggu, proses mungkin memakan waktu beberapa detik.`, { parse_mode: 'Markdown' });
    
    try {
      // Mengecek data pemilih di KPU
      const result = await cekDPT(nik);
      
      // Mengurangi limit pengguna jika bukan owner
      let limitInfo = '';
      if (!check.isOwner) {
        user.limit -= requiredLimit;
        await db.save();
        limitInfo = `\n💫 *Limit kamu:* ${user.limit} (-${requiredLimit})`;
      } else {
        limitInfo = '\n👑 Owner Mode: Tidak menggunakan limit';
      }
      
      // Format hasil pengecekan
      let message = `HASIL PENGECEKAN NIK KPU\n\n`;
      message += `- DATA PEMILIH\n`;
      message += `  NAMA : ${result.nama || 'Tidak tersedia'}\n`;
      message += `  NIK : ${result.nik || 'Tidak tersedia'}\n`;
      message += `  NKK : ${result.nkk || 'Tidak tersedia'}\n\n`;

      message += `- LOKASI TPS\n`;
      message += `  KABUPATEN : ${result.kabupaten || 'Tidak tersedia'}\n`;
      message += `  KECAMATAN : ${result.kecamatan || 'Tidak tersedia'}\n`;
      message += `  KELURAHAN : ${result.kelurahan || 'Tidak tersedia'}\n`;
      message += `  TPS : ${result.tps || 'Tidak tersedia'}\n`;
      message += `  ALAMAT : ${result.alamat || 'Tidak tersedia'}\n\n`;
      
      if (result.lat && result.lon) {
        message += `- KOORDINAT LOKASI\n`;
        message += `  LATITUDE : ${result.lat}\n`;
        message += `  LONGITUDE : ${result.lon}\n\n`;
        
        // Mengirim lokasi TPS jika koordinat tersedia
        await ctx.telegram.sendLocation(ctx.chat.id, parseFloat(result.lat), parseFloat(result.lon));
      }
      
      message += `📌 NIK yang diperiksa: ${nik.substring(0, 6)}xxxxxxxxxx\n`;
      message += `🕒 Hasil diperbarui pada: ${new Date().toLocaleString('id-ID')}${limitInfo}\n`;
      message += `🤖 Bot by: @Toretinyy`;
      
// Mengirim hasil dengan format Markdown tanpa gambar
ctx.reply("```" + message + "```", {
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
      
      
    } catch (error) {
      console.error('Error saat mengecek DPT:', error);
      let errorMessage = '❌ *Terjadi kesalahan saat mengecek data pemilih*\n\n';
      
      if (error.message && error.message.includes('tidak ditemukan')) {
        errorMessage = '❌ *Data tidak ditemukan*\n\nNIK yang Anda masukkan tidak terdaftar sebagai pemilih atau terjadi kesalahan pada sistem KPU.';
      } else if (error.message && error.message.includes('token')) {
        errorMessage = '❌ *Terjadi kesalahan pada sistem*\n\nTidak dapat mengakses data KPU. Silakan coba lagi nanti.';
      } else if (error.message) {
        errorMessage += `Detail error: ${error.message}`;
      }
      
      await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
    }
  }
};

/**
 * Fungsi untuk mengecek data pemilih di KPU berdasarkan NIK
 * @param {string} nik - NIK yang akan dicek
 * @returns {Promise<Object>} - Hasil pengecekan data pemilih
 */
async function cekDPT(nik) {
  let browser;
  try {
    console.log(`🔍 Memulai pengecekan NIK ${nik} di database KPU...`);
    console.log('Menjalankan browser untuk mengambil token secara realtime...');
    
    // Launch browser with Playwright
    browser = await chromium.launch({
      headless: true
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 }
    });
    
    const page = await context.newPage();
    
    let token = null;
    let responseData = null;
    
    // Listen to API responses
    page.on('response', async response => {
      if (response.url().includes('cekdptonline.kpu.go.id/v2')) {
        try {
          const data = await response.json();
          if (data?.data?.findNikSidalih) {
            const receivedNik = data.data.findNikSidalih.nik;
            if (receivedNik?.startsWith(nik.substring(0, 6))) {
              responseData = data.data.findNikSidalih;
              console.log(`Data DPT untuk NIK ${nik} berhasil diambil`);
            }
          }
        } catch (e) {
          console.error('Error parsing response:', e);
        }
      }
    });
    
    // Navigate to KPU website
    await page.goto('https://cekdptonline.kpu.go.id/', {
      waitUntil: 'networkidle'
    });
    
    // Extract token from page
    token = await page.evaluate(() => {
      try {
        // Try getting token from Next.js data
        const nextData = document.getElementById('__NEXT_DATA__')?.textContent;
        if (nextData) {
          const parsed = JSON.parse(nextData);
          return parsed?.props?.pageProps?.token;
        }
        
        // Try localStorage
        const localToken = localStorage.getItem('token');
        if (localToken) return localToken;
        
        // Try script tags
        for (const script of document.getElementsByTagName('script')) {
          const match = script.textContent.match(/token[\s]*:[\s]*['"]([^'"]+)['"]/);
          if (match?.[1]) return match[1];
        }
        
        return null;
      } catch (e) {
        console.error('Error extracting token:', e);
        return null;
      }
    });
    
    // Input NIK and search
    await page.fill('input[type="text"]', nik);
    
    // Click search button
    const searchButton = await page.getByRole('button', { 
      name: /cari|search/i 
    });
    
    if (searchButton) {
      await searchButton.click();
    } else {
      // Fallback: submit form
      await page.evaluate(() => {
        document.querySelector('form')?.submit();
      });
    }
    
    // Wait for results
    await page.waitForTimeout(8000);
    
    // Make API request if no intercepted data
    if (!responseData && token) {
      const response = await axios.post('https://cekdptonline.kpu.go.id/v2', {
        query: `
          {
            findNikSidalih(
              nik:"${nik}",
              wilayah_id:0,
              token:"${token}"
            ) {
              nama, nik, nkk, provinsi, kabupaten,
              kecamatan, kelurahan, tps, alamat,
              lat, lon, metode, lhp {
                nama, nik, nkk, kecamatan, kelurahan,
                tps, id, flag, source, alamat, lat,
                lon, metode
              }
            }
          }
        `
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://cekdptonline.kpu.go.id',
          'Referer': 'https://cekdptonline.kpu.go.id/'
        }
      });
      
      if (response.data?.data?.findNikSidalih) {
        responseData = response.data.data.findNikSidalih;
      }
    }
    
    await browser.close();
    
    if (responseData) {
      return responseData;
    }
    
    throw new Error('Data tidak ditemukan');
    
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}
