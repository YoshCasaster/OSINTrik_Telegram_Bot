# 🕵️‍♂️ OSINTrix Telegram Bot

# ⛔ JANGAN DI JUAL, KETAHUAN DI JUAL GORENG RAME RAME

## 🙏🏻 Penyalahgunaan Tools ini Bukan tanggung jawab Saya sebagai pembuat tools ini. Terimakasih

Selamat datang di **OSINTrix**!
Bot Telegram OSINT (Open Source Intelligence) paling gaul, siap bantu kamu ngulik info dari internet cuma lewat chat! 🚀

👉 [Join Komunitas OSINT Telegram](https://t.me/+dqfsXiiyTTozODUx)
🍀 [WEBSITE CODEFOMO](https://codefomo.xyz)
🚩 [CH WHATSAPP CODEFOMO](https://www.whatsapp.com/channel/0029VafzAqeFSAszE4uo132D)

---

## ✨ Fitur Utama (Kategori OSINT)

| Command                      | Fungsi                                           |
| ---------------------------- | ------------------------------------------------ |
| `/cekfb`                     | Cek akun Facebook dari nomor/email               |
| `/cekig`                     | Cek info akun Instagram                          |
| `/cekmail1`                  | Cek status email (versi 1)                       |
| `/cekmail2`                  | Cek status email (versi 2)                       |
| `/cekstatusmail`             | Validasi email via SMTP (cek aktif/tidak)        |
| `/cekdomain`                 | Cek info domain (whois, status, dll)             |
| `/cekdomain2`                | Cek info domain (versi lain)                     |
| `/cekdomain3`                | Cek lokasi & info IP/domain via ip-api.com       |
| `/cekewallet`                | Cek nomor di layanan e-wallet Indonesia          |
| `/cekimg`                    | Reverse image search (Google Images)             |
| `/cekimg2`                   | Google Images search by keyword (scrape terbaru) |
| `/cekarchive`                | Cari arsip website di archive.org                |
| `/facecek`                   | Cari wajah di internet (FaceCheck.id)            |
| `/cektele`                   | Cek info nomor Telegram                          |
| `/ceknik`                    | Cek info NIK (Nomor Induk Kependudukan)          |
| `/cekpelajar`                | Cek status pelajar                               |
| `/cekrekening`               | Cek info rekening bank                           |
| `/cektiktok`                 | Cek info akun TikTok                             |
| `/cekusername`               | Cek ketersediaan username di berbagai platform   |
| ...dan masih banyak lagi! 🔥 |                                                  |

---

## 🚀 Cara Pasang OSINTrix Bot

1. **Clone repo ini**

   ```bash
   git clone https://github.com/username/OSINTrix_Telegram_Bot.git
   cd OSINTrix_Telegram_Bot
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Edit konfigurasi bot**

   * Buka file `bot.config.js`
   * Ganti `TOKEN` dengan token bot Telegram kamu
   * Ganti `OWNER_ID` dengan ID Telegram kamu (owner)
   * (Opsional) Edit `useragent.txt` dan `proxy.txt` untuk menghindari blokir saat scraping

4. **Jalankan bot**

   ```bash
   npm run dev
   ```

---

## 📝 Cara Pakai

* Chat ke bot kamu di Telegram
* Ketik command OSINT, contoh:

  ```
  /cekig username
  /cekmail1 email@example.com
  ```
* Ikuti instruksi dari bot!

---

## ⚠️ Catatan Penting

* Beberapa fitur scraping bisa gagal jika Google/target mendeteksi bot
* Gunakan proxy & user-agent acak agar lebih aman
* Validasi email SMTP **tidak selalu akurat** untuk Gmail/Yahoo karena proteksi server
* Limit per fitur bisa diatur — **owner bebas atur limit! 👑**
* Semua data user & group tersimpan di `database.json` (format custom, bukan SQL)

---

## 👑 Fitur Owner

* Ban/unban user
* Broadcast pesan
* Reset limit user
* Cek status bot

---

## 🤝 Kontribusi & Support

* Pull request dan issue sangat welcome!
* Saran fitur baru? DM owner atau buka issue di GitHub

---

## 🧑‍💻 Credits

Dibuat dengan ❤️ oleh **YoshCasaster**
Powered by **Node.js**, **Telegraf**, dan komunitas OSINT Indonesia

---
## 🚀 Kontribusi GitHub

| [![Yosh](https://github.com/YoshCasaster.png?size=100)](https://github.com/YoshCasaster) | [![Lucksi](https://github.com/Lucksi.png?size=100)](https://github.com/Lucksi) |
|:--:|:--:|
| [@YoshCasaster](https://github.com/YoshCasaster) | [@Lucksi](https://github.com/Lucksi) |
---
Join Kontribusi, buat issue aja yaa >> [Up Issue ](https://github.com/YoshCasaster/OSINTrik_Telegram_Bot/issues)
---

🎉 Selamat ngulik, semoga bermanfaat!
Jangan lupa share ke temen-temen OSINT kamu!
🔥🕵️‍♂️🔥
