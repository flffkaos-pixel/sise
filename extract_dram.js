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
  
  // Extract all tables with price data
  const tables = [12, 14, 15, 23, 37, 39];
  
  tables.forEach(idx => {
    const table = $('table').eq(idx);
    if (table.length) {
      console.log('=== Table', idx, '===');
      table.find('tr').each((i, row) => {
        const cells = $(row).find('td, th').map((_, el) => $(el).text().trim()).get();
        if (cells.some(c => c)) console.log(cells.join(' | '));
      });
      console.log('');
    }
  });
}

main();