const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');

const TARGET_URL = 'http://localhost:4000/dashboard/loca?touchpoint=CUSTOM_1&ctp0=31-35&ctp1=36-40&ctp2=41-55';
const BASE_URL = 'http://localhost:4000/dashboard/loca';

async function getMockToken() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ isMock: true, email: 'danhdo@gmail.com' });
    const req = http.request(
      {
        hostname: 'localhost',
        port: 4001,
        path: '/api/auth/google',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function benchmarkPage(context, url, label) {
  console.log(`\n========================================`);
  console.log(`Benchmarking: ${label}`);
  console.log(`URL: ${url}`);
  console.log(`========================================`);

  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const apiRequests = [];
  let totalApiBytes = 0;
  let totalNetworkReqs = 0;

  page.on('request', (req) => {
    totalNetworkReqs++;
    if (req.url().includes('/api/')) {
      apiRequests.push({
        id: Math.random().toString(36).substring(7),
        url: req.url(),
        startTime: Date.now(),
        status: 'pending',
      });
    }
  });

  page.on('response', async (res) => {
    const reqUrl = res.url();
    if (reqUrl.includes('/api/')) {
      const match = apiRequests.find((r) => r.url === reqUrl && r.status === 'pending');
      let bytes = 0;
      try {
        const buf = await res.buffer();
        bytes = buf.length;
      } catch (e) {
        const cl = res.headers()['content-length'];
        if (cl) bytes = parseInt(cl, 10);
      }
      totalApiBytes += bytes;
      if (match) {
        match.duration = Date.now() - match.startTime;
        match.status = res.status();
        match.bytes = bytes;
      }
    }
  });

  const t0 = Date.now();
  let domContentLoadedMs = 0;
  let ttiMs = 0;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    domContentLoadedMs = Date.now() - t0;

    // Wait for network idle and React rendering to settle
    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 }).catch(() => {});
    ttiMs = Date.now() - t0;
  } catch (err) {
    domContentLoadedMs = domContentLoadedMs || Date.now() - t0;
    ttiMs = ttiMs || Date.now() - t0;
  }

  // Check tabular-nums elements
  const tabularAudit = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    let numbersWithoutTabular = 0;
    const sampleTextWithoutTabular = [];

    elements.forEach((el) => {
      // Check if text is numeric / contains currency / time counters
      if (el.children.length === 0 && el.textContent) {
        const text = el.textContent.trim();
        if (
          /\d+/.test(text) &&
          (text.includes('đ') ||
            text.includes(':') ||
            text.includes('%') ||
            text.includes('ngày') ||
            /^\d+$/.test(text))
        ) {
          const computedStyle = window.getComputedStyle(el);
          const fontVariantNumeric = computedStyle.fontVariantNumeric;
          const hasTabularClass = el.classList.contains('tabular-nums');
          if (!hasTabularClass && !fontVariantNumeric.includes('tabular-nums')) {
            numbersWithoutTabular++;
            if (sampleTextWithoutTabular.length < 10) {
              sampleTextWithoutTabular.push(text);
            }
          }
        }
      }
    });

    return { numbersWithoutTabular, sampleTextWithoutTabular };
  });

  // Check Accessibility elements (h1, nav, aria-label)
  const a11yAudit = await page.evaluate(() => {
    const hasH1 = document.querySelectorAll('h1').length > 0;
    const hasNav = document.querySelectorAll('nav').length > 0;
    const buttonsWithoutAria = Array.from(document.querySelectorAll('button')).filter(
      (b) => !b.innerText.trim() && !b.getAttribute('aria-label')
    ).length;
    return { hasH1, hasNav, buttonsWithoutAria };
  });

  // Check DOM node count
  const domNodeCount = await page.evaluate(() => document.querySelectorAll('*').length);

  const payloadKb = (totalApiBytes / 1024).toFixed(2);

  console.log(`DOM Content Loaded: ${domContentLoadedMs} ms`);
  console.log(`TTI / Render Complete: ${ttiMs} ms`);
  console.log(`Total Network Reqs: ${totalNetworkReqs}`);
  console.log(`API Calls Triggered: ${apiRequests.length}`);
  console.log(`Total API Payload: ${payloadKb} kB`);
  console.log(`DOM Node Count: ${domNodeCount}`);
  console.log(`Numbers missing tabular-nums: ${tabularAudit.numbersWithoutTabular}`);
  console.log(
    `Accessibility: Has H1 = ${a11yAudit.hasH1}, Has Nav = ${a11yAudit.hasNav}, Unlabeled Icon Buttons = ${a11yAudit.buttonsWithoutAria}`
  );

  const report = {
    label,
    url,
    domContentLoadedMs,
    ttiMs,
    totalNetworkReqs,
    apiCallsCount: apiRequests.length,
    totalApiBytes,
    payloadKb,
    domNodeCount,
    tabularAudit,
    a11yAudit,
    apiRequests,
  };

  await page.close();
  return report;
}

async function runBenchmark() {
  const auth = await getMockToken();
  console.log('Successfully acquired mock auth token for:', auth.user?.displayName);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.createBrowserContext();

  // Set auth state
  const initPage = await context.newPage();
  await initPage.goto('http://localhost:4000/dashboard/today', { waitUntil: 'domcontentloaded' });
  await initPage.evaluate(
    (token, user) => {
      localStorage.setItem('mos_token', token);
      localStorage.setItem('mos_user', JSON.stringify(user));
    },
    auth.token,
    auth.user
  );
  await initPage.close();

  // 1. Cold Load of Target URL
  const targetReport = await benchmarkPage(context, TARGET_URL, 'Target URL (Custom Touchpoints)');

  // 2. Cold Load of Base URL (for comparison)
  const baseReport = await benchmarkPage(context, BASE_URL, 'Base URL (Default Touchpoints)');

  await browser.close();

  const summary = {
    targetReport,
    baseReport,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    '/Users/dannydo/projects/mos-lab/scripts/benchmark_loca_custom_results.json',
    JSON.stringify(summary, null, 2)
  );

  console.log('\nSaved benchmark result to scripts/benchmark_loca_custom_results.json');
}

runBenchmark().catch(console.error);
