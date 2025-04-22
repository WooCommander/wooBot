import fetch from 'node-fetch';
import cheerio from 'cheerio';

const url = 'https://makler.md/ru/real-estate/real-estate-for-sale/houses-for-sale?list&cy_id=5&list=detail';

let knownLinks = new Set();

async function checkMakler() {
  console.log('⏰ Начало проверки:', new Date().toISOString());
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    console.log('Статус ответа:', response.status);
    const html = await response.text();
    console.log('HTML длина:', html.length);

    const $ = cheerio.load(html);
    console.log('Найдено статей:', $('article').length);

    // ... остальной код без изменений
  } catch (err) {
    console.error('❌ Ошибка при парсинге:', err.message);
  }
}

setInterval(checkMakler, 60000);
checkMakler();