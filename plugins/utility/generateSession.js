
/*
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');
require('dotenv').config({ path: __dirname + '/.env' });

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;

(async () => {
  console.log('Memulai proses login Telegram...');
  
  const client = new TelegramClient(
    new StringSession(''), // Mulai dengan session kosong
    apiId,
    apiHash,
    { connectionRetries: 5 }
  );

  await client.start({
    phoneNumber: async () => await input.text('Masukkan nomor telepon (format: +628xxx): '),
    password: async () => await input.text('Masukkan 2FA password (jika ada): '),
    phoneCode: async () => await input.text('Masukkan kode yang dikirim ke Telegram: '),
    onError: (err) => console.log(err),
  });

  console.log('\nBerhasil login! Session string:');
  console.log(await client.session.save());
  console.log('\nSimpan string di atas sebagai TELEGRAM_SESSION_URL di file .env');
})();
*/