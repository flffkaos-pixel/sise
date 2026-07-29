const https = require('https');
const cheerio = require('cheerio');

async function check(url, name) {
  return new Promise(r => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, application/xml;q=0.9' }, timeout: 5000 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const $ = cheerio.load(d, { xmlMode: true });
        const items = [];
        $('item').each((_, el) => {
          const $el = $(el);
          items.push($el.find('title').text().trim());
        });
        console.log(name + ': ' + items.length + ' items');
        if (items.length) console.log('  e.g. ' + items[0].substring(0, 60));
        r();
      });
    }).on('error', e => { console.log(name + ': ERR ' + e.message); r(); });
  });
}

(async () => {
  await check('https://www.etnews.com/Section902.rss', 'etnews 902');
  await check('https://www.etnews.com/Section903.rss', 'etnews 903');
  await check('https://news.google.com/rss/search?q=%EA%B8%88%EC%9C%B5+%EC%A3%BC%EC%8B%9D&hl=ko&gl=KR&ceid=KR:ko', 'Google News 1');
  await check('https://news.google.com/rss/search?q=%EB%B9%84%ED%8A%B8%EC%BD%94%EC%9D%B8+%EC%BD%94%EC%8A%A4%ED%94%BC+%ED%99%98%EC%9C%A8&hl=ko&gl=KR&ceid=KR:ko', 'Google News 2');
  await check('https://rss.etnews.com/Section902.xml', 'etnews rss 902');
})();