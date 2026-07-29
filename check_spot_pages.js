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
  // Check GDDR spot price page
  const res = await fetch('https://www.dramexchange.com/Price/GDDR_Spot');
  if (res.status === 200) {
    const $ = cheerio.load(res.body);
    console.log('=== GDDR Spot Price Page ===');
    $('table').each((i, t) => {
      const text = $(t).text().trim();
      if (text.includes('DDR') || text.includes('$')) {
        console.log(`--- Table ${i} ---`);
        $(t).find('tr').each((_, row) => {
          const cells = $(row).find('td, th').map((_, el) => $(el).text().trim()).get();
          if (cells.some(c => c)) console.log(cells.join(' | '));
        });
        console.log('');
      }
    });
  }
  
  // Check LPDDR spot price
  const res2 = await fetch('https://www.dramexchange.com/Price/LPDDR_Spot');
  if (res2.status === 200) {
    const $ = cheerio.load(res2.body);
    console.log('=== LPDDR Spot Price Page ===');
    $('table').each((i, t) => {
      const text = $(t).text().trim();
      if (text.includes('DDR') || text.includes('$')) {
        console.log(`--- Table ${i} ---`);
        $(t).find('tr').each((_, row) => {
          const cells = $(row).find('td, th').map((_, el) => $(el).text().trim()).get();
          if (cells.some(c => c)) console.log(cells.join(' | '));
        });
        console.log('');
      }
    });
  }
  
  // Check NAND spot price
  const res3 = await fetch('https://www.dramexchange.com/Price/NAND_Spot');
  if (res3.status === 200) {
    const $ = cheerio.load(res3.body);
    console.log('=== NAND Spot Price Page ===');
    $('table').each((i, t) => {
      const text = $(t).text().trim();
      if (text.includes('NAND') || text.includes('$')) {
        console.log(`--- Table ${i} ---`);
        $(t).find('tr').each((_, row) => {
          const cells = $(row).find('td, th').map((_, el) => $(el).text().trim()).get();
          if (cells.some(c => c)) console.log(cells.join(' | '));
        });
        console.log('');
      }
    });
  }
}

main();