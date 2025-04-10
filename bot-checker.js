const fetch = require('node-fetch');
const TelegramBot = require('node-telegram-bot-api');

// 🔐 Токен бота и твой Telegram ID
const token = '7752409637:AAGyOahq728RyWlIqYR_8aKZ26IFhFo8asA';
const adminId = '502969715'; // можно узнать через @userinfobot

const bot = new TelegramBot(token, { polling: false });

// 💾 Здесь храним ID уже отправленных объявлений (можно заменить на базу)
let knownIds = new Set();

async function checkNewAds() {
  try {
    const res = await fetch('https://example.com/api/ads'); // <-- заменить на твой URL
    const ads = await res.json();

    for (const ad of ads) {
      if (
        ad.category === 'нужная категория' &&
        !knownIds.has(ad.id)
      ) {
        knownIds.add(ad.id);

        // ✉️ Отправка сообщения в Telegram
        await bot.sendMessage(adminId, `Новое объявление:\n${ad.title}\n${ad.link}`);
      }
    }
  } catch (err) {
    console.error('Ошибка при проверке объявлений:', err);
  }
}

// 🔁 Запуск каждые 30 секунд
setInterval(checkNewAds, 30000);
