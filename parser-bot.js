const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const token = 'ТВОЙ_ТОКЕН';
const adminId = 'ТВОЙ_ID';

const bot = new TelegramBot(token, { polling: false });
const url = 'https://makler.md/ru/real-estate/real-estate-for-sale';

let knownLinks = new Set();

async function checkMakler() {
  console.log('⏰ Начало проверки:', new Date().toISOString());
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'ru,en;q=0.9',
      }
    });
    console.log('Статус ответа:', response.status);
    const html = await response.text();
    console.log('HTML длина:', html.length);

    const $ = await cheerio.load(html);


    $('article').each(async (i, elem) => {
      const $el = $(elem);
      const img = $el.find('img').attr('src');
      const title = $el.find('.ls-detail_anUrl span').text().trim();
      const price = $el.find('.ls-detail_price').text().trim();
      const date = $el.find('.ls-detail_time').text().trim();
      const city = $el.find('#pointer_icon').text().trim();
      const phone = $el.find('.phone_icon').text().trim();
      const desc = $el.find('.subfir').text().trim();
      const link = 'https://makler.md' + $el.find('.ls-detail_anUrl').attr('href');

      console.log({ img, title, price, date, city, phone, desc, link });

      if (!link || knownLinks.has(link)) {
        console.log('Пропущено:', link);
        return;
      }
      knownLinks.add(link);

      const message = `
🏡 *${title}*
💰 ${price}
📍 ${city}
📞 ${phone}
📅 ${date}
📝 ${desc}
🔗 [Смотреть объявление](${link})
      `.trim();

      console.log('📬 Подготовлено сообщение:', title);

      try {
        await bot.sendPhoto(adminId, img, {
          caption: message,
          parse_mode: 'Markdown'
        });
        console.log('📬 Сообщение отправлено:', title);
      } catch (err) {
        console.error('❌ Ошибка при отправке:', err.message);
      }
    });

    console.log('✅ Проверка завершена');
  } catch (err) {
    console.error('❌ Ошибка при парсинге:', err.message);
  }
}


setInterval(checkMakler, 600); // 60 сек

