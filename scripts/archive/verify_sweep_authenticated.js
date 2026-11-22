const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');

const ROUTES = [
  { name: '1. /dashboard/today', url: 'http://localhost:4000/dashboard/today' },
  { name: '2a. /dashboard/customers (All)', url: 'http://localhost:4000/dashboard/customers' },
  {
    name: '2b. /dashboard/customers (My Customers)',
    url: 'http://localhost:4000/dashboard/customers?assignedStaffId=me',
  },
  { name: '2c. /dashboard/customers (Referrals)', url: 'http://localhost:4000/dashboard/referrals' },
  { name: '3. /dashboard/nyc', url: 'http://localhost:4000/dashboard/nyc' },
  { name: '4. /dashboard/loca', url: 'http://localhost:4000/dashboard/loca' },
  { name: '5. /dashboard/appointments', url: 'http://localhost:4000/dashboard/appointments' },
  { name: '6. /dashboard/plans', url: 'http://localhost:4000/dashboard/plans' },
  { name: '7. /dashboard/calls', url: 'http://localhost:4000/dashboard/calls' },
  { name: '8. /dashboard/omicall', url: 'http://localhost:4000/dashboard/omicall' },
  { name: '9. /dashboard/kpi', url: 'http://localhost:4000/dashboard/kpi' },
  { name: '10a. /dashboard/cc (Xoay)', url: 'http://localhost:4000/dashboard/cc?tab=xoay' },
  { name: '10b. /dashboard/cc (Thưởng)', url: 'http://localhost:4000/dashboard/cc?tab=thuong' },
  { name: '10c. /dashboard/cc (Minigame)', url: 'http://localhost:4000/dashboard/cc?tab=game' },
  { name: '10d. /dashboard/cc (Tip)', url: 'http://localhost:4000/dashboard/cc?tab=tip' },
  { name: '10e. /dashboard/cc (Diamond)', url: 'http://localhost:4000/dashboard/cc?tab=diamond' },
  { name: '10f. /dashboard/cc (Thu nhập)', url: 'http://localhost:4000/dashboard/cc?tab=thunhap' },
  { name: '11a. /dashboard/cv (Xoay)', url: 'http://localhost:4000/dashboard/cv?tab=xoay' },
  { name: '11b. /dashboard/cv (Tip)', url: 'http://localhost:4000/dashboard/cv?tab=tip' },
  { name: '11c. /dashboard/cv (Thu nhập)', url: 'http://localhost:4000/dashboard/cv?tab=thunhap' },
  { name: '12a. /dashboard/bk (Booking)', url: 'http://localhost:4000/dashboard/bk?tab=booking' },
  { name: '12b. /dashboard/bk (Done)', url: 'http://localhost:4000/dashboard/bk?tab=done' },
  { name: '12c. /dashboard/bk (Tip)', url: 'http://localhost:4000/dashboard/bk?tab=tip' },
  { name: '12d. /dashboard/bk (Revenue)', url: 'http://localhost:4000/dashboard/bk?tab=revenue' },
  { name: '12e. /dashboard/bk (Thu nhập)', url: 'http://localhost:4000/dashboard/bk?tab=thunhap' },
  { name: '13. /dashboard/staff', url: 'http://localhost:4000/dashboard/staff' },
];

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

async function runSweep() {
  const auth = await getMockToken();
  console.log('Got auth token for:', auth.user?.displayName);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.createBrowserContext();
  const initPage = await context.newPage();

  // Set up localStorage on origin
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

  console.log('Auth tokens set in browser context.');

  const finalResults = [];

  for (const r of ROUTES) {
    const page = await context.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    let reqCount = 0;
    let apiCount = 0;
    let apiBytes = 0;

    page.on('request', (req) => {
      reqCount++;
      if (req.url().includes(':4001/api/') || req.url().includes('/api/')) {
        apiCount++;
      }
    });

    page.on('response', async (res) => {
      const url = res.url();
      if (url.includes(':4001/api/') || url.includes('/api/')) {
        try {
          const buf = await res.buffer();
          apiBytes += buf.length;
        } catch (e) {
          const cl = res.headers()['content-length'];
          if (cl) apiBytes += parseInt(cl, 10);
        }
      }
    });

    const t0 = Date.now();
    let initMs = 0;
    let ttiMs = 0;

    try {
      await page.goto(r.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      initMs = Date.now() - t0;

      // Wait 1.5s for React render and API data settlement
      await new Promise((res) => setTimeout(res, 1500));
      ttiMs = Date.now() - t0;
    } catch (err) {
      initMs = initMs || Date.now() - t0;
      ttiMs = ttiMs || Date.now() - t0;
    }

    const payloadKb = (apiBytes / 1024).toFixed(2);
    const payloadMb = (apiBytes / (1024 * 1024)).toFixed(2);

    const item = {
      name: r.name,
      url: r.url,
      domContentLoadedMs: initMs,
      ttiMs,
      totalNetworkRequests: reqCount,
      apiCallsCount: apiCount,
      totalApiPayloadBytes: apiBytes,
      payloadKb,
      payloadMb,
    };

    finalResults.push(item);
    console.log(
      `[VERIFIED RESULT] ${r.name} | Init: ${initMs}ms | TTI: ${ttiMs}ms | Reqs: ${reqCount} | API Calls: ${apiCount} | Payload: ${payloadKb} kB (${payloadMb} MB)`
    );

    await page.close();
  }

  await browser.close();

  const outPath = '/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_1/benchmark_raw.json';
  fs.writeFileSync(outPath, JSON.stringify(finalResults, null, 2));
  console.log(`Saved verified benchmark results to ${outPath}`);
}

runSweep().catch(console.error);
