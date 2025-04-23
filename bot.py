import asyncio
import json
import os
import logging
from playwright.async_api import async_playwright
from telegram import Bot
from telegram.constants import ParseMode

# 🎯 Настройки
TOKEN = '7752409637:AAGyOahq728RyWlIqYR_8aKZ26IFhFo8asA'  # проверь токен!
ADMIN_ID = '502969715'  # проверь ID
LINKS_FILE = 'known_links.json'
FILTERS_FILE = 'filters.json'
URL = "https://makler.md/ru/real-estate/real-estate-for-sale/houses-for-sale?list®ion[]=3&city[]=1112&city[]=1113&city[]=2&city[]=1248&city[]=4&city[]=3129&city[]=2597&city[]=5&city[]=41&city[]=43&city[]=1250&city[]=3465&city[]=1519&city[]=1249&city[]=1251¤cy_id=5&list=detail"

# ✅ Логгирование
logging.basicConfig(
    level=logging.INFO,
    filename="makler_bot.log",
    filemode="a",
    format="%(asctime)s - %(levelname)s - %(message)s"
)

bot = Bot(token=TOKEN)

# ✅ Загрузка фильтров
def load_filters():
    if os.path.exists(FILTERS_FILE):
        try:
            with open(FILTERS_FILE, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            logging.error("Поврежден filters.json, используются значения по умолчанию")
    return {'max_price': 30000, 'city': ['Тирасполь', 'Tiraspol']}

FILTERS = load_filters()

# ✅ Загрузка и сохранение известных ссылок
def load_known_links():
    if os.path.exists(LINKS_FILE):
        try:
            with open(LINKS_FILE, 'r') as f:
                return set(json.load(f))
        except json.JSONDecodeError:
            logging.error("Поврежден known_links.json, начинаем заново")
            return set()
    return set()

def save_known_links(links):
    with open(LINKS_FILE, 'w') as f:
        json.dump(list(links), f)

known_links = load_known_links()

# ✅ Вспомогательные функции
async def get_inner_text(article, selector):
    el = await article.query_selector(selector)
    return await el.inner_text() if el else ''

async def get_attr(article, selector, attr):
    el = await article.query_selector(selector)
    return await el.get_attribute(attr) if el else ''

# ✅ Основной парсинг
async def check_makler():
    logging.info("Запуск check_makler")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            logging.info(f"Переход на {URL}")
            await page.goto(URL, wait_until='networkidle', timeout=60000)
            await auto_scroll(page)
        except Exception as e:
            logging.error(f"Не удалось загрузить страницу: {e}")
            await browser.close()
            return

        articles = await page.query_selector_all('article')
        logging.info(f"🔎 Найдено {len(articles)} объявлений")

        for article in articles:
            img = await get_attr(article, 'img', 'src')
            title = await get_inner_text(article, '.ls-detail_anUrl span')
            price = await get_inner_text(article, '.ls-detail_price')
            date = await get_inner_text(article, '.ls-detail_time')
            city = await get_inner_text(article, '#pointer_icon')
            phone = await get_inner_text(article, '.phone_icon')
            desc = await get_inner_text(article, '.subfir')
            href = await get_attr(article, '.ls-detail_anUrl', 'href')
            link = f'https://makler.md{href}' if href else ''

            logging.info(f"Извлечено: title={title}, price={price}, city={city}, link={link}, img={img}")

            # Фильтр по цене
            try:
                price_value = float(''.join(filter(str.isdigit, price.replace(',', ''))))
                if price_value > FILTERS['max_price']:
                    logging.info(f"Пропущено: цена {price_value} выше {FILTERS['max_price']}")
                    continue
            except ValueError:
                logging.warning(f"Не удалось распознать цену: {price}")
                continue

            # Фильтр по городу
            if not any(city_name.lower() in city.lower() for city_name in FILTERS['city']):
                logging.info(f"Пропущено: город {city} не в списке {FILTERS['city']}")
                continue

            if not link:
                logging.info("Пропущено: ссылка отсутствует")
                continue
            if link in known_links:
                logging.info(f"Пропущено: ссылка уже известна - {link}")
                continue

            known_links.add(link)
            save_known_links(known_links)

            message = f"""
🏡 *{title}*
💰 {price}
📍 {city}
📞 {phone}
📅 {date}
📝 {desc}
🔗 [Смотреть объявление]({link})
            """.strip()

            logging.info(f'📬 Отправляю: {title}')
            try:
                await bot.send_message(chat_id=ADMIN_ID, text=message, parse_mode=ParseMode.MARKDOWN)
                logging.info("Сообщение успешно отправлено")
            except Exception as e:
                logging.error(f"⚠️ Ошибка при отправке: {e}")

        await browser.close()

async def auto_scroll(page):
    previous_height = await page.evaluate("() => document.body.scrollHeight")
    while True:
        await page.evaluate("() => window.scrollBy(0, window.innerHeight)")
        await asyncio.sleep(1)
        new_height = await page.evaluate("() => document.body.scrollHeight")
        if new_height == previous_height:
            break
        previous_height = new_height

# ✅ Цикл проверки
async def main():
    logging.info("Запуск главного цикла")
    while True:
        try:
            await check_makler()
        except Exception as e:
            logging.error(f"Ошибка в главном цикле: {e}")
        await asyncio.sleep(60)

# 🚀 Запуск
if __name__ == '__main__':
    asyncio.run(main())