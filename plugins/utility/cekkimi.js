const axios = require('axios');
const { checkLimitAndPermission } = require('../../core/limitHandler');

class ApiClient {
  constructor() {
    console.log('[INIT] Initializing ApiClient...');
    this.BASE_URL = 'https://www.kimi.com/api';
    this.accessToken = null;
    this.refreshToken = null;
    
    this.deviceId = this.generateRandomId();
    this.sessionId = this.generateRandomId();
    this.trafficId = this.deviceId;
    const randomVersion = Math.floor(Math.random() * 10) + 125;

    this._axiosInstance = axios.create({
      baseURL: this.BASE_URL,
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'id-ID,id;q=0.9',
        'content-type': 'application/json',
        'origin': 'https://www.kimi.com',
        'r-timezone': 'Asia/Makassar',
        'sec-ch-ua': `"Lemur";v="${randomVersion}", "Not A(Brand";v="99", "Microsoft Edge";v="${randomVersion}"`,
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${randomVersion}.0.0.0 Mobile Safari/537.36`,
        'x-language': 'zh-CN',
        'x-msh-device-id': this.deviceId,
        'x-msh-platform': 'web',
        'x-msh-session-id': this.sessionId,
        'x-traffic-id': this.trafficId,
      },
    });

    // Add interceptors
    this._axiosInstance.interceptors.request.use(
      config => {
        if (this.accessToken) {
          config.headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );
  }

  generateRandomId(length = 19) {
    return String(Math.floor(Math.random() * Math.pow(10, length))).padStart(length, '0');
  }

  parseStream(data) {
    return data
      .split('\n')
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trim())
      .filter(line => line && line !== '[DONE]')
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(obj => obj !== null);
  }

  async registerDevice() {
    try {
      const response = await this._axiosInstance.post('/device/register', {});
      if (response.data && response.data.access_token) {
        this._axiosInstance.defaults.headers['Authorization'] = `Bearer ${response.data.access_token}`;
        return response.data;
      }
      throw new Error('Failed to get access token');
    } catch (error) {
      throw new Error(`Device registration failed: ${error.message}`);
    }
  }

  async chat({ prompt, messages, ...rest }) {
    try {
      await this.registerDevice();
      
      const chatResponse = await this._axiosInstance.post('/chat', {
        name: "New Chat",
        born_from: "home",
        kimiplus_id: "kimi",
        is_example: false,
        source: "web",
        tags: []
      });

      if (!chatResponse.data || !chatResponse.data.id) {
        throw new Error('Failed to create chat session');
      }

      const chatId = chatResponse.data.id;

      const streamResponse = await this._axiosInstance.post(`/chat/${chatId}/completion/stream`, {
        kimiplus_id: "kimi",
        model: "kimi",
        use_search: true,
        refs: [],
        history: [],
        scene_labels: [],
        use_semantic_memory: false,
        messages: [{ role: "user", content: prompt }]
      }, {
        responseType: 'text',
        timeout: 30000 // 30 seconds timeout
      });

      const events = this.parseStream(streamResponse.data);
      return events
        .filter(obj => obj && obj.event === 'cmpl' && obj.text)
        .map(obj => obj.text)
        .join('');
        
    } catch (error) {
      if (error.response && error.response.status === 400) {
        throw new Error('Authentication failed. Please try again.');
      }
      throw error;
    }
  }
}

module.exports = {
  name: 'chatkimi',
  desc: 'Chat dengan Kimi AI (5 limit)',
  category: 'osint',
  async run(ctx, { db }) {
    const requiredLimit = 5;
    const check = await checkLimitAndPermission(ctx, db, requiredLimit);
    
    if (!check.canUse) {
      return ctx.reply(check.message);
    }
    
    const user = check.user;
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');

    if (!prompt) {
      return ctx.reply("```" + "⚠️ Format salah!\n\nContoh: /cekkimi Kapan Hari Kemerdekaan Indonesia?" + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }

    const processingMsg = await ctx.reply("```" + "🤖 Kimi sedang berpikir...\n\nHarap tunggu sebentar" + "```", {
      parse_mode: "MarkdownV2"
    });

    try {
      const apiClient = new ApiClient();
      const response = await apiClient.chat({ prompt });

      let message = `🤖 KIMI AI CHAT\n\n`;
      message += `❓ Pertanyaan:\n${prompt}\n\n`;
      message += `✨ Jawaban:\n${response.result}\n\n`;

      // Add recommended prompts if available
      if (response.recommendedPrompts && response.recommendedPrompts.length > 0) {
        message += `💡 Pertanyaan Lanjutan:\n`;
        response.recommendedPrompts.slice(0, 3).forEach((rec, i) => {
          if (rec && rec.text) {
            message += `${i + 1}. ${rec.text}\n`;
          }
        });
        message += '\n';
      }

      // Add limit info
      message += !check.isOwner 
        ? `💫 Limit: ${user.limit} (-${requiredLimit})`
        : `👑 Owner Mode: No Limit`;

      // Delete processing message
      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (error) {
        console.error('Failed to delete processing message:', error);
      }

      // Send result
      await ctx.reply("```" + message + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🤖 Chat Lagi", callback_data: "menu_ai" }]
          ]
        }
      });

      if (!check.isOwner) {
        user.limit -= requiredLimit;
        await db.save();
      }

    } catch (error) {
      console.error('Error in Kimi AI:', error);
      
      try {
        await ctx.deleteMessage(processingMsg.message_id);
      } catch (deleteError) {
        console.error('Failed to delete processing message:', deleteError);
      }
      
      await ctx.reply("```" + "❌ Terjadi kesalahan\n\nSilakan coba lagi nanti" + "```", {
        parse_mode: "MarkdownV2",
        reply_to_message_id: ctx.message.message_id
      });
    }
  }
};