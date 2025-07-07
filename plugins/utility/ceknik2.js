const { checkLimitAndPermission, reduceLimit } = require('../../core/limitHandler');
const moment = require('moment');

// Data wilayah & kodepos (diambil dari package nik-parse)
const wilayahData = {
  "provinsi": {
    "11": "ACEH", "12": "SUMATERA UTARA", "13": "SUMATERA BARAT", "14": "RIAU", "15": "JAMBI",
    "16": "SUMATERA SELATAN", "17": "BENGKULU", "18": "LAMPUNG", "19": "KEPULAUAN BANGKA BELITUNG",
    "21": "KEPULAUAN RIAU", "31": "DKI JAKARTA", "32": "JAWA BARAT", "33": "JAWA TENGAH",
    "34": "DAERAH ISTIMEWA YOGYAKARTA", "35": "JAWA TIMUR", "36": "BANTEN", "51": "BALI",
    "52": "NUSA TENGGARA BARAT", "53": "NUSA TENGGARA TIMUR", "61": "KALIMANTAN BARAT",
    "62": "KALIMANTAN TENGAH", "63": "KALIMANTAN SELATAN", "64": "KALIMANTAN TIMUR",
    "65": "KALIMANTAN UTARA", "71": "SULAWESI UTARA", "72": "SULAWESI TENGAH", "73": "SULAWESI SELATAN",
    "74": "SULAWESI TENGGARA", "75": "GORONTALO", "76": "SULAWESI BARAT", "81": "MALUKU",
    "82": "MALUKU UTARA", "91": "PAPUA", "92": "PAPUA BARAT"
  }
};

// Fungsi untuk mengecek NIK
function parseNIK(nik) {
  // Validasi format NIK
  if (!/^\d{16}$/.test(nik)) {
    return {
      status: "error",
      pesan: "NIK tidak valid, harus 16 digit angka"
    };
  }

  try {
    // Ekstrak informasi dari NIK
    const provinsiCode = nik.substring(0, 2);
    const kabupatenCode = nik.substring(0, 4);
    const kecamatanCode = nik.substring(0, 6);
    
    // Tanggal lahir
    let tanggal = parseInt(nik.substring(6, 8));
    // Jika perempuan, tanggal + 40
    const jenisKelamin = tanggal > 40 ? "PEREMPUAN" : "LAKI-LAKI";
    if (tanggal > 40) tanggal -= 40;
    
    const bulan = parseInt(nik.substring(8, 10));
    const tahun = parseInt(nik.substring(10, 12));
    // Asumsi tahun 2000 ke atas jika tahun < 20, selain itu 1900-an
    const fullTahun = tahun < 20 ? 2000 + tahun : 1900 + tahun;
    
    // Format tanggal lahir
    const lahir = `${tanggal.toString().padStart(2, '0')}/${bulan.toString().padStart(2, '0')}/${fullTahun}`;
    
    // Dapatkan informasi provinsi
    const provinsi = wilayahData.provinsi[provinsiCode] || "TIDAK DIKETAHUI";
    
    // Cari kabupaten dan kecamatan (dalam implementasi lengkap akan menggunakan database lengkap)
    // Untuk sementara gunakan placeholder
    const kotakab = `KAB/KOTA DI ${provinsi}`;
    const kecamatan = `KECAMATAN DI ${kotakab}`;
    
    // Hitung usia
    const birthDate = moment(`${fullTahun}-${bulan}-${tanggal}`, "YYYY-MM-DD");
    const now = moment();
    const usia = `${now.diff(birthDate, 'years')} Tahun ${now.diff(birthDate, 'months') % 12} Bulan ${now.diff(birthDate, 'days') % 30} Hari`;
    
    // Hitung sisa hari ke ulang tahun berikutnya
    const nextBirthday = moment(`${now.year()}-${bulan}-${tanggal}`, "YYYY-MM-DD");
    if (nextBirthday.isBefore(now)) {
      nextBirthday.add(1, 'years');
    }
    const ultah = `${nextBirthday.diff(now, 'months')} Bulan ${nextBirthday.diff(now, 'days') % 30} Hari Lagi`;
    
    // Tentukan zodiak
    const zodiak = getZodiak(tanggal, bulan);
    
    // Tentukan hari pasaran (implementasi sederhana)
    const pasaran = `${getDayName(tanggal, bulan, fullTahun)}, ${tanggal} ${getMonthName(bulan)} ${fullTahun}`;
    
    // Kode pos (placeholder)
    const kodepos = "00000";
    
    return {
      status: "success",
      pesan: "NIK valid",
      data: {
        nik: nik,
        kelamin: jenisKelamin,
        lahir: lahir,
        provinsi: provinsi,
        kotakab: kotakab,
        kecamatan: kecamatan,
        uniqcode: nik.substring(12, 16),
        tambahan: {
          kodepos: kodepos,
          pasaran: pasaran,
          usia: usia,
          ultah: ultah,
          zodiak: zodiak
        }
      }
    };
  } catch (error) {
    return {
      status: "error",
      pesan: "Terjadi kesalahan saat memproses NIK"
    };
  }
}

// Fungsi helper untuk mendapatkan nama zodiak
function getZodiak(tanggal, bulan) {
  if ((bulan === 1 && tanggal >= 20) || (bulan === 2 && tanggal <= 18)) return "Aquarius";
  if ((bulan === 2 && tanggal >= 19) || (bulan === 3 && tanggal <= 20)) return "Pisces";
  if ((bulan === 3 && tanggal >= 21) || (bulan === 4 && tanggal <= 19)) return "Aries";
  if ((bulan === 4 && tanggal >= 20) || (bulan === 5 && tanggal <= 20)) return "Taurus";
  if ((bulan === 5 && tanggal >= 21) || (bulan === 6 && tanggal <= 20)) return "Gemini";
  if ((bulan === 6 && tanggal >= 21) || (bulan === 7 && tanggal <= 22)) return "Cancer";
  if ((bulan === 7 && tanggal >= 23) || (bulan === 8 && tanggal <= 22)) return "Leo";
  if ((bulan === 8 && tanggal >= 23) || (bulan === 9 && tanggal <= 22)) return "Virgo";
  if ((bulan === 9 && tanggal >= 23) || (bulan === 10 && tanggal <= 22)) return "Libra";
  if ((bulan === 10 && tanggal >= 23) || (bulan === 11 && tanggal <= 21)) return "Scorpio";
  if ((bulan === 11 && tanggal >= 22) || (bulan === 12 && tanggal <= 21)) return "Sagittarius";
  return "Capricorn";
}

// Fungsi helper untuk mendapatkan nama hari
function getDayName(tanggal, bulan, tahun) {
  const date = new Date(tahun, bulan - 1, tanggal);
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return days[date.getDay()];
}

// Fungsi helper untuk mendapatkan nama bulan
function getMonthName(bulan) {
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return months[bulan - 1];
}

module.exports = {
  name: 'ceknik2',
  desc: 'Cek informasi dari NIK KTP (2 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    // Cek limit dan permission dengan helper function
    const requiredLimit = 5;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    
    if (!check.canUse) {
      // If there's an extra property with reply_markup, use it
      if (check.extra) {
        return ctx.reply(check.message, check.extra);
      } else {
        return ctx.reply(check.message);
      }
    }
    
    const user = check.user;

    const args = ctx.args;
    const nik = args[0];

    if (!nik) {
      return ctx.reply('Penggunaan: /ceknik2 <nomor NIK>\nContoh: /ceknik2 3204110609970001');
    }

    try {
      // Validasi format NIK
      if (!/^\d{16}$/.test(nik)) {
        return ctx.reply('❌ *Format NIK tidak valid*\n\nPastikan NIK terdiri dari 16 digit angka.\n\nContoh: `/ceknik2 3204110609970001`', { parse_mode: 'Markdown' });
      }
      
      // Mengirim pesan bahwa permintaan sedang diproses
      const processingMsg = await ctx.reply(`⏳ *Memproses NIK ${nik}...*\n\nHarap tunggu sebentar.`, { parse_mode: 'Markdown' });

      // Proses NIK menggunakan fungsi parseNIK
      const result = parseNIK(nik);
      
      // Format hasil untuk ditampilkan
      let responseText = `HASIL PEMERIKSAAN NIK\n\n`;
      
      if (result.status === "success") {
        const data = result.data;
        const tambahan = data.tambahan;
      
        responseText += `✅ Status: ${result.pesan}\n\n`;
      
        responseText += `📝 INFORMASI DASAR\n`;
        responseText += `🆔 NIK: \`${data.nik}\`\n`;
        responseText += `👤 Jenis Kelamin: ${data.kelamin}\n`;
        responseText += `🎂 Tanggal Lahir: ${data.lahir}\n`;
        responseText += `🌍 Provinsi: ${data.provinsi}\n`;
        responseText += `🏙️ Kota/Kabupaten: ${data.kotakab}\n`;
        responseText += `🏞️ Kecamatan: ${data.kecamatan}\n\n`;
      
        responseText += `📌 INFORMASI TAMBAHAN\n`;
        responseText += `📮 Kode Pos: ${tambahan.kodepos}\n`;
        responseText += `📅 Hari Pasaran: ${tambahan.pasaran}\n`;
        responseText += `🔢 Usia: ${tambahan.usia}\n`;
        responseText += `🎉 Ulang Tahun: ${tambahan.ultah}\n`;
        responseText += `♈ Zodiak: ${tambahan.zodiak}\n`;
      } else {
        responseText += `❌ *Status:* ${result.pesan}\n`;
      }
      
      
      // Mengurangi limit pengguna jika bukan owner
      let limitInfo = '';
      if (!check.isOwner) {
        limitInfo = await reduceLimit(user, db, requiredLimit);
      } else {
        limitInfo = '\n\n👑 Owner Mode: Tidak menggunakan limit';
      }
      
      // Mengirim hasil dengan format Markdown dan info limit
      await ctx.reply(
    "```" + responseText + limitInfo + "```", 
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
      
    } catch (error) {
      // Tangani error
      try {
        let errorMessage = '❌ *Terjadi kesalahan*\n\n';
        
        if (error.message) {
          errorMessage += error.message;
        } else {
          errorMessage += 'Maaf, terjadi kesalahan saat memproses NIK. Silakan coba lagi nanti.';
        }
        
        await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
      } catch (finalError) {
        // Jika semua gagal, kirim pesan sederhana tanpa format
        await ctx.reply("Terjadi kesalahan saat memeriksa NIK. Silakan coba lagi nanti.");
      }
    }
  }
};
