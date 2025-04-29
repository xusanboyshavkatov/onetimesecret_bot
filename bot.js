const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');
const crypto = require('crypto');

const token = '7834199352:AAFa4Sn4V4NG8BxmyOWvx6IGK4ssAUnHVDk';
const bot = new TelegramBot(token, { polling: true });

const botUsername = 'onetimesecret_bot'; // <-- faqat username, masalan: 'x_secret_bot'
const userStates = {};

// 9 xonali random ID
function generateSecretKey() {
  return crypto.randomBytes(5).toString('hex').slice(0, 9);
}

// /start view_... orqali kelganlar
bot.onText(/\/start(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const param = match[1];

  if (param && param.startsWith('view_')) {
    const secretKey = param.replace('view_', '');

    db.get("SELECT * FROM secrets WHERE secret_key = ?", [secretKey], (err, row) => {
      if (err || !row) {
        bot.sendMessage(chatId, "❌ Xatolik yoki xabar topilmadi.");
        return;
      }

      const isAllowed = String(row.target_id) === String(msg.from.id) || row.target_id === `@${msg.from.username}`;

      if (isAllowed) {
        bot.sendMessage(chatId, `📩 Maxfiy xabar: ${row.message}\n\n🔐 Maxfiy xabar yuborish uchun /start bosing`);
      } else {
        bot.sendMessage(chatId, "⚠️ Bu xabar siz uchun emas.");
      }
    });

    return;
  }

  // Oddiy start
  userStates[chatId] = { step: 'awaitingTarget' };
  bot.sendMessage(chatId, "Assalomu alaykum!\nKimga xabar yubormoqchisiz? ID yoki username yozing:");
});

// oddiy matnlar
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!userStates[chatId] || text.startsWith('/')) return;

  const state = userStates[chatId];

  if (state.step === 'awaitingTarget') {
    state.target = text;
    state.step = 'awaitingMessage';
    bot.sendMessage(chatId, "Endi yuboriladigan maxfiy matnni yozing:");
  } else if (state.step === 'awaitingMessage') {
    const secretText = text;
    const targetId = state.target;
    const secretKey = generateSecretKey();

    db.run(
      "INSERT INTO secrets (target_id, message, secret_key) VALUES (?, ?, ?)",
      [targetId, secretText, secretKey],
      function (err) {
        if (err) {
          console.error(err);
          bot.sendMessage(chatId, "Xatolik yuz berdi!");
          return;
        }

        const link = `https://t.me/${botUsername}?start=view_${secretKey}`;
        const inlineMessage = {
          reply_markup: {
            inline_keyboard: [[{ text: "🔐 Xabarni ko‘rish", url: link }]]
          }
        };

        bot.sendMessage(chatId, `🔐 Sizga yuborilgan maxfiy xabar mavjud. Ko‘rish uchun quyidagi tugmani bosing.\n\n🔗 Xabar linki: ${link}\n\nMaxfiy xabar yuborish uchun /start bosing`, inlineMessage);
      }
    );

    delete userStates[chatId];
  }
});

// Inline tugma orqali bosilganda
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const username = query.from.username;
  const data = query.data;

  if (data.startsWith('view_')) {
    const secretKey = data.replace('view_', '');

    db.get("SELECT * FROM secrets WHERE secret_key = ?", [secretKey], (err, row) => {
      if (err || !row) {
        bot.sendMessage(chatId, "❌ Xabar topilmadi yoki o‘chirib yuborilgan.\n\n🔐 Maxfiy xabar yuborish uchun /start bosing");
        return;
      }

      const isAllowed = String(row.target_id) === String(userId) || row.target_id === `@${username}`;

      if (isAllowed) {
        bot.sendMessage(chatId, `📩  xabar: ${row.message}\n\n🔐 Maxfiy xabar yuborish uchun /start bosing`);
      } else {
        bot.sendMessage(chatId, "⚠️ Bu xabar siz uchun emas.\n\n🔐 Maxfiy xabar yuborish uchun /start bosing");
      }
    });
  }

  bot.answerCallbackQuery(query.id);
});
