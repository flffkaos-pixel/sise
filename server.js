const express = require('express');
const https = require('https');
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

app.get('/api/news', async (req, res) => {
  const symbol = req.query.symbol;
  if (!symbol) return res.status(400).json({ error: 'missing symbol' });
  try {
    const data = await fetchFinanceNews(symbol);
    res.json({ symbol, news: data.slice(0, 15) });
  } catch (e) {
    res.status(502).json({ error: 'news fetch failed' });
  }
});

function fetchFinanceNews(symbol) {
  return new Promise((ok) => {
    const s = symbol.replace('^', '%5E');
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(s)}&quotesCount=0&newsCount=15`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try {
          const j = JSON.parse(d);
          ok((j.news || []).map(n => ({
            title: n.title, link: n.link, publisher: n.publisher || n.provider?.displayName || '',
            summary: n.summary || '', uuid: n.uuid
          })));
        } catch { ok([]); }
      });
    });
    req.on('error', () => ok([]));
    req.on('timeout', () => { req.destroy(); ok([]); });
  });
}

app.get('/api/news/headlines', async (req, res) => {
  const queries = ['비트코인','코스피','원달러 환율','금 가격','S&P 500','나스닥','원유','이더리움','달러','코스닥'];
  const results = await Promise.allSettled(queries.map(q => fetchNewsByQuery(q)));
  const seen = new Set();
  const all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
  const deduped = all.filter(n => { if (seen.has(n.uuid)) return false; seen.add(n.uuid); return true; });
  const sliced = deduped.slice(0, 20);
  const titles = sliced.map(n => n.title).filter(Boolean);
  const translations = titles.length ? await translateBatch(titles) : [];
  const news = sliced.map((n, i) => ({ ...n, title: translations[i] || n.title }));
  res.json({ news });
});

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

function fetchNewsByQuery(query) {
  return new Promise((ok) => {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=0&newsCount=5`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try {
          const j = JSON.parse(d);
          ok((j.news || []).map(n => ({
            title: n.title, link: n.link, publisher: n.publisher || n.provider?.displayName || '',
            summary: n.summary || '', uuid: n.uuid,
            time: n.providerPublishTime
          })));
        } catch { ok([]); }
      });
    });
    req.on('error', () => ok([]));
    req.on('timeout', () => { req.destroy(); ok([]); });
  });
}

setInterval(updateKrwRate, 60000);

app.listen(3000, async () => {
  await updateKrwRate();
  console.log('http://localhost:3000');
});
