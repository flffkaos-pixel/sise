const express = require('express');
const https = require('https');
const http = require('http');
const cheerio = require('cheerio');
const app = express();
app.use(express.static(process.cwd()));

const T = ['USDKRW=X','EURKRW=X','JPYKRW=X','CNYKRW=X','AUDKRW=X','GBPKRW=X','CADKRW=X','CHFKRW=X','HKDKRW=X','SGDKRW=X','GC=F','SI=F','PL=F','PA=F','CL=F','NG=F','HG=F','^2YR','^5YR','^TYX','^GSPC','^DJI','^IXIC','^VIX','^TNX','^KS11','^KQ11','^N225','^HSI','^FTSE','^GDAXI','^FCHI','^SSEC','^BSESN','^AXJO','^BVSP','BTC-USD','ETH-USD','XRP-USD','SOL-USD','DOGE-USD','ADA-USD','DOT-USD','AVAX-USD','LINK-USD','005930.KS','AAPL','MSFT','NVDA','TSLA','GOOGL','AMZN','META'];
const NAMES = {
  'USDKRW=X':'원/달러','EURKRW=X':'유로/원','JPYKRW=X':'엔/원','CNYKRW=X':'위안/원',
  'AUDKRW=X':'호주달러/원','GBPKRW=X':'파운드/원','CADKRW=X':'캐나다달러/원','CHFKRW=X':'스위스프랑/원','HKDKRW=X':'홍콩달러/원','SGDKRW=X':'싱가포르달러/원',
  'GC=F':'금','SI=F':'은','PL=F':'백금','PA=F':'팔라듐',
  'CL=F':'WTI 원유','NG=F':'천연가스',
  'HG=F':'구리',
  '^2YR':'美 2년물 금리','^5YR':'美 5년물 금리','^TYX':'美 30년물 금리',
  '^GSPC':'S&P 500','^DJI':'다우존스','^IXIC':'나스닥','^VIX':'VIX 공포지수','^TNX':'美 10년물 금리',
  '^KS11':'코스피','^KQ11':'코스닥','^N225':'닛케이','^HSI':'항셍지수',
  '^FTSE':'영국 FTSE','^GDAXI':'독일 DAX','^FCHI':'프랑스 CAC','^SSEC':'중국 상해종합','^BSESN':'인도 Sensex','^AXJO':'호주 ASX','^BVSP':'브라질 IBOVESPA',
  'BTC-USD':'비트코인','ETH-USD':'이더리움','XRP-USD':'리플',
  'SOL-USD':'솔라나','DOGE-USD':'도지코인','ADA-USD':'에이다','DOT-USD':'폴카닷','AVAX-USD':'아발란체','LINK-USD':'체인링크',
  '005930.KS':'삼성전자','AAPL':'애플','MSFT':'마이크로소프트','NVDA':'엔비디아','TSLA':'테슬라','GOOGL':'구글','AMZN':'아마존','META':'메타'
};
const ICONS = {
  'USDKRW=X':'💵','EURKRW=X':'💶','JPYKRW=X':'💴','CNYKRW=X':'💷',
  'AUDKRW=X':'🇦🇺','GBPKRW=X':'🇬🇧','CADKRW=X':'🇨🇦','CHFKRW=X':'🇨🇭','HKDKRW=X':'🇭🇰','SGDKRW=X':'🇸🇬',
  'GC=F':'🥇','SI=F':'🥈','PL=F':'💎','PA=F':'🔬',
  'CL=F':'🛢️','NG=F':'🔥',
  'HG=F':'🔌',
  '^2YR':'📅','^5YR':'📅','^TYX':'📅',
  '^GSPC':'📈','^DJI':'🏛️','^IXIC':'💻','^VIX':'😨','^TNX':'🏦',
  '^KS11':'🇰🇷','^KQ11':'📋','^N225':'🇯🇵','^HSI':'🇭🇰',
  '^FTSE':'🇬🇧','^GDAXI':'🇩🇪','^FCHI':'🇫🇷','^SSEC':'🇨🇳','^BSESN':'🇮🇳','^AXJO':'🇦🇺','^BVSP':'🇧🇷',
  'BTC-USD':'₿','ETH-USD':'💎','XRP-USD':'✖️',
  'SOL-USD':'◎','DOGE-USD':'🐕','ADA-USD':'🪙','DOT-USD':'●','AVAX-USD':'🔺','LINK-USD':'🔗',
  '005930.KS':'📱','AAPL':'🍎','MSFT':'🪟','NVDA':'🟢','TSLA':'🚗','GOOGL':'🔍','AMZN':'📦','META':'👤'
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
  const isKrwAsset = s.endsWith('KRW=X') || s === '^KS11' || s === '^KQ11' || s.endsWith('.KS') || ['^2YR','^5YR','^TYX','^TNX','^VIX'].includes(s);
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

app.get('/api/history', async (req, res) => {
  const symbol = req.query.symbol;
  if (!symbol) return res.status(400).json({ error: 'missing symbol' });
  let data = await fetchQ(symbol, '2y', '1d');
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
  const isKrwAsset = symbol.endsWith('KRW=X') || symbol === '^KS11' || symbol === '^KQ11' || symbol.endsWith('.KS') || ['^2YR','^5YR','^TYX','^TNX','^VIX'].includes(symbol);
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
  const detailSymbols = ['USDKRW=X','EURKRW=X','JPYKRW=X','CNYKRW=X','AUDKRW=X','GBPKRW=X','CADKRW=X','CHFKRW=X','HKDKRW=X','SGDKRW=X','GC=F','SI=F','PL=F','PA=F','CL=F','NG=F','HG=F','%5E2YR','%5E5YR','%5ETYX','%5EGSPC','%5EDJI','%5EIXIC','%5EVIX','%5ETNX','%5EKS11','%5EKQ11','%5EN225','%5EHSI','%5EFTSE','%5EGDAXI','%5EFCHI','%5ESSEC','%5EBSESN','%5EAXJO','%5EBVSP','BTC-USD','ETH-USD','XRP-USD','SOL-USD','DOGE-USD','ADA-USD','DOT-USD','AVAX-USD','LINK-USD','005930.KS','AAPL','MSFT','NVDA','TSLA','GOOGL','AMZN','META'];
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
- 설명: 20개 글로벌 금융 자산(환율 4종, 귀금속 2종, 에너지 2종, 지수 9종, 암호화폐 3종)의 실시간 시세를 원화(₩)로 환산한 무료 대시보드

### 핵심 데이터
- 데이터 소스: Yahoo Finance v8 chart API
- 갱신 주기: 30초 자동 갱신 (USD/KRW 환율 60초)
- 환율: USD/KRW, EUR/KRW, JPY/KRW(100엔당), CNY/KRW
- 귀금속: 금(GC=F), 은(SI=F)
- 에너지: WTI 원유(CL=F), 천연가스(NG=F)
- 지수: S&P500, 다우존스, 나스닥, VIX, 美10년물금리, 코스피, 코스닥, 닛케이225, 항셍지수
- 암호화폐: 비트코인(BTC-USD), 이더리움(ETH-USD), 리플(XRP-USD)
- 뉴스: 연합뉴스 경제/증권 RSS, 전자신문 Section902, Google News 3개 피드 (금융 키워드 80+ 필터링)

### API 엔드포인트
- GET /api/quotes - 전체 20종목 실시간 시세 (원화 환산)
- GET /api/history?symbol=SYMBOL - 30일 OHLC 데이터
- GET /api/news/headlines - 금융 뉴스 헤드라인
- GET /api/article?url=URL - 기사 본문 추출 + 번역

### 기능
- 실시간 시세 대시보드 (카테고리별: 환율/귀금속/에너지/지수/암호화폐)
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

module.exports = app;
