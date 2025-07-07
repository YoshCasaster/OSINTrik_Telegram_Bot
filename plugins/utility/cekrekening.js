const axios = require('axios');
const { checkLimitAndPermission, reduceLimit } = require('../../core/limitHandler');

module.exports = {
  name: 'cekrekening',
  desc: 'Cek pemilik rekening bank (5 limit)',
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
    
    if (args.length < 1) {
      return ctx.reply('⚠️ Format salah! Gunakan: /cekrekening [nomor_rekening]');
    }
    
    const accountNumber = args[0].replace(/[^0-9]/g, '');
    
    if (!accountNumber || accountNumber.length < 5) {
      return ctx.reply('⚠️ Nomor rekening tidak valid!');
    }
    
    // Kurangi limit user
    await reduceLimit(ctx, db, user.id, requiredLimit);
    
    // Kirim pesan sedang memproses
    const processingMsg = await ctx.reply('🔍 Sedang mencari data rekening...');
    
    try {
      // Kirim pesan log ke konsol untuk debugging
      console.log(`Checking account number: ${accountNumber}`);
      
      const results = await checkAllBanks(accountNumber);
      
      if (results.length === 0) {
        return ctx.reply('❌ Tidak ditemukan informasi untuk nomor rekening tersebut di semua bank.', {
          reply_to_message_id: ctx.message.message_id
        });
      }
      
      let responseText = `✅ HASIL PENCARIAN REKENING\n\n`;
      responseText += `🔢 Nomor Rekening: ${accountNumber}\n\n`;
      
      results.forEach(result => {
        responseText += `🏦 ${result.bankName}\n`;
        responseText += `👤 Atas nama: ${result.accountName}\n\n`;
      });
      
      responseText += `\n💡 Limit berkurang ${requiredLimit}, sisa limit: ${user.limit - requiredLimit}`;
      
      // Mengirim hasil dengan format Markdown tanpa gambar
ctx.reply("```" + responseText + "```", {
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
      console.error('Error checking bank account:', error);
      await ctx.reply('❌ Terjadi kesalahan saat memeriksa rekening. Silakan coba lagi nanti.', {
        reply_to_message_id: ctx.message.message_id
      });
    } finally {
      // Hapus pesan processing
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  }
};

/**
 * Memeriksa nomor rekening di semua bank
 * @param {string} accountNumber - Nomor rekening yang akan diperiksa
 * @returns {Promise<Array>} - Array hasil pencarian
 */
async function checkAllBanks(accountNumber) {
  // Bank populer yang akan diperiksa terlebih dahulu
  const popularBanks = ["bca", "bni", "bri", "mandiri", "cimb", "btn", "danamon", "permata"];
  
  // Bank lainnya yang akan diperiksa jika bank populer tidak menemukan hasil
  const otherBanks = [
    "harda", "anz", "aceh", "aladin", "amar", "antardaerah", "artha", "bengkulu", 
    "daerah_istimewa", "daerah_istimewa_syr", "btpn_syr", "bukopin_syr", "bumi_arta", 
    "capital", "ccb", "cnb", "dinar", "dki", "dki_syr", "ganesha", 
    "agris", "ina_perdana", "index_selindo", "artos_syr", "jambi", "jambi_syr", 
    "jasa_jakarta", "jawa_tengah", "jawa_tengah_syr", "jawa_timur", "jawa_timur_syr", 
    "kalimantan_barat", "kalimantan_barat_syr", "kalimantan_selatan", "kalimantan_selatan_syr", 
    "kalimantan_tengah", "kalimantan_timur_syr", "kalimantan_timur", "lampung", "maluku", 
    "mantap", "maspion", "mayapada", "mayora", "mega", "mega_syr", "mestika_dharma", 
    "mizuho", "mas", "mutiara", "sumatera_barat", "sumatera_barat_syr", "nusa_tenggara_barat", 
    "nusa_tenggara_timur", "nusantara_parahyangan", "ocbc", "ocbc_syr", "america_na", "boc", 
    "india", "tokyo", "papua", "prima", "riau_dan_kepri", "sahabat_sampoerna", "shinhan", 
    "sinarmas", "sinarmas_syr", "sulselbar", "sulselbar_syr", "sulawesi", "sulawesi_tenggara", 
    "sulut", "sumsel_dan_babel", "sumsel_dan_babel_syr", "sumut", "sumut_syr", "resona_perdania", 
    "victoria_internasional", "victoria_syr", "woori", "bca_syr", "bjb", "bjb_syr", "royal", 
    "bnp_paribas", "bali", "banten", "eka", "agroniaga", "bsm", "btn_syr", 
    "tabungan_pensiunan_nasional", "citibank", "commonwealth", "chinatrust", "dbs", 
    "hsbc", "icbc", "artos", "hana", "bii", "bii_syr", "mnc_internasional", "muamalat", 
    "yudha_bakti", "nationalnobu", "panin", "panin_syr", "permata_syr", "qnb_kesawan", 
    "rabobank", "sbi_indonesia", "kesejahteraan_ekonomi", "standard_chartered", "super_bank", 
    "uob", "bukopin", "krom"
  ];
  
  // Mapping kode bank ke nama bank yang lebih mudah dibaca
  const bankNames = {
    "bca": "Bank Central Asia (BCA)",
    "bni": "Bank Negara Indonesia (BNI)",
    "bri": "Bank Rakyat Indonesia (BRI)",
    "mandiri": "Bank Mandiri",
    "btn": "Bank Tabungan Negara (BTN)",
    "cimb": "CIMB Niaga",
    "danamon": "Bank Danamon",
    "permata": "Bank Permata",
    "panin": "Bank Panin",
    "ocbc": "OCBC NISP",
    "bjb": "Bank BJB",
    "bsm": "Bank Syariah Mandiri",
    "bukopin": "Bank Bukopin",
    "mega": "Bank Mega",
    "btpn_syr": "BTPN Syariah",
    "dbs": "DBS Bank",
    "hsbc": "HSBC",
    "uob": "UOB Indonesia",
    "citibank": "Citibank",
    "commonwealth": "Commonwealth Bank"
    // Tambahkan mapping lain sesuai kebutuhan
  };
  
  const results = [];
  const formattedNumber = accountNumber.replace(/\D/g, '');
  
  // Fungsi untuk mendapatkan nama bank yang lebih mudah dibaca
  const getBankDisplayName = (bankCode) => {
    return bankNames[bankCode] || bankCode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  // Fungsi untuk memeriksa satu bank
  const checkBank = async (bankCode) => {
    try {
      const url = `https://api.yogik.id/stalk/rekening?account_number=${formattedNumber}&account_bank=${bankCode}`;
      console.log(`Checking bank ${bankCode} with URL: ${url}`);
      
      const response = await axios.get(url, { timeout: 15000 });
      
      // Jika data ditemukan dan sukses
      if (response.data && response.data.success === true && response.data.data) {
        console.log(`✅ Found account in ${bankCode}: ${response.data.data.account_holder || response.data.data.account_name}`);
        return {
          bankCode,
          bankName: getBankDisplayName(bankCode),
          accountName: response.data.data.account_holder || response.data.data.account_name
        };
      }
      return null;
    } catch (error) {
      console.error(`Error checking ${bankCode}:`, error.message);
      return null;
    }
  };
  
  // Strategi 1: Cek satu per satu bank populer, hentikan jika menemukan hasil
  console.log('Checking popular banks one by one...');
  for (const bank of popularBanks) {
    const result = await checkBank(bank);
    if (result) {
      results.push(result);
      console.log(`Found result in ${bank}, stopping search`);
      return results; // Hentikan pencarian jika sudah menemukan hasil
    }
  }
  
  // Strategi 2: Jika tidak ditemukan di bank populer, cek bank lainnya satu per satu
  console.log('Checking other banks one by one...');
  for (const bank of otherBanks) {
    const result = await checkBank(bank);
    if (result) {
      results.push(result);
      console.log(`Found result in ${bank}, stopping search`);
      return results; // Hentikan pencarian jika sudah menemukan hasil
    }
  }
  
  return results; // Kembalikan array kosong jika tidak ditemukan hasil
}
