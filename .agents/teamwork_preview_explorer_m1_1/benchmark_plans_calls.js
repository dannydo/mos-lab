const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:4000';
const API_URL = 'http://localhost:4001';

async function runSingleBenchmark() {
  const tokenRes = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isMock: true }),
  });
  const authData = await tokenRes.json();

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.setDefaultNavigationTimeout(90000);

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    (t, u) => {
      localStorage.setItem('mos_token', t);
      localStorage.setItem('mos_user', JSON.stringify(u));
    },
    authData.token,
    authData.user
  );

  const pagesToTest = [
    { name: '6. /dashboard/plans', url: '/dashboard/plans' },
    { name: '7. /dashboard/calls', url: '/dashboard/calls' },
  ];

  const singleResults = [];

  for (const item of pagesToTest) {
    const requests = [];
    const apiCalls = [];

    const reqH = (req) => requests.push({ url: req.url(), startTime: Date.now() });
    const resH = async (res) => {
      const url = res.request().url();
      let size = 0;
      try {
        const buf = await res.buffer();
        size = buf.length;
      } catch (e) {}
      const reqEntry = requests.find((r) => r.url === url);
      const duration = reqEntry ? Date.now() - reqEntry.startTime : 0;
      if (url.includes('/api/')) {
        apiCalls.push({
          url: url.replace(API_URL, ''),
          status: res.status(),
          durationMs: duration,
          sizeBytes: size,
          sizeKb: (size / 1024).toFixed(2),
        });
      }
    };

    page.on('request', reqH);
    page.on('response', resH);

    const start = Date.now();
    await page.goto(`${BASE_URL}${item.url}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    const initLoad = Date.now() - start;

    try {
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 12000 });
    } catch (e) {}
    const tti = Date.now() - start;

    page.off('request', reqH);
    page.off('response', resH);

    const totalPayloadBytes = apiCalls.reduce((acc, c) => acc + c.sizeBytes, 0);

    singleResults.push({
      name: item.name,
      url: item.url,
      initialLoadDurationMs: initLoad,
      ttiDurationMs: tti,
      totalNetworkRequests: requests.length,
      totalApiPayloadKb: (totalPayloadBytes / 1024).toFixed(2),
      apiCallsCount: apiCalls.length,
      apiCalls,
    });
  }

  await browser.close();

  // Merge with benchmark_results.json
  const mainFile = path.join(__dirname, 'benchmark_results.json');
  if (fs.existsSync(mainFile)) {
    const mainResults = JSON.parse(fs.readFileSync(mainFile, 'utf8'));
    singleResults.forEach((sr) => {
      const idx = mainResults.findIndex((m) => m.url === sr.url);
      if (idx !== -1) {
        mainResults[idx].initialLoadDurationMs = sr.initialLoadDurationMs;
        mainResults[idx].ttiDurationMs = sr.ttiDurationMs;
        mainResults[idx].totalNetworkRequests = sr.totalNetworkRequests;
        mainResults[idx].totalApiPayloadKb = sr.totalApiPayloadKb;
        mainResults[idx].apiCallsCount = sr.apiCallsCount;
        mainResults[idx].apiCalls = sr.apiCalls;
        mainResults[idx].loadFailed = false;
        mainResults[idx].errorMessage = null;
      }
    });
    fs.writeFileSync(mainFile, JSON.stringify(mainResults, null, 2));
    console.log('Merged plans & calls metrics into benchmark_results.json');
  }
}

runSingleBenchmark().catch(console.error);
