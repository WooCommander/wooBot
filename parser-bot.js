
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch'); // ← вот это оставить
const cheerio = require('cheerio');


const bot = new TelegramBot(token, { polling: false });

const url = 'https://makler.md/ru/transport/cars?list&currency_id=5&list=detail';

let knownLinks = new Set();

async function checkMakler() {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    $('.items-box .item-box').each(async (i, elem) => {
      const title = $(elem).find('.item-title').text().trim();
      const price = $(elem).find('.item-price').text().trim();
      const link = 'https://makler.md' + $(elem).find('a.item-title').attr('href');

      if (!knownLinks.has(link)) {
        knownLinks.add(link);

        const message = `🚗 *Новое объявление:*\n*${title}*\n💰 ${price}\n🔗 [Открыть объявление](${link})`;
        await bot.sendMessage(adminId, message, { parse_mode: 'Markdown' });
      }
    });

    console.log('Проверка завершена');
  } catch (err) {
    console.error('Ошибка при парсинге:', err.message);
  }
}

// Проверка каждые 60 секунд
setInterval(checkMakler, 60000);
