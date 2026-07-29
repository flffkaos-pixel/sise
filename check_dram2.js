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
  
  // Look for all tables
  $('table').each((i, table) => {
    const text = $(table).text();
    if (text.includes('$') || text.includes('DDR') || text.includes('NAND')) {
      console.log('=== Table', i, '===');
      console.log(text.substring(0, 500));
      console.log('');
    }
  });
  
  // Also check for specific elements
  $('*').each((i, el) => {
    const text = $(el).text().trim();
    if (text.match(/^\$\s*\d+\.?\d*$/)) {
      console.log('Price element:', text, $(el).attr('class') || $(el).attr('id') || '');
    }
  });
  
  // Check for common price containers
  const selectors = ['.price', '.spot-price', '[class*="price"]', '[id*="price"]', '.spot_price'];
  selectors.forEach(sel => {
    const els = $(sel);
    if (els.length) console.log('Selector', sel, ':', els.length);
  });
}

main();