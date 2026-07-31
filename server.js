const express = require('express');
const https = require('https');
const http = require('http');
const cheerio = require('cheerio');
const app = express();
app.use(express.static(__dirname));

const T = ['USDKRW=X','EURKRW=X','JPYKRW=X','CNYKRW=X','AUDKRW=X','GBPKRW=X','CADKRW=X','CHFKRW=X','HKDKRW=X','SGDKRW=X','GC=F','SI=F','PL=F','PA=F','CL=F','NG=F','HG=F','^TYX','^GSPC','^DJI','^IXIC','^VIX','^TNX','^KS11','^KQ11','^N225','^HSI','^FTSE','^GDAXI','^FCHI','^BSESN','^AXJO','^BVSP','BTC-USD','ETH-USD','XRP-USD','SOL-USD','DOGE-USD','ADA-USD','DOT-USD','AVAX-USD','LINK-USD','005930.KS','AAPL','MSFT','NVDA','TSLA','GOOGL','AMZN','META'];
const NAMES = {
  'USDKRW=X':'��/�޷�','EURKRW=X':'����/��','JPYKRW=X':'��/��','CNYKRW=X':'����/��',
  'AUDKRW=X':'ȣ�ִ޷�/��','GBPKRW=X':'�Ŀ��/��','CADKRW=X':'ĳ���ٴ޷�/��','CHFKRW=X':'����������/��','HKDKRW=X':'ȫ��޷�/��','SGDKRW=X':'�̰������޷�/��',
  'GC=F':'��','SI=F':'��','PL=F':'���','PA=F':'�ȶ��',
  'CL=F':'WTI ����','NG=F':'õ������',
  'HG=F':'����',
  '^TYX':'ڸ 30�⹰ �ݸ�',
  '^GSPC':'S&P 500','^DJI':'�ٿ�����','^IXIC':'������','^VIX':'VIX ��������','^TNX':'ڸ 10�⹰ �ݸ�',
  '^KS11':'�ڽ���','^KQ11':'�ڽ���','^N225':'������','^HSI':'�׼�����',
  '^FTSE':'���� FTSE','^GDAXI':'���� DAX','^FCHI':'������ CAC','^BSESN':'�ε� Sensex','^AXJO':'ȣ�� ASX','^BVSP':'����� IBOVESPA',
  'BTC-USD':'��Ʈ����','ETH-USD':'�̴�����','XRP-USD':'����',
  'SOL-USD':'�ֶ�','DOGE-USD':'��������','ADA-USD':'���̴�','DOT-USD':'��ī��','AVAX-USD':'�ƹ߶�ü','LINK-USD':'ü�θ�ũ',
  '005930.KS':'�Ｚ����','AAPL':'����','MSFT':'����ũ�μ���Ʈ','NVDA':'������','TSLA':'�׽���','GOOGL':'����','AMZN':'�Ƹ���','META':'��Ÿ'
};
const ICONS = {
  'USDKRW=X':'??','EURKRW=X':'??','JPYKRW=X':'??','CNYKRW=X':'??',
  'AUDKRW=X':'????','GBPKRW=X':'????','CADKRW=X':'????','CHFKRW=X':'????','HKDKRW=X':'????','SGDKRW=X':'????',
  'GC=F':'??','SI=F':'??','PL=F':'??','PA=F':'??',
  'CL=F':'???','NG=F':'??',
  'HG=F':'??',
  '^TYX':'??',
  '^GSPC':'??','^DJI':'???','^IXIC':'??','^VIX':'??','^TNX':'??',
  '^KS11':'????','^KQ11':'??','^N225':'????','^HSI':'????',
  '^FTSE':'????','^GDAXI':'????','^FCHI':'????','^BSESN':'????','^AXJO':'????','^BVSP':'????',
  'BTC-USD':'?','ETH-USD':'??','XRP-USD':'??',
  'SOL-USD':'��','DOGE-USD':'??','ADA-USD':'??','DOT-USD':'��','AVAX-USD':'??','LINK-USD':'??',
  '005930.KS':'??','AAPL':'??','MSFT':'??','NVDA':'??','TSLA':'??','GOOGL':'??','AMZN':'??','META':'??'
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
  const isKrwAsset = s.endsWith('KRW=X') || s === '^KS11' || s === '^KQ11' || s.endsWith('.KS') || ['^TYX','^TNX','^VIX'].includes(s);
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
  const isKrwAsset = symbol.endsWith('KRW=X') || symbol === '^KS11' || symbol === '^KQ11' || symbol.endsWith('.KS') || ['^TYX','^TNX','^VIX'].includes(symbol);
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
  
  const financeKeywords = ['�ֽ�','����','�ڽ���','�ڽ���','������','�ٿ�','S&P','ȯ��','�޷�','��ȭ','����','����','�ݸ�','���رݸ�','����','����','Fed','ä��','��ä','ȸ��ä','�ݵ�','ETF','������','IPO','��������','��������','���','�ڻ���','�ż�','�ŵ�','����','����','�μ�','�պ�','M&A','����','��������','������','����','���','������ǥ','��������','��ǥ��','�����ǰ�','���','�϶�','�޵�','�޶�','���Ѱ�','���Ѱ�','�ð��Ѿ�','����','PER','PBR','ROE','����','����','��','��','����','WTI','�귻Ʈ','����','��ö','��Ʈ����','�̴�����','����','����','�����ڻ�','��ȣȭ��','����ü��','������','NFT','����','ī��','����','���ǻ�','�ڻ���','��Ź','����','ISA','��������','IRP','��������','����','���','����','�Ļ�','����','�ɼ�','ELS','DLS','ELW','����Ʈ','Ŀ�������Ʈ','����','CDS','�ſ�ε�����','�ε�','�ν�','��������','��ũ�ƿ�','ȸ��','�Ļ�','PF','������Ʈ���̳���','�ε���PF','�Ǽ�','�ð�','�о�','û��','����Ʈ','����','����','����','�Ӵ�','������','�������','������','HUG','���õ��ú���'];
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

setInterval(updateKrwRate, 60000);

app.post('/api/contact', express.json(), (req, res) => {
  const { type, email, subject, message } = req.body;
  if (!type || !email || !subject || !message) return res.status(400).json({ error: '�ʼ� �׸� ����' });
  console.log('[CONTACT]', new Date().toISOString(), { type, email, subject: subject.substring(0, 50) });
  res.json({ ok: true });
});

app.get('/sitemap.xml', (req, res) => {
  const base = 'https://modu-sise.vercel.app';
  const detailSymbols = ['USDKRW=X','EURKRW=X','JPYKRW=X','CNYKRW=X','AUDKRW=X','GBPKRW=X','CADKRW=X','CHFKRW=X','HKDKRW=X','SGDKRW=X','GC=F','SI=F','PL=F','PA=F','CL=F','NG=F','HG=F','%5ETYX','%5EGSPC','%5EDJI','%5EIXIC','%5EVIX','%5ETNX','%5EKS11','%5EKQ11','%5EN225','%5EHSI','%5EFTSE','%5EGDAXI','%5EFCHI','%5EBSESN','%5EAXJO','%5EBVSP','BTC-USD','ETH-USD','XRP-USD','SOL-USD','DOGE-USD','ADA-USD','DOT-USD','AVAX-USD','LINK-USD','005930.KS','AAPL','MSFT','NVDA','TSLA','GOOGL','AMZN','META'];
  const today = new Date().toISOString().split('T')[0];
  const pages = [
    { loc: base + '/', changefreq: 'hourly', priority: '1.0' },
    { loc: base + '/detail.html', changefreq: 'hourly', priority: '0.9' },
    { loc: base + '/privacy.html', changefreq: 'monthly', priority: '0.3' },
    { loc: base + '/terms.html', changefreq: 'monthly', priority: '0.3' },
    { loc: base + '/contact.html', changefreq: 'monthly', priority: '0.4' },
  ];
  const detailPages = detailSymbols.map(s => ({
    loc: `${base}/detail.html?s=${s}`,
    changefreq: 'hourly',
    priority: '0.8'
  }));
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
  res.set('Content-Type', 'text/plain').send(`User-agent: *
Allow: /
Crawl-delay: 10
Disallow: /api/
Disallow: /server.js
Disallow: /package*.json
Disallow: /node_modules/
Disallow: /*.log
Disallow: /*.md

# AI ũ�ѷ� - GPT, Claude, Perplexity ��
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

# Naver �˻� �κ�
User-agent: Yeti
Allow: /
Crawl-delay: 10

User-agent: NaverBot
Allow: /
Crawl-delay: 10

Sitemap: https://modu-sise.vercel.app/sitemap.xml`);
});

app.get('/llms.txt', (req, res) => {
  res.set('Content-Type', 'text/plain; charset=utf-8').send(`# 모두의 시세 - AI 크롤러를 위한 사이트 요약
## Modu Sise - Real-time Global Financial Dashboard (KRW)

### 사이트 개요
- 서비스명: 모두의 시세 (Modu Sise)
- URL: https://modu-sise.vercel.app/
- 언어: 한국어 (ko-KR)
- 설명: 50종목 글로벌 금융 자산의 실시간 시세를 원화(₩)로 환산한 무료 대시보드 (환율 10종, 귀금속 4종, 에너지 2종, 원자재 1종, 채권 1종, 지수 15종, 암호화폐 9종, 주식 8종)

### 핵심 데이터
- 데이터 소스: Yahoo Finance v8 chart API
- 갱신 주기: 30초 자동 갱신 (USD/KRW 환율 60초)
- 환율: USD/KRW, EUR/KRW, JPY/KRW(100엔당), CNY/KRW, AUD/KRW, GBP/KRW, CAD/KRW, CHF/KRW, HKD/KRW, SGD/KRW
- 귀금속: 금(GC=F), 은(SI=F), 백금(PL=F), 팔라듐(PA=F)
- 에너지: WTI 원유(CL=F), 천연가스(NG=F)
- 원자재: 구리(HG=F)
- 채권: 미 30년물 금리(^TYX)
- 지수: S&P500, 다우존스, 나스닥, VIX, 미10년물금리, 코스피, 코스닥, 닛케이225, 항셍지수, 영국FTSE, 독일DAX, 프랑스CAC, 인도Sensex, 호주ASX, 브라질IBOVESPA
- 암호화폐: 비트코인(BTC-USD), 이더리움(ETH-USD), 리플(XRP-USD), 솔라나(SOL-USD), 도지코인(DOGE-USD), 에이다(ADA-USD), 폴카닷(DOT-USD), 아발란체(AVAX-USD), 체인링크(LINK-USD)
- 주식: 삼성전자, 애플, 마이크로소프트, 엔비디아, 테슬라, 구글, 아마존, 메타
- 뉴스: 연합뉴스 경제/증권 RSS, 전자신문 Section902, Google News 3개 피드 (금융 키워드 80+ 필터링)

### API 엔드포인트
- GET /api/quotes - 전체 50종목 실시간 시세 (원화 환산)

### 기능
- 실시간 시세 대시보드 (카테고리별: 환율/귀금속/에너지/원자재/채권/지수/암호화폐/주식)
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

app.listen(3000, async () => {
  await updateKrwRate();
  console.log('http://localhost:3000');
});
