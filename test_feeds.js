const https = require('https');
const cheerio = require('cheerio');

async function testFeed(url, name) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try {
          const $ = cheerio.load(d, { xmlMode: true });
          const items = [];
          $('item').each((_, el) => {
            const $el = $(el);
            items.push({
              title: $el.find('title').text().trim(),
              link: $el.find('link').text().trim()
            });
          });
          console.log(name + ': ' + items.length + ' items');
          if (items.length) console.log('  First: ' + items[0].title.substring(0, 60));
        } catch (e) {
          console.log(name + ': PARSE ERROR - ' + e.message);
        }
        resolve();
      });
    }).on('error', e => { console.log(name + ': FETCH ERROR - ' + e.message); resolve(); })
      .on('timeout', () => { console.log(name + ': TIMEOUT'); resolve(); });
  });
}

const feeds = [
  ['https://finance.naver.com/rss/news_section.rss', 'Naver Finance Section'],
  ['https://finance.naver.com/rss/news_main.rss', 'Naver Finance Main'],
  ['https://news.naver.com/main/rss.nhn?sid1=101', 'Naver Economy'],
  ['https://news.naver.com/main/rss.nhn?sid1=259', 'Naver Finance'],
  ['https://news.naver.com/main/rss.nhn?sid1=258', 'Naver Securities'],
  ['https://news.daum.net/rss/economy.xml', 'Daum Economy'],
  ['https://news.daum.net/rss/stock.xml', 'Daum Stock'],
  ['https://www.edaily.co.kr/rss/economy.xml', 'Edaily'],
  ['https://www.mk.co.kr/rss/30000001/', 'Maeil Economy'],
  ['https://www.hankyung.com/rss/finance.xml', 'Hankyung'],
  ['https://www.sedaily.com/rss/finance.xml', 'Sedaily'],
];

(async () => {
  for (const [url, name] of feeds) {
    await testFeed(url, name);
  }
})();