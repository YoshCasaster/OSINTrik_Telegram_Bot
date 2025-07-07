const { searchPDDIKTI } = require('../../core/pddikti-scraper');
const { checkLimitAndPermission, reduceLimit } = require('../../core/limitHandler');

module.exports = {
  name: 'cekpelajar',
  desc: 'Cek data mahasiswa/dosen di PDDIKTI (3 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    // Cek limit dan permission dengan helper function
    const requiredLimit = 3;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    
    if (!check.canUse) {
      return ctx.reply(check.message);
    }
    
    const user = check.user;

    const args = ctx.args;
    const query = args.join(' ');

    if (!query) {
      return ctx.reply('Penggunaan: /cekpelajar <nama>\nContoh: /cekpelajar Jhon Doe');
    }

    // Mengirim pesan bahwa permintaan sedang diproses
    const processingMsg = await ctx.reply(`⏳ *Mencari data "${query}" di PDDIKTI...*\n\nHarap tunggu, proses mungkin memakan waktu beberapa detik.`, { parse_mode: 'Markdown' });
    
    try {
      // Mencari data di PDDIKTI menggunakan modul scraper
      const data = await searchPDDIKTI(query);
      
      // Mengurangi limit pengguna jika bukan owner
      let limitInfo = '';
      if (!check.isOwner) {
        user.limit -= requiredLimit;
        await db.save();
        limitInfo = `\n💫 Limit kamu: ${user.limit} (-${requiredLimit})`;
      } else {
        limitInfo = '\n👑 Owner Mode: Tidak menggunakan limit';
      }
      
      if (!data || 
          ((!data.mahasiswa || data.mahasiswa.length === 0) && 
           (!data.dosen || data.dosen.length === 0) && 
           (!data.pt || data.pt.length === 0) && 
           (!data.prodi || data.prodi.length === 0))) {
        return ctx.reply(`❌ *Data tidak ditemukan*\n\nTidak ditemukan data untuk pencarian "${query}" di PDDIKTI.${limitInfo}`, { parse_mode: 'Markdown' });
      }
      
      // Format hasil pencarian
      let message = `🎓 HASIL PENCARIAN PDDIKTI\n\n`;
      
      // Menampilkan data mahasiswa
      if (data.mahasiswa && data.mahasiswa.length > 0) {
        message += `MAHASISWA (${data.mahasiswa.length})\n\n`;
        
        // Batasi maksimal 5 data
        const limitedResults = data.mahasiswa.slice(0, 5);
        
        for (const [index, mhs] of limitedResults.entries()) {
          message += `${index + 1}. ${mhs.nama || 'Tidak ada nama'}\n`;
          if (mhs.nim) message += `  NIM: ${mhs.nim}\n`;
          if (mhs.nama_pt) message += `  PT: ${mhs.nama_pt}\n`;
          if (mhs.singkatan_pt) message += `  SINGKATAN PT: ${mhs.singkatan_pt}\n`;
          if (mhs.nama_prodi) message += `  PRODI: ${mhs.nama_prodi}\n`;
          if (mhs.jenjang) message += `  JENJANG: ${mhs.jenjang}\n`;
          if (mhs.status) message += `  STATUS: ${mhs.status}\n`;
          message += '\n';
        }
        
        if (data.mahasiswa.length > 5) {
          message += `_...dan ${data.mahasiswa.length - 5} data mahasiswa lainnya_\n\n`;
        }
      }
      
      // Menampilkan data dosen
      if (data.dosen && data.dosen.length > 0) {
        message += `DOSEN (${data.dosen.length})\n\n`;
        
        // Batasi maksimal 5 data
        const limitedResults = data.dosen.slice(0, 5);
        
        for (const [index, dsn] of limitedResults.entries()) {
          message += `*${index + 1}. ${dsn.nama || 'Tidak ada nama'}*\n`;
          if (dsn.nidn) message += `  NIDN: ${dsn.nidn}\n`;
          if (dsn.nama_pt) message += `  PT: ${dsn.nama_pt}\n`;
          message += '\n';
        }
        
        if (data.dosen.length > 5) {
          message += `_...dan ${data.dosen.length - 5} data dosen lainnya_\n\n`;
        }
      }
      
      // Menampilkan data perguruan tinggi
      if (data.pt && data.pt.length > 0) {
        message += `PERGURUAN TINGGI (${data.pt.length})\n\n`;
        
        // Batasi maksimal 5 data
        const limitedResults = data.pt.slice(0, 5);
        
        for (const [index, pt] of limitedResults.entries()) {
          message += `*${index + 1}. ${pt.nama || 'Tidak ada nama'}*\n`;
          if (pt.singkatan) message += `  SINGKATAN: ${pt.singkatan}\n`;
          if (pt.status) message += `  STATUS: ${pt.status}\n`;
          if (pt.alamat) message += `  ALAMAT: ${pt.alamat}\n`;
          message += '\n';
        }
        
        if (data.pt.length > 5) {
          message += `_...dan ${data.pt.length - 5} data perguruan tinggi lainnya_\n\n`;
        }
      }
      
      // Menampilkan data program studi
      if (data.prodi && data.prodi.length > 0) {
        message += `PROGRAM STUDI (${data.prodi.length})\n\n`;
        
        // Batasi maksimal 5 data
        const limitedResults = data.prodi.slice(0, 5);
        
        for (const [index, prodi] of limitedResults.entries()) {
          message += `*${index + 1}. ${prodi.nama || 'Tidak ada nama'}*\n`;
          if (prodi.jenjang) message += `  JENJANG: ${prodi.jenjang}\n`;
          if (prodi.nama_pt) message += `  PT: ${prodi.nama_pt}\n`;
          if (prodi.akreditasi) message += `  AKREDITASI: ${prodi.akreditasi}\n`;
          message += '\n';
        }
        
        if (data.prodi.length > 5) {
          message += `_...dan ${data.prodi.length - 5} data program studi lainnya_\n\n`;
        }
      }
      
      // Tambahkan informasi waktu pencarian dan limit
      message += `🕒 Hasil diperbarui pada: ${new Date().toLocaleString('id-ID')}${limitInfo}\n`;
      message += `🤖 Bot by: @Toretinyy`;
      
      // Mengirim hasil dengan format Markdown
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
      console.error('Error saat mencari data PDDIKTI:', error);
      let errorMessage = '❌ *Terjadi kesalahan saat mencari data PDDIKTI*\n\n';
      
      if (error.message) {
        errorMessage += `Detail: ${error.message}`;
      }
      
      await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
    }
  }
};
