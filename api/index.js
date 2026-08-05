const express = require('express');
const https = require('https');
const http = require('http');
const cheerio = require('cheerio');
const app = express();
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/' || req.path === '') res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  next();
});
app.use(express.static(process.cwd()));

const T = ['USDKRW=X','EURKRW=X','JPYKRW=X','CNYKRW=X','AUDKRW=X','GBPKRW=X','CADKRW=X','CHFKRW=X','HKDKRW=X','SGDKRW=X','GC=F','SI=F','PL=F','PA=F','CL=F','NG=F','HG=F','^TYX','^GSPC','^DJI','^IXIC','^VIX','^TNX','^KS11','^KQ11','^N225','^HSI','^FTSE','^GDAXI','^FCHI','^BSESN','^AXJO','^BVSP','BTC-USD','ETH-USD','XRP-USD','SOL-USD','DOGE-USD','ADA-USD','DOT-USD','AVAX-USD','LINK-USD','005930.KS','000660.KS','035420.KS','005380.KS','373220.KS','207940.KS','005490.KS','035720.KS','068270.KS','V','JPM','WMT','DIS','NFLX','AMD','KO','AVGO','AAPL','MSFT','NVDA','TSLA','GOOGL','AMZN','META'];
const NAMES = {
  'USDKRW=X':'원/달러','EURKRW=X':'유로/원','JPYKRW=X':'엔/원','CNYKRW=X':'위안/원',
  'AUDKRW=X':'호주달러/원','GBPKRW=X':'파운드/원','CADKRW=X':'캐나다달러/원','CHFKRW=X':'스위스프랑/원','HKDKRW=X':'홍콩달러/원','SGDKRW=X':'싱가포르달러/원',
  'GC=F':'금','SI=F':'은','PL=F':'백금','PA=F':'팔라듐',
  'CL=F':'WTI 원유','NG=F':'천연가스',
  'HG=F':'구리',
  '^TYX':'美 30년물 금리',
  '^GSPC':'S&P 500','^DJI':'다우존스','^IXIC':'나스닥','^VIX':'VIX 공포지수','^TNX':'美 10년물 금리',
  '^KS11':'코스피','^KQ11':'코스닥','^N225':'닛케이','^HSI':'항셍지수',
  '^FTSE':'영국 FTSE','^GDAXI':'독일 DAX','^FCHI':'프랑스 CAC','^BSESN':'인도 Sensex','^AXJO':'호주 ASX','^BVSP':'브라질 IBOVESPA',
  'BTC-USD':'비트코인','ETH-USD':'이더리움','XRP-USD':'리플',
  'SOL-USD':'솔라나','DOGE-USD':'도지코인','ADA-USD':'에이다','DOT-USD':'폴카닷','AVAX-USD':'아발란체','LINK-USD':'체인링크',
  '005930.KS':'삼성전자','000660.KS':'SK하이닉스','035420.KS':'NAVER','005380.KS':'현대차','373220.KS':'LG에너지솔루션','207940.KS':'삼성바이오로직스','005490.KS':'POSCO홀딩스','035720.KS':'카카오','068270.KS':'셀트리온','V':'Visa','JPM':'JP모건','WMT':'월마트','DIS':'디즈니','NFLX':'넷플릭스','AMD':'AMD','KO':'코카콜라','AVGO':'브로드컴','AAPL':'애플','MSFT':'마이크로소프트','NVDA':'엔비디아','TSLA':'테슬라','GOOGL':'구글','AMZN':'아마존','META':'메타'
};
const ICONS = {
  'USDKRW=X':'💵','EURKRW=X':'💶','JPYKRW=X':'💴','CNYKRW=X':'💷',
  'AUDKRW=X':'🇦🇺','GBPKRW=X':'🇬🇧','CADKRW=X':'🇨🇦','CHFKRW=X':'🇨🇭','HKDKRW=X':'🇭🇰','SGDKRW=X':'🇸🇬',
  'GC=F':'🥇','SI=F':'🥈','PL=F':'💎','PA=F':'🔬',
  'CL=F':'🛢️','NG=F':'🔥',
  'HG=F':'🔌',
  '^TYX':'📅',
  '^GSPC':'📈','^DJI':'🏛️','^IXIC':'💻','^VIX':'😨','^TNX':'🏦',
  '^KS11':'🇰🇷','^KQ11':'📋','^N225':'🇯🇵','^HSI':'🇭🇰',
  '^FTSE':'🇬🇧','^GDAXI':'🇩🇪','^FCHI':'🇫🇷','^BSESN':'🇮🇳','^AXJO':'🇦🇺','^BVSP':'🇧🇷',
  'BTC-USD':'₿','ETH-USD':'💎','XRP-USD':'✖️',
  'SOL-USD':'◎','DOGE-USD':'🐕','ADA-USD':'🪙','DOT-USD':'●','AVAX-USD':'🔺','LINK-USD':'🔗',
  '005930.KS':'📱','000660.KS':'🔴','035420.KS':'🔍','005380.KS':'🚗','373220.KS':'🔋','207940.KS':'💊','005490.KS':'🏭','035720.KS':'💬','068270.KS':'🧬','V':'💳','JPM':'🏦','WMT':'🛒','DIS':'🎬','NFLX':'📺','AMD':'💻','KO':'🥤','AVGO':'🔌','AAPL':'🍎','MSFT':'🪟','NVDA':'🟢','TSLA':'🚗','GOOGL':'🔍','AMZN':'📦','META':'👤'
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
          const quotes = result.indicators?.quote?.[0];
          const closes = quotes?.close;
          const price = (m.regularMarketPrice != null && m.regularMarketPrice > 0) ? m.regularMarketPrice : null;
          let prev = m.chartPreviousClose;
          if (closes && closes.length > 1) {
            const arr = closes.filter(v => v != null && v > 0);
            if (arr.length > 1) prev = arr[arr.length - 2];
          }
          const ch = (price != null ? price : (prev || 0)) - (prev || 0);
          ok({
            symbol: m.symbol || symbol,
            shortName: NAMES[symbol] || m.symbol,
            icon: ICONS[symbol] || '',
            regularMarketPrice: price != null ? price : (prev || 0),
            regularMarketChange: ch,
            regularMarketChangePercent: prev ? (ch / prev) * 100 : 0,
            regularMarketPreviousClose: prev,
            timestamps: result.timestamp,
            opens: quotes?.open,
            highs: quotes?.high,
            lows: quotes?.low,
            closes,
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
  const isKrwAsset = s.startsWith('^') || s.endsWith('KRW=X') || s.endsWith('.KS');
  const rate = isKrwAsset ? 1 : krwRate;
  return { ...item, priceKrw: item.regularMarketPrice * rate, changeKrw: item.regularMarketChange * rate, changePercentKrw: item.regularMarketChangePercent, previousCloseKrw: item.regularMarketPreviousClose * rate, krwRate };
}

app.get('/api/quotes', async (req, res) => {
  const now = Date.now();
  if (now - lastKrwFetch > 60000) { await updateKrwRate(); lastKrwFetch = now; }
  const results = await Promise.allSettled(T.map(t => fetchQ(t)));
  const data = results.filter(r => r.status === 'fulfilled' && r.value).map(r => toKrw(r.value));
  res.json({ quoteResponse: { result: data } });
});

function fetchKrGold() {
  return new Promise((ok) => {
    const req = https.get('https://koreagoldx.co.kr/api/main', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', 'Accept': 'application/json, text/plain, */*', 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8', 'Referer': 'https://koreagoldx.co.kr/', 'Connection': 'keep-alive' }, timeout: 15000 }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try {
          const j = JSON.parse(d);
          const o = j.officialPrice4 || {};
          ok({ date: j.date || o.date || '', pureBuy: o.s_pure || 0, pureBuyChg: o.turm_s_pure || 0, pureBuyChgPct: o.per_s_pure || 0, pureSell: o.p_pure || 0, pureSellChg: o.turm_p_pure || 0, pureSellChgPct: o.per_p_pure || 0, k18Buy: o.s_18k || 0, k18BuyChg: o.turm_s_18k || 0, k18BuyChgPct: o.per_s_18k || 0, k18Sell: o.p_18k || 0, k18SellChg: o.turm_p_18k || 0, k18SellChgPct: o.per_p_18k || 0, k14Buy: o.s_14k || 0, k14BuyChg: o.turm_s_14k || 0, k14BuyChgPct: o.per_s_14k || 0, k14Sell: o.p_14k || 0, k14SellChg: o.turm_p_14k || 0, k14SellChgPct: o.per_p_14k || 0, silverBuy: o.s_silver || 0, silverBuyChg: o.turm_s_silver || 0, silverBuyChgPct: o.per_s_silver || 0, silverSell: o.p_silver || 0, silverSellChg: o.turm_p_silver || 0, silverSellChgPct: o.per_p_silver || 0 });
        } catch (e) { ok(null); }
      });
    });
    req.on('error', () => ok(null));
    req.on('timeout', () => { req.destroy(); ok(null); });
  });
}

let krGoldCache = null, krGoldCacheT = 0;
app.get('/api/krgold', async (req, res) => {
  if (!krGoldCache || Date.now() - krGoldCacheT > 300000) {
    krGoldCache = await fetchKrGold();
    krGoldCacheT = Date.now();
  }
  res.json(krGoldCache || { error: 'fetch failed' });
});

function fetchKrIndexPrevClose() {
  return new Promise(async (ok) => {
    const results = {};
    for (const sym of ['^KS11', '^KQ11']) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym.replace('^', '%5E')}?range=5d&interval=1d`;
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
        const j = await r.json();
        const ind = j.chart?.result?.[0]?.indicators?.quote?.[0];
        const closes = ind?.close;
        if (closes && closes.length >= 2) {
          // Second-to-last close = previous trading day's close
          const prevClose = closes[closes.length - 2];
          if (prevClose && prevClose > 0) {
            results[sym] = prevClose;
          }
        }
      } catch (e) { console.error('KR index 5d fetch error:', sym, e.message); }
    }
    ok(results);
  });
}

let krIndexCache = null, krIndexCacheT = 0;
app.get('/api/kr-index-prev-close', async (req, res) => {
  if (!krIndexCache || Date.now() - krIndexCacheT > 300000) {
    krIndexCache = await fetchKrIndexPrevClose();
    krIndexCacheT = Date.now();
  }
  res.json(krIndexCache || {});
});

app.get('/api/history', async (req, res) => {
  const symbol = req.query.symbol;
  if (!symbol) return res.status(400).json({ error: 'missing symbol' });
  if (Date.now() - lastKrwFetch > 60000) { await updateKrwRate(); lastKrwFetch = Date.now(); }
  let [data, quote] = await Promise.all([fetchQ(symbol, '2y', '1d'), fetchQ(symbol)]);
  if (!data) return res.status(502).json({ error: 'fetch failed' });
  if (!data.timestamps || !data.timestamps.length) {
    const fb = await fetchQ(symbol, 'max', '1d');
    if (fb && fb.timestamps && fb.timestamps.length) data = fb;
    else { const fb2 = await fetchQ(symbol, '5y', '1wk'); if (fb2 && fb2.timestamps && fb2.timestamps.length) data = fb2; }
  }
  if (data.timestamps && data.timestamps.length > 35) {
    const start = data.timestamps.length - 35;
    data = { ...data, timestamps: data.timestamps.slice(start), opens: data.opens?.slice(start), highs: data.highs?.slice(start), lows: data.lows?.slice(start), closes: data.closes?.slice(start), volumes: data.volumes?.slice(start) };
  }
  const isKrwAsset = symbol.startsWith('^') || symbol.endsWith('KRW=X') || symbol.endsWith('.KS');
  const rate = isKrwAsset ? 1 : krwRate;
  const src = (quote && quote.regularMarketPrice != null) ? quote : data;
  
  // 한국 지수(^KS11, ^KQ11) 전일 종가 보정
  let previousClose = (src.regularMarketPreviousClose || 0) * rate;
  let change = (src.regularMarketChange || 0) * rate;
  let changePercent = src.regularMarketChangePercent || 0;
  if (symbol === '^KS11' || symbol === '^KQ11') {
    try {
      const krIdx = await fetchKrIndexPrevClose();
      const correctedPrev = krIdx[symbol];
      if (correctedPrev && correctedPrev > 0) {
        const current = (src.regularMarketPrice || 0) * rate;
        previousClose = correctedPrev;
        change = current - correctedPrev;
        changePercent = (change / correctedPrev) * 100;
      }
    } catch (e) { console.error('KR index correction error:', e.message); }
  }
  
  const history = (data.timestamps || []).map((t, i) => ({
    date: t,
    open: (data.opens?.[i] || 0) * rate,
    high: (data.highs?.[i] || 0) * rate,
    low: (data.lows?.[i] || 0) * rate,
    close: (data.closes?.[i] || 0) * rate,
    volume: data.volumes?.[i] || 0,
  })).filter(h => h.close > 0);
res.json({ symbol: data.symbol, shortName: data.shortName, icon: data.icon, currentPrice: (src.regularMarketPrice || 0) * rate, change, changePercent, previousClose, krwRate, history });
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
  const urls = [
    'https://www.yna.co.kr/rss/economy.xml',
    'https://www.yna.co.kr/rss/stock.xml',
    'https://rss.etnews.com/Section902.xml',
    'https://news.google.com/rss/search?q=%EA%B8%88%EC%9C%B5+%EC%A3%BC%EC%8B%9D&hl=ko&gl=KR&ceid=KR:ko',
    'https://news.google.com/rss/search?q=%EB%B9%84%ED%8A%B8%EC%BD%94%EC%9D%B8+%EC%BD%94%EC%8A%A4%ED%94%BC+%ED%99%98%EC%9C%A8&hl=ko&gl=KR&ceid=KR:ko',
    'https://news.google.com/rss/search?q=%EA%B8%80%EB%A1%9C%EB%B2%8C+%EC%A6%9D%EC%8B%9C+%EC%98%A4%EB%8A%98+%EA%B8%88&hl=ko&gl=KR&ceid=KR:ko'
  ];
const results = await Promise.allSettled(urls.map(u => fetchRss(u)));
  const seen = new Set();
  const all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
  const deduped = all.filter(n => { const k = n.link; if (seen.has(k)) return false; seen.add(k); return true; });

  const financeKeywords = ['주식','증권','코스피','코스닥','나스닥','다우','S&P','환율','달러','엔화','위안','유로','금리','기준금리','한은','연준','Fed','채권','국채','회사채','펀드','ETF','공모주','IPO','유상증자','무상증자','배당','자사주','매수','매도','보유','지분','인수','합병','M&A','실적','영업이익','순이익','매출','어닝','실적발표','컨센서스','목표가','투자의견','상승','하락','급등','급락','상한가','하한가','시가총액','시총','PER','PBR','ROE','배당률','배당금','금','은','원유','WTI','브렌트','구리','비철','비트코인','이더리움','리플','코인','가상자산','암호화폐','블록체인','디파이','NFT','은행','카드','보험','증권사','자산운용','신탁','연금','ISA','연금저축','IRP','퇴직연금','공모','사모','헤지','파생','선물','옵션','ELS','DLS','ELW','워런트','커버드워런트','스왑','CDS','신용부도스왑','부도','부실','구조조정','워크아웃','회생','파산','PF','프로젝트파이낸싱','부동산PF','건설','시공','분양','청약','아파트','주택','전세','월세','임대','갭투자','전세사기','보증금','HUG','주택도시보증'];
  const filtered = deduped.filter(n => {
    const text = (n.title + ' ' + (n.summary || '')).toLowerCase();
    return financeKeywords.some(k => text.includes(k.toLowerCase()));
  });

res.json({ news: filtered.slice(0, 40) });
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

app.post('/api/contact', express.json(), (req, res) => {
  const { type, email, subject, message } = req.body;
  if (!type || !email || !subject || !message) return res.status(400).json({ error: '필수 항목 누락' });
  console.log('[CONTACT]', new Date().toISOString(), { type, email, subject: subject.substring(0, 50) });
  res.json({ ok: true });
});

app.get('/sitemap.xml', (req, res) => {
  const base = `https://${req.headers.host || 'modu-sise.vercel.app'}`;
  const detailSymbols = ['USDKRW=X','EURKRW=X','JPYKRW=X','CNYKRW=X','AUDKRW=X','GBPKRW=X','CADKRW=X','CHFKRW=X','HKDKRW=X','SGDKRW=X','GC=F','SI=F','PL=F','PA=F','CL=F','NG=F','HG=F','%5ETYX','%5EGSPC','%5EDJI','%5EIXIC','%5EVIX','%5ETNX','%5EKS11','%5EKQ11','%5EN225','%5EHSI','%5EFTSE','%5EGDAXI','%5EFCHI','%5EBSESN','%5EAXJO','%5EBVSP','BTC-USD','ETH-USD','XRP-USD','SOL-USD','DOGE-USD','ADA-USD','DOT-USD','AVAX-USD','LINK-USD','005930.KS','000660.KS','035420.KS','005380.KS','373220.KS','207940.KS','005490.KS','035720.KS','068270.KS','V','JPM','WMT','DIS','NFLX','AMD','KO','AVGO','AAPL','MSFT','NVDA','TSLA','GOOGL','AMZN','META'];
  const today = new Date().toISOString().split('T')[0];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
    <lastmod>${today}</lastmod>
  </url>
  <url>
    <loc>${base}/detail.html</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
    <lastmod>${today}</lastmod>
  </url>
  ${detailSymbols.map(s => `  <url>
    <loc>${base}/detail.html?s=${s}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
    <lastmod>${today}</lastmod>
  </url>`).join('\n')}
  <url>
    <loc>${base}/privacy.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
    <lastmod>${today}</lastmod>
  </url>
  <url>
    <loc>${base}/terms.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
    <lastmod>${today}</lastmod>
  </url>
  <url>
    <loc>${base}/contact.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
    <lastmod>${today}</lastmod>
  </url>
</urlset>`;
  res.set('Content-Type', 'application/xml').send(xml);
});

app.get('/rss.xml', async (req, res) => {
  try {
    const urls = [
      'https://www.yna.co.kr/rss/economy.xml',
      'https://www.yna.co.kr/rss/stock.xml',
      'https://rss.etnews.com/Section902.xml',
      'https://news.google.com/rss/search?q=%EA%B8%88%EC%9C%B5+%EC%A3%BC%EC%8B%9D&hl=ko&gl=KR&ceid=KR:ko',
      'https://news.google.com/rss/search?q=%EB%B9%84%ED%8A%B8%EC%BD%94%EC%9D%B8+%EC%BD%94%EC%8A%A4%ED%94%BC+%ED%99%98%EC%9C%A8&hl=ko&gl=KR&ceid=KR:ko',
      'https://news.google.com/rss/search?q=%EA%B8%80%EB%A1%9C%EB%B2%8C+%EC%A6%9D%EC%8B%9C+%EC%98%A4%EB%8A%98+%EA%B8%88&hl=ko&gl=KR&ceid=KR:ko'
    ];
    const results = await Promise.allSettled(urls.map(u => fetchRss(u)));
    const seen = new Set();
    const all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
    const deduped = all.filter(n => { const k = n.link; if (seen.has(k)) return false; seen.add(k); return true; });

    const financeKeywords = ['주식','증권','코스피','코스닥','나스닥','다우','S&P','환율','달러','엔화','위안','유로','금리','기준금리','한은','연준','Fed','채권','국채','회사채','펀드','ETF','공모주','IPO','유상증자','무상증자','배당','자사주','매수','매도','보유','지분','인수','합병','M&A','실적','영업이익','순이익','매출','어닝','실적발표','컨센서스','목표가','투자의견','상승','하락','급등','급락','상한가','하한가','시가총액','시총','PER','PBR','ROE','배당률','배당금','금','은','원유','WTI','브렌트','구리','비철','비트코인','이더리움','리플','코인','가상자산','암호화폐','블록체인','디파이','NFT','은행','카드','보험','증권사','자산운용','신탁','연금','ISA','연금저축','IRP','퇴직연금','공모','사모','헤지','파생','선물','옵션','ELS','DLS','ELW','워런트','커버드워런트','스왑','CDS','신용부도스왑','부도','부실','구조조정','워크아웃','회생','파산','PF','프로젝트파이낸싱','부동산PF','건설','시공','분양','청약','아파트','주택','전세','월세','임대','갭투자','전세사기','보증금','HUG','주택도시보증'];
    const filtered = deduped.filter(n => {
      const text = (n.title + ' ' + (n.summary || '')).toLowerCase();
      return financeKeywords.some(k => text.includes(k.toLowerCase()));
    });

    const items = filtered.slice(0, 30).map(n => {
      const pubDate = n.pubDate ? new Date(n.pubDate).toUTCString() : new Date().toUTCString();
      const safeTitle = escapeXml(n.title || '제목 없음');
      const safeSummary = escapeXml((n.summary || '').substring(0, 300));
      const safeLink = n.link || '#';
      return `
    <item>
      <title>${safeTitle}</title>
      <link>${safeLink}</link>
      <guid isPermaLink="true">${safeLink}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${safeSummary}</description>
    </item>`;
    }).join('');

    const now = new Date().toUTCString();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>모두의 시세 - 금융 뉴스</title>
    <link>https://modu-sise.vercel.app/</link>
    <description>실시간 환율·지수·금·원유·암호화폐 시세와 주요 금융 뉴스를 제공합니다.</description>
    <language>ko</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="https://modu-sise.vercel.app/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
    res.set('Content-Type', 'application/rss+xml; charset=utf-8').send(xml);
  } catch (e) {
    res.status(500).send('RSS 생성 실패');
  }
});

function escapeXml(s) {
  return String(s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, '&apos;');
}

app.get('/robots.txt', (req, res) => {
  const base = `https://${req.headers.host || 'modu-sise.vercel.app'}`;
  res.set('Content-Type', 'text/plain').send(`User-agent: *
Allow: /
Crawl-delay: 10
Disallow: /api/
Disallow: /server.js
Disallow: /package*.json
Disallow: /node_modules/
Disallow: /*.log
Disallow: /*.md

# AI 크롤러
User-agent: GPTBot
Allow: /
Crawl-delay: 30

User-agent: ClaudeBot
Allow: /
Crawl-delay: 30

User-agent: Claude-Web
Allow: /
Crawl-delay: 30

User-agent: CCBot
Allow: /
Crawl-delay: 30

User-agent: PerplexityBot
Allow: /
Crawl-delay: 30

User-agent: Google-Extended
Allow: /
Crawl-delay: 10

User-agent: anthropic-ai
Allow: /
Crawl-delay: 30

# Naver
User-agent: Yeti
Allow: /
Crawl-delay: 10

User-agent: NaverBot
Allow: /
Crawl-delay: 10

Sitemap: ${base}/sitemap.xml`);
});

app.get('/llms.txt', (req, res) => {
  res.set('Content-Type', 'text/plain; charset=utf-8').send(`# 모두의 시세 - AI 크롤러를 위한 사이트 요약
## Modu Sise - Real-time Global Financial Dashboard (KRW)

### 사이트 개요
- 서비스명: 모두의 시세 (Modu Sise)
- URL: https://modu-sise.vercel.app/
- 언어: 한국어 (ko-KR)
- 설명: 70종목 금융 자산의 실시간 시세를 원화(₩)로 환산한 무료 대시보드 (환율 10종, 귀금속 9종, 에너지 2종, 채권 1종, 지수 15종, 암호화폐 9종, 주식 24종)

### 핵심 데이터
- 데이터 소스: Yahoo Finance v8 chart API, 한국금거래소 고시(koreagoldx.co.kr)
- 갱신 주기: 30초 자동 갱신 (USD/KRW 환율 60초)
- 환율: USD/KRW, EUR/KRW, JPY/KRW(100엔당), CNY/KRW, AUD/KRW, GBP/KRW, CAD/KRW, CHF/KRW, HKD/KRW, SGD/KRW
- 귀금속: 국내 순금(1돈 살 때/팔 때), 국내 18K, 국내 14K, 금(GC=F), 은(SI=F), 백금(PL=F), 팔라듐(PA=F), 구리(HG=F)
- 에너지: WTI 원유(CL=F), 천연가스(NG=F)
- 채권: 미 30년물 금리(^TYX)
- 지수: S&P500, 다우존스, 나스닥, VIX, 미10년물금리, 코스피, 코스닥, 닛케이225, 항셍지수, 영국FTSE, 독일DAX, 프랑스CAC, 인도Sensex, 호주ASX, 브라질IBOVESPA
- 암호화폐: 비트코인(BTC-USD), 이더리움(ETH-USD), 리플(XRP-USD), 솔라나(SOL-USD), 도지코인(DOGE-USD), 에이다(ADA-USD), 폴카닷(DOT-USD), 아발란체(AVAX-USD), 체인링크(LINK-USD)
- 주식: 삼성전자, SK하이닉스, NAVER, 현대차, LG에너지솔루션, 삼성바이오로직스, POSCO홀딩스, 카카오, 셀트리온, Visa, JP모건, 월마트, 디즈니, 넷플릭스, AMD, 코카콜라, 브로드컴, 애플, 마이크로소프트, 엔비디아, 테슬라, 구글, 아마존, 메타
- 뉴스: 연합뉴스 경제/증권 RSS, 전자신문 Section902, Google News 3개 피드 (금융 키워드 80+ 필터링)

### API 엔드포인트
- GET /api/quotes - 전체 66종목 실시간 시세 (원화 환산)
- GET /api/krgold - 국내 금 시세 (한국금거래소 고시, 1돈 3.75g 살 때/팔 때, 5분 캐시)

### 기능
- 실시간 시세 대시보드 (카테고리별: 환율/귀금속/에너지/채권/지수/암호화폐/주식)
- 30일 차트 (Chart.js)
- 선형회귀 기반 내일 가격 예측 (R² 신뢰도)
- 금융 뉴스 (상대 시간 표시 + 본문 보기)

### 페이지
- /index.html - 메인 대시보드
- /detail.html?s=SYMBOL - 개별 자산 상세 (차트 + 예측)
- /privacy.html - 개인정보처리방침
- /terms.html - 이용약관
- /contact.html - 문의하기
- /sitemap.xml - 사이트맵
- /llms.txt - 이 파일

### 면책
본 정보는 투자 참고용입니다. 투자 판단과 책임은 이용자에게 있습니다.`);
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

// ===== 오피넷 기름값 =====
const OIL_PRODUCTS = [['B027', '휘발유'], ['D047', '경유'], ['K015', 'LPG']];
const OIL_SIDOS = { '01': '서울', '02': '경기', '03': '강원', '04': '충북', '05': '충남', '06': '전북', '08': '경북', '09': '경남', '10': '부산', '11': '제주', '14': '대구', '15': '인천', '17': '대전', '18': '울산', '19': '세종', '20': '전남광주' };
const OIL_GUNS = {
  '01': ['13:강남구', '14:강동구', '24:강북구', '15:강서구', '17:관악구', '23:광진구', '16:구로구', '25:금천구', '18:노원구', '06:도봉구', '03:동대문구', '12:동작구', '09:마포구', '07:서대문구', '21:서초구', '04:성동구', '05:성북구', '22:송파구', '19:양천구', '11:영등포구', '10:용산구', '08:은평구', '01:종로구', '02:중구', '20:중랑구'],
  '02': ['31:가평군', '19:고양시', '11:과천시', '07:광명시', '28:광주시', '10:구리시', '15:군포시', '36:김포시', '17:남양주시', '06:동두천시', '05:부천시', '02:성남시', '01:수원시', '16:시흥시', '12:안산시', '35:안성시', '04:안양시', '21:양주시', '32:양평군', '22:여주시', '29:연천군', '13:오산시', '20:용인시', '14:의왕시', '03:의정부시', '08:이천시', '26:파주시', '09:평택시', '30:포천시', '18:하남시', '24:화성시'],
  '03': ['03:강릉시', '32:고성군', '05:동해시', '07:삼척시', '04:속초시', '30:양구군', '33:양양군', '25:영월군', '02:원주시', '31:인제군', '27:정선군', '28:철원군', '01:춘천시', '06:태백시', '26:평창군', '22:홍천군', '29:화천군', '23:횡성군'],
  '04': ['26:괴산군', '30:단양군', '22:보은군', '24:영동군', '23:옥천군', '27:음성군', '03:제천시', '31:증평군', '25:진천군', '01:청주시', '02:충주시'],
  '05': ['08:계룡시', '03:공주시', '21:금산군', '07:논산시', '33:당진시', '05:보령시', '26:부여군', '06:서산시', '27:서천군', '04:아산시', '31:예산군', '02:천안시', '29:청양군', '37:태안군', '30:홍성군'],
  '06': ['29:고창군', '02:군산시', '06:김제시', '04:남원시', '23:무주군', '30:부안군', '27:순창군', '21:완주군', '03:익산시', '25:임실군', '24:장수군', '01:전주시', '05:정읍시', '22:진안군'],
  '08': ['10:경산시', '02:경주시', '33:고령군', '07:구미시', '03:김천시', '08:문경시', '42:봉화군', '09:상주시', '34:성주군', '06:안동시', '27:영덕군', '26:영양군', '04:영주시', '05:영천시', '40:예천군', '44:울릉군', '43:울진군', '23:의성군', '32:청도군', '25:청송군', '35:칠곡군', '01:포항시'],
  '09': ['10:거제시', '38:거창군', '32:고성군', '08:김해시', '34:남해군', '09:밀양시', '07:사천시', '36:산청군', '11:양산시', '22:의령군', '04:진주시', '24:창녕군', '02:창원시', '06:통영시', '35:하동군', '23:함안군', '37:함양군', '39:합천군'],
  '10': ['11:강서구', '12:금정구', '31:기장군', '07:남구', '03:동구', '06:동래구', '05:부산진구', '08:북구', '15:사상구', '10:사하구', '02:서구', '14:수영구', '13:연제구', '04:영도구', '01:중구', '09:해운대구'],
  '11': ['02:서귀포시', '01:제주시'],
  '14': ['22:군위군', '04:남구', '07:달서구', '31:달성군', '02:동구', '05:북구', '03:서구', '06:수성구', '01:중구'],
  '15': ['31:강화군', '08:계양구', '03:미추홀구', '06:남동구', '02:동구', '12:영종구', '04:부평구', '05:서구', '13:서해구', '14:검단구', '07:연수구', '32:옹진군', '01:중구', '11:제물포구'],
  '17': ['05:대덕구', '01:동구', '03:서구', '04:유성구', '02:중구'],
  '18': ['02:남구', '03:동구', '04:북구', '31:울주군', '01:중구'],
  '19': ['01:세종시'],
  '20': ['04:광산구', '05:남구', '01:동구', '03:북구', '02:서구', '28:강진군', '24:고흥군', '22:곡성군', '10:광양시', '23:구례군', '09:나주시', '21:담양군', '06:목포시', '31:무안군', '25:보성군', '08:순천시', '37:신안군', '07:여수시', '33:영광군', '30:영암군', '35:완도군', '34:장성군', '27:장흥군', '36:진도군', '32:함평군', '29:해남군', '26:화순군']
};
const OIL_BRANDS = { GSC: 'GS칼텍스', HDO: 'HD현대오일뱅크', SKE: 'SK에너지', SOL: 'S-OIL', NHO: 'NH-OIL', E1G: 'E1', SKG: 'SK가스', RTO: '알뜰주유소', ODC: '자영알뜰', ETC: '자영', NCO: 'NC오일' };
const OIL_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const OIL_OPINET_KEY = '9WEsDjBBQmvM3lvioOOJcs8epB6pPasrhB1MO6YRhzU=';
let oilCookies = {};
let oilSessionT = 0;

function opReq(host, path, method, formBody) {
  return new Promise((ok) => {
    const headers = {
      'User-Agent': OIL_UA,
      'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
      'Referer': 'https://www.opinet.co.kr/',
      'Cookie': Object.entries(oilCookies).map(([k, v]) => k + '=' + v).join('; ')
    };
    if (formBody) headers['Content-Type'] = 'application/x-www-form-urlencoded';
    const req = https.request({ hostname: host, path, method, headers, timeout: 20000 }, (r) => {
      if (r.headers['set-cookie']) for (const c of r.headers['set-cookie']) { const p = c.split(';')[0].split('='); oilCookies[p[0]] = p[1]; }
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => ok({ status: r.statusCode, body: d }));
    });
    req.on('error', () => ok(null));
    req.on('timeout', () => { req.destroy(); ok(null); });
    if (formBody) req.write(formBody);
    req.end();
  });
}

function oilChallengeKey() {
  return new Promise(async (ok) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const path = `/ts.wseq?opcode=5001&nfid=0&prefix=NetFunnel.gRtype=5001;&sid=service_1&aid=B1&js=yes&${Date.now() + attempt}`;
      const r = await opReq('nfl.opinet.co.kr', path, 'GET', null);
      const m = r && /key=([0-9A-F]+)/.exec(r.body);
      if (m) return ok(m[1]);
      await new Promise(res => setTimeout(res, 400));
    }
    ok(null);
  });
}

async function getOilMainView() {
  if (Date.now() - oilSessionT > 600000 || !Object.keys(oilCookies).length) {
    for (let attempt = 0; attempt < 2; attempt++) {
      await opReq('www.opinet.co.kr', '/', 'GET', null);
      const key = await oilChallengeKey();
      if (key) {
        const rr = await opReq('www.opinet.co.kr', '/user/main/mainView.do', 'POST', `netfunnel_key=${key}&opinet_key=${encodeURIComponent(OIL_OPINET_KEY)}`);
        oilSessionT = Date.now();
        if (rr && rr.body && rr.body.length > 30000 && !rr.body.includes('netfunnel_key')) return rr.body;
      }
    }
    oilSessionT = Date.now();
    return null;
  }
  const r = await opReq('www.opinet.co.kr', '/user/main/mainView.do', 'GET', null);
  if (r && r.body && r.body.length > 30000 && !r.body.includes('netfunnel_key')) return r.body;
  const key = await oilChallengeKey();
  if (key) {
    const rr = await opReq('www.opinet.co.kr', '/user/main/mainView.do', 'POST', `netfunnel_key=${key}&opinet_key=${encodeURIComponent(OIL_OPINET_KEY)}`);
    oilSessionT = Date.now();
    if (rr && rr.body && rr.body.length > 30000 && !rr.body.includes('netfunnel_key')) return rr.body;
  }
  return null;
}

function formatOilDate(s) {
  const d = String(s || '').replace(/\D/g, '');
  return d.length >= 8 ? d.slice(0, 4) + '.' + d.slice(4, 6) + '.' + d.slice(6, 8) : '';
}

function parseOilMain(html) {
  const dm = /\((\d{4}\.\d{2}\.\d{2})\)/.exec(html);
  const prods = [];
  const oid = { B027: 'oilcon1', D047: 'oilcon2', K015: 'oilcon3' };
  for (const [code, name] of OIL_PRODUCTS) {
    const id = oid[code];
    const re = new RegExp(`id="${id}"[\\s\\S]*?<span class="text-3">([\\d.]+)<\\/span>[\\s\\S]*?<span class="point">([▲▼])<\\/span>\\s*([\\d.]+)[\\s\\S]*?최저가 <span class="col-1">(\\d+)<\\/span> <span class="line">\\|<\\/span> 최고가 <span class="col-2">(\\d+)<\\/span>`);
    const m = re.exec(html);
    if (m) prods.push({ code, name, avg: parseFloat(m[1]), chg: (m[2] === '▲' ? 1 : -1) * parseFloat(m[3]), min: +m[4], max: +m[5] });
  }
  return { date: dm ? dm[1] : '', products: prods };
}

function parseSidoAvg(json) {
  const a = json && json.allSigunAvg ? json.allSigunAvg : {};
  const out = {};
  for (const code of Object.keys(OIL_SIDOS)) {
    const avg = a['SIDO' + code + '_AVG_P'];
    const chg = a['SIDO' + code + '_CHA'];
    if (avg !== undefined && avg !== null && +avg > 0) out[code] = { avg: +avg, chg: chg === undefined || chg === null ? 0 : +chg };
  }
  return out;
}

async function fetchOilChart(prod) {
  const r = await opReq('www.opinet.co.kr', `/user/main/mainLineChartNewAjax.do?DIV_CD=M&SIDO_CD=&KNOC_PD_CD=${prod}`, 'GET', null);
  try {
    return (JSON.parse(r.body).result.chartData || []).map(x => ({ date: String(x.STD_DT_FULL).slice(0, 10), price: x.PRICE }));
  } catch { return []; }
}

async function fetchOil() {
  const page = await getOilMainView();
  let main = page ? parseOilMain(page) : { date: '', products: [] };
  const sidoByProd = {};
  const chartByProd = {};
  for (const [code] of OIL_PRODUCTS) {
    const s = await opReq('www.opinet.co.kr', `/user/main/mainSidoAvg.do?KNOC_PD_CD=${code}`, 'GET', null);
    try { sidoByProd[code] = parseSidoAvg(JSON.parse(s.body)); } catch { sidoByProd[code] = {}; }
    chartByProd[code] = await fetchOilChart(code);
  }
  const products = main.products.length ? main.products : [];
  if (!products.length) {
    for (const [code, name] of OIL_PRODUCTS) {
      const ch = chartByProd[code];
      const sv = Object.values(sidoByProd[code] || {});
      const min = sv.length ? Math.round(Math.min(...sv.map(v => v.avg))) : 0;
      const max = sv.length ? Math.round(Math.max(...sv.map(v => v.avg))) : 0;
      if (ch.length >= 2) {
        const last = ch[ch.length - 1], prev = ch[ch.length - 2];
        products.push({ code, name, avg: last.price, chg: +(last.price - prev.price), min, max });
      }
    }
    main.date = main.date || (chartByProd.B027 && chartByProd.B027.length ? formatOilDate(chartByProd.B027[chartByProd.B027.length - 1].date) : '');
  }
  for (const p of products) { p.sido = sidoByProd[p.code] || {}; p.chart = chartByProd[p.code] || []; }
  return { date: main.date || '', products };
}

let oilCache = null, oilCacheT = 0, oilFetching = null;
app.get('/api/oil', async (req, res) => {
  if (!oilCache || Date.now() - oilCacheT > 600000) {
    if (!oilFetching) {
      oilFetching = fetchOil().finally(() => { oilFetching = null; });
    }
    oilCache = await oilFetching;
    oilCacheT = Date.now();
  }
  res.json(oilCache || { error: 'fetch failed' });
});

let oilStCache = {}, oilStCacheT = {};
function opReqLimited(tasks, limit) {
  let i = 0;
  const workers = [];
  const run = async () => {
    while (i < tasks.length) { const idx = i++; await tasks[idx](); }
  };
  for (let w = 0; w < limit; w++) workers.push(run());
  return Promise.all(workers);
}

async function fetchStations(prod, sido) {
  if (Date.now() - oilSessionT > 600000 || !Object.keys(oilCookies).length) {
    await opReq('www.opinet.co.kr', '/', 'GET', null);
    oilSessionT = Date.now();
  }
  const guns = OIL_GUNS[sido] || [];
  const all = [];
  await opReqLimited(guns.map((gun, i) => async () => {
    const gunCd = gun.split(':')[0];
    const r = await opReq('www.opinet.co.kr', '/user/main/mainOSNewselect.do', 'POST', `SIGUN_CD=${sido}${gunCd}&SIDO_CD=${sido}&KNOC_PD_CD=${prod}&ORDER=`);
    try {
      const j = JSON.parse(r.body);
      for (const st of j.os_tab_1 || []) {
        all.push({ id: st.UNI_ID, name: st.OS_NM, sido: st.SIDO_NM, gun: st.SIGUNGU_NM, price: +st.CUR_P, brand: OIL_BRANDS[st.POLL_DIV_CD] || st.POLL_DIV_CD, div: st.POLL_DIV_CD });
      }
    } catch { /* skip */ }
  }), 4);
  all.sort((a, b) => a.price - b.price);
  return all.slice(0, 30);
}

app.get('/api/oil/stations', async (req, res) => {
  const prod = req.query.prod || 'B027';
  const sido = req.query.sido || '01';
  if (!OIL_PRODUCTS.some(p => p[0] === prod)) return res.status(400).json({ error: 'invalid prod' });
  if (!OIL_SIDOS[sido]) return res.status(400).json({ error: 'invalid sido' });
  const ck = prod + '|' + sido;
  if (!oilStCache[ck] || Date.now() - oilStCacheT[ck] > 600000) {
    oilStCache[ck] = await fetchStations(prod, sido);
    oilStCacheT[ck] = Date.now();
  }
  res.json({ date: '', prod, sido, sidoName: OIL_SIDOS[sido], stations: oilStCache[ck] });
});

module.exports = app;
