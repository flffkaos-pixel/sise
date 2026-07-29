const https = require('https');
const cheerio = require('cheerio');

function fetch(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, body: d }));
    }).on('error', e => resolve({ status: 0, body: e.message }));
  });
}

async function main() {
  const res = await fetch('https://www.dramexchange.com/');
  if (res.status !== 200) return;
  
  const $ = cheerio.load(res.body);
  
  // Get full HTML of table 12 (GDDR Spot Price)
  const table12 = $('table').eq(12);
  if (table12.length) {
    console.log('=== FULL TABLE 12 ===');
    console.log(table12.html().substring(0, 5000));
  }
}

main();