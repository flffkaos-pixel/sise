const https = require('https');

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
  const urls = [
    'https://www.dramexchange.com/',
    'https://www.dramexchange.com/WeeklyResearch/SpotPrice.aspx',
    'https://www.dramexchange.com/SpotPrice.aspx',
    'https://www.dramexchange.com/SpotPrice/DDR4.aspx',
    'https://www.dramexchange.com/SpotPrice/DDR5.aspx',
    'https://www.dramexchange.com/SpotPrice/NAND.aspx',
    'https://www.trendforce.com.tw/',
    'https://www.trendforce.com/presscenter/',
  ];
  
  for (const url of urls) {
    const res = await fetch(url);
    console.log('===', url, '===', res.status);
    if (res.status === 200) {
      const body = res.body;
      // Find price patterns
      const prices = body.match(/\$\s*\d+\.?\d*/g) || [];
      const ddr = body.match(/DDR[345]|LPDDR[345]/gi) || [];
      const nand = body.match(/NAND|eMMC|UFS/gi) || [];
      console.log('  Prices:', prices.slice(0, 10));
      console.log('  DDR:', [...new Set(ddr)].slice(0, 10));
      console.log('  NAND:', [...new Set(nand)].slice(0, 10));
      // Check for tables
      if (body.includes('<table')) console.log('  Has tables: YES');
    }
    console.log('');
  }
}

main();