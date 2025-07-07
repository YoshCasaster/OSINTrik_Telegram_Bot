const axios = require('axios');

module.exports = async (ctx, bot) => {
  const msg = ctx.message || ctx.channelPost || ctx.editedMessage || ctx.editedChannelPost;
  if (!msg) return ctx;
  ctx.body = msg.text || msg.caption || '';
  ctx.command = ctx.body.startsWith('/') ? ctx.body.trim().split(' ')[0].slice(1) : null;
  ctx.text = ctx.body.split(' ').slice(1).join(' ').trim();
  ctx.args = ctx.text ? ctx.text.split(' ') : [];
  ctx.chat = msg.chat;
  ctx.from = msg.from;
  ctx.senderId = msg.from?.id || null;
  ctx.username = msg.from?.username || msg.from?.first_name || `user-${ctx.senderId || 'unknown'}`;
  ctx.isGroup = ['group', 'supergroup'].includes(msg.chat?.type);
  ctx.chatId = msg.chat?.id;
  ctx.chatName = msg.chat?.title || msg.chat?.username || `chat-${ctx.chatId}`;
  ctx.fromMe = ctx.senderId === (await bot.telegram.getMe()).id;
  ctx.type = getMessageType(msg);
  ctx.mentions = msg.entities?.filter(e => ['mention', 'text_mention'].includes(e.type)) || [];
  if (msg.reply_to_message) {
    const q = msg.reply_to_message;
    ctx.isQuoted = true;
    ctx.quoted = {
      message: q,
      text: q.text || q.caption || '',
      type: getMessageType(q),
      from: q.from?.id,
      name: q.from?.first_name || q.from?.username || 'Unknown',
      isMedia: hasMedia(q),
      download: async () => {
        const fileId = getFileId(q);
        if (!fileId) return null;
        const link = await bot.telegram.getFileLink(fileId);
        const res = await axios.get(link.href, { responseType: 'arraybuffer' });
        return Buffer.from(res.data);
      }
    };
  } else {
    ctx.isQuoted = false;
  }
  ctx.isMedia = hasMedia(msg);
  if (ctx.isMedia) {
    ctx.download = async () => {
      const fileId = getFileId(msg);
      if (!fileId) return null;
      const link = await bot.telegram.getFileLink(fileId);
      const res = await axios.get(link.href, { responseType: 'arraybuffer' });
      return Buffer.from(res.data);
    };
  }
  ctx.mentionUser = async (text, userId, name = 'User') => {
    return ctx.reply(text, {
      parse_mode: 'HTML',
      entities: [{
        type: 'text_mention',
        offset: text.indexOf(name),
        length: name.length,
        user: {
          id: userId,
          is_bot: false,
          first_name: name
        }
      }]
    });
  };
  ctx.htmlMention = (name, id) => `<a href="tg://user?id=${id}">${name}</a>`;

  return ctx;
};

function getMessageType(msg) {
  if (msg.photo) return 'photo';
  if (msg.document) return 'document';
  if (msg.video) return 'video';
  if (msg.audio) return 'audio';
  if (msg.voice) return 'voice';
  if (msg.sticker) return 'sticker';
  if (msg.text) return 'text';
  return 'unknown';
}

function hasMedia(msg) {
  return !!(msg.document || msg.photo || msg.video || msg.audio || msg.voice || msg.sticker);
}

function getFileId(msg) {
  return msg.document?.file_id ||
   msg.photo?.slice(-1)[0]?.file_id ||
   msg.video?.file_id ||
   msg.audio?.file_id ||
   msg.voice?.file_id ||
   msg.sticker?.file_id;
}