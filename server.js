const express = require('express');
const https = require('https');
const http = require('http');
const cheerio = require('cheerio');
const app = express();
app.use(express.static(__dirname));

const T = ['USDKRW=X','EURKRW=X','JPYKRW=X','CNYKRW=X','GC=F','SI=F','CL=F','NG=F','^GSPC','^DJI','^IXIC','^VIX','^TNX','^KS11','^KQ11','^N225','^HSI','BTC-USD','ETH-USD','XRP-USD'];
const NAMES = {
  'USDKRWX':'원/달러','EURKRW=X':'유로/원','JPYKRW=X':'엔/원','CNYKRW=X':'위안/원',
  'GC=F':'금','SI=F':'은','CL=F':'WTI 원유','NG=F':'천연가스',
  '^GSPC':'S&P 500','^DJI':'다우존스','^IXIC':'나스닥','^VIX':'VIX 공포지수','^TNX':'美 10년물 금리',
  '^KS11':'코스피','^KQ11':'코스닥','^N225':'닛케이','^HSI':'항셍지수',
  'BTC-USD':'비트코인','ETH-USD':'이더리움','XRP-USD':'리플'
};
const ICONS = {
  'USDKRW=X':'💵','EURKRW=X':'💶','JPYKRW=X':'💴','CNYKRW=X':'💷',
  'GC=F':'🥇','SI=F':'🥈','CL=F':'🛢️','NG=F':'🔥',
  '^GSPC':'📈','^DJI':'🏛️','^IXIC':'💻','^VIX':'😨','^TNX':'🏦',
  '^KS11':'🇰🇷','^KQ11':'📋','^N225':'🇯🇵','^HSI':'🇭🇰',
  'BTC-USD':'₿','ETH-USD':'💎','XRP-USD':'✖️'
};
let krwRate = 1350;
let lastKrwFetch = 0;

function fetchQ(symbol, range = '1d', interval = '1d') {
  return new Promise((ok) => {
    const s = symbol.replace('^', '%5E');
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${s}?range=${range}&interval=${interval}`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try {
          const j = JSON.parse(d), result = j.chart?.result?.[0];
          if (!result || !result.meta) return ok(null);
          const m = result.meta;
          const ch = m.regularMarketPrice - m.chartPreviousClose;
          const quotes = result.indicators?.quote?.[0];
          ok({
            symbol: m.symbol || symbol,
            shortName: NAMES[symbol] || m.symbol,
            icon: ICONS[symbol] || '',
            regularMarketPrice: m.regularMarketPrice,
            regularMarketChange: ch,
            regularMarketChangePercent: (ch / m.chartPreviousClose) * 100,
            regularMarketPreviousClose: m.chartPreviousClose,
            timestamps: result.timestamp,
            opens: quotes?.open,
            highs: quotes?.high,
            lows: quotes?.low,
            closes: quotes?.close,
            volumes: quotes?.volume,
          });
        } catch { ok(null); }
      });
    });
    req.on('error', () => ok(null));
    req.on('timeout', () => { req.destroy(); ok(null); });
  });
}

async function updateKrwRate() {
  const r = await fetchQ('USDKRW=X');
  if (r && r.regularMarketPrice > 0) krwRate = r.regularMarketPrice;
}

function toKrw(item) {
  const s = item.symbol;
  const isKrwAsset = s.endsWith('KRW=X') || s === '^KS11' || s === '^KQ11';
  const rate = isKrwAsset ? 1 : krwRate;
  return { ...item, priceKrw: item.regularMarketPrice * rate, changeKrw: item.regularMarketChange * rate, changePercentKrw: item.regularMarketChangePercent, previousCloseKrw: item.regularMarketPreviousClose * rate, krwRate };
}

app.get('/api/quotes', async (req, res) => {
  const results = await Promise.allSettled(T.map(t => fetchQ(t)));
  const data = results.filter(r => r.status === 'fulfilled' && r.value).map(r => toKrw(r.value));
  res.json({ quoteResponse: { result: data } });
});

app.get('/api/history', async (req, res) => {
  const symbol = req.query.symbol;
  if (!symbol) return res.status(400).json({ error: 'missing symbol' });
  const data = await fetchQ(symbol, '1mo', '1d');
  if (!data) return res.status(502).json({ error: 'fetch failed' });
  const isKrwAsset = symbol.endsWith('KRW=X') || symbol === '^KS11' || symbol === '^KQ11';
  const rate = isKrwAsset ? 1 : krwRate;
  const history = (data.timestamps || []).map((t, i) => ({
    date: t,
    open: (data.opens?.[i] || 0) * rate,
    high: (data.highs?.[i] || 0) * rate,
    low: (data.lows?.[i] || 0) * rate,
    close: (data.closes?.[i] || 0) * rate,
    volume: data.volumes?.[i] || 0,
  })).filter(h => h.close > 0);
  res.json({ symbol: data.symbol, shortName: data.shortName, icon: data.icon, currentPrice: data.regularMarketPrice * rate, change: data.regularMarketChange * rate, changePercent: data.regularMarketChangePercent, previousClose: data.regularMarketPreviousClose * rate, krwRate, history });
});

app.get('/api/news/headlines', async (req, res) => {
  const urls = [
    'https://news.google.com/rss/search?q=%EA%B8%88%EC%9C%B5+%EC%8B%9C%EC%84%B8+%EC%A3%BC%EC%8B%9D&hl=ko&gl=KR&ceid=KR:ko',
    'https://news.google.com/rss/search?q=%EB%B9%84%ED%8A%B8%EC%BD%94%EC%9D%B8+%EC%BD%94%EC%8A%A4%ED%94%BC+%ED%99%98%EC%9C%A8&hl=ko&gl=KR&ceid=KR:ko',
    'https://news.google.com/rss/search?q=%EA%B8%80%EB%A1%9C%EB%B2%8C+%EC%A6%9D%EC%8B%9C+%EC%98%A4%EC%9D%BC+%EA%B8%88&hl=ko&gl=KR&ceid=KR:ko'
  ];
  const results = await Promise.allSettled(urls.map(u => fetchRss(u)));
  const seen = new Set();
  const all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
  const deduped = all.filter(n => { const k = n.link; if (seen.has(k)) return false; seen.add(k); return true; });
  res.json({ news: deduped.slice(0, 20) });
});

function fetchRss(url) {
  return new Promise((ok) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try {
          const $ = cheerio.load(d, { xmlMode: true });
          const items = [];
          $('item').each((_, el) => {
            const $el = $(el);
            const desc = $el.find('description').text();
            const summary = desc ? desc.replace(/<[^>]*>/g, '').trim().slice(0, 300) : '';
            items.push({
              title: $el.find('title').text().trim(),
              link: $el.find('link').text().trim(),
              publisher: $el.find('source').text().trim() || new URL($el.find('link').text().trim()).hostname.replace('www.', ''),
              summary,
              time: Math.floor(new Date($el.find('pubDate').text()).getTime() / 1000),
              uuid: $el.find('guid').text() || $el.find('link').text()
            });
          });
          ok(items);
        } catch { ok([]); }
      });
    });
    req.on('error', () => ok([]));
    req.on('timeout', () => { req.destroy(); ok([]); });
  });
}

function translateBatch(texts) {
  return new Promise((ok) => {
    if (!texts.length) return ok([]);
    const joined = texts.join('\n');
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(joined)}`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try {
          const j = JSON.parse(d);
          const parts = j[0];
          if (!Array.isArray(parts)) return ok([]);
          const lines = parts.filter(p => Array.isArray(p)).map(p => p[0] || '');
          while (lines.length < texts.length) lines.push('');
          ok(lines.slice(0, texts.length));
        } catch { ok([]); }
      });
    });
    req.on('error', () => ok([]));
    req.on('timeout', () => { req.destroy(); ok([]); });
  });
}

app.get('/api/article', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.json({ error: 'no url' });
  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const selectors = [
      'article p', '.article-body p', '.news-body p', '.article-content p',
      '.caas-body p', '#article-content p', '.story-body p',
      '.body p', '.post-content p', '.content p', '.entry-content p',
      '#newsContents p', '#article-view p', '.detail-body p',
      '#articleBodyContents p', '.article_txt p', '#harmonyContainer p',
      '.article_view p', '#article_body p', '.article-body p',
      '[class*="article"] p', '[class*="content"] p', '[class*="body"] p'
    ];
    let text = '';
    for (const sel of selectors) {
      const els = $(sel);
      if (els.length > 2) { els.each((_, el) => { const t = $(el).text().trim(); if (t) text += t + '\n'; }); break; }
    }
    if (!text || text.length < 50) {
      $('p').each((_, el) => { const t = $(el).text().trim(); if (t.length > 60) text += t + '\n'; });
    }
    text = text.replace(/\s+/g, ' ').trim().slice(0, 5000);
    if (!text) return res.json({ error: 'could not extract' });
    res.json({ korean: text });
  } catch (e) {
    res.json({ error: e.message });
  }
});

function fetchPage(url) {
  return new Promise((ok, fail) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, timeout: 15000 }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => ok(d));
    }).on('error', fail).on('timeout', function() { this.destroy(); fail(new Error('timeout')); });
  });
}

setInterval(updateKrwRate, 60000);

app.listen(3000, async () => {
  await updateKrwRate();
  console.log('http://localhost:3000');
});
