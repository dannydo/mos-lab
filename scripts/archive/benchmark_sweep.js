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

async function benchmark() {
  console.log('Fetching mock authentication token from API...');
  const authData = await getMockToken();
  console.log(`Authenticated as: ${authData.user?.displayName} (${authData.user?.role})`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];

  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Establish origin and set localStorage
    await page.goto('http://localhost:4000/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(
      (token, user) => {
        localStorage.setItem('mos_token', token);
        localStorage.setItem('mos_user', JSON.stringify(user));
      },
      authData.token,
      authData.user
    );

    let totalNetworkRequests = 0;
    let apiCallsCount = 0;
    let totalApiPayloadBytes = 0;

    page.on('request', (req) => {
      totalNetworkRequests++;
      if (req.url().includes('/api/')) {
        apiCallsCount++;
      }
    });

    page.on('response', async (res) => {
      if (res.url().includes('/api/')) {
        try {
          const buffer = await res.buffer();
          totalApiPayloadBytes += buffer.length;
        } catch (e) {
          const cl = res.headers()['content-length'];
          if (cl) totalApiPayloadBytes += parseInt(cl, 10);
        }
      }
    });

    const startMs = Date.now();
    let domContentLoadedMs = 0;
    let ttiMs = 0;

    try {
      await page.goto(route.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      domContentLoadedMs = Date.now() - startMs;

      // Wait until components render or 1000ms idle
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let count = 0;
          const interval = setInterval(() => {
            count++;
            if (
              count >= 15 ||
              (document.readyState === 'complete' &&
                document.querySelectorAll('.ant-table, .ant-card, h1, h2, h3').length > 0)
            ) {
              clearInterval(interval);
              resolve();
            }
          }, 100);
        });
      });

      await new Promise((r) => setTimeout(r, 500));
      ttiMs = Date.now() - startMs;
    } catch (err) {
      domContentLoadedMs = domContentLoadedMs || Date.now() - startMs;
      ttiMs = ttiMs || Date.now() - startMs;
    }

    const payloadKb = (totalApiPayloadBytes / 1024).toFixed(2);
    const payloadMb = (totalApiPayloadBytes / (1024 * 1024)).toFixed(2);

    const resObj = {
      name: route.name,
      url: route.url,
      domContentLoadedMs,
      ttiMs,
      totalNetworkRequests,
      apiCallsCount,
      totalApiPayloadBytes,
      payloadKb,
      payloadMb,
    };

    results.push(resObj);
    console.log(
      `[COMPLETED] ${route.name} | Init: ${domContentLoadedMs}ms | TTI: ${ttiMs}ms | Reqs: ${totalNetworkRequests} | API Calls: ${apiCallsCount} | Payload: ${payloadKb} kB (${payloadMb} MB)`
    );

    await page.close();
  }

  await browser.close();

  const outputPath = '/Users/dannydo/projects/mos-lab/.agents/teamwork_preview_explorer_m1_1/benchmark_raw.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nSuccessfully saved complete benchmark results to ${outputPath}`);
}

benchmark().catch(console.error);
