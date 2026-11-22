const puppeteer = require('puppeteer');
const http = require('http');

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

async function testAuthSweep() {
  const authData = await getMockToken();
  console.log('Obtained Auth Token:', authData.token ? 'YES' : 'NO');
  console.log('User Role:', authData.user?.role);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // First load homepage or login to set localStorage
  await page.goto('http://localhost:4000/dashboard/today', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    (token, user) => {
      localStorage.setItem('mos_token', token);
      localStorage.setItem('mos_user', JSON.stringify(user));
    },
    authData.token,
    authData.user
  );

  console.log('Set mos_token & mos_user in localStorage');

  const testRoutes = [
    { name: '1. /dashboard/today', url: 'http://localhost:4000/dashboard/today' },
    { name: '2a. /dashboard/customers', url: 'http://localhost:4000/dashboard/customers' },
    { name: '2c. /dashboard/referrals', url: 'http://localhost:4000/dashboard/referrals' },
  ];

  for (const route of testRoutes) {
    let totalNetworkRequests = 0;
    let apiCallsCount = 0;
    let totalApiPayloadBytes = 0;

    const onRequest = (req) => {
      totalNetworkRequests++;
      if (req.url().includes('/api/')) {
        apiCallsCount++;
      }
    };

    const onResponse = async (res) => {
      if (res.url().includes('/api/')) {
        try {
          const buffer = await res.buffer();
          totalApiPayloadBytes += buffer.length;
        } catch (e) {
          const cl = res.headers()['content-length'];
          if (cl) totalApiPayloadBytes += parseInt(cl, 10);
        }
      }
    };

    page.on('request', onRequest);
    page.on('response', onResponse);

    const startMs = Date.now();
    await page.goto(route.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const domContentLoadedMs = Date.now() - startMs;

    try {
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 15000 });
    } catch (e) {}
    const ttiMs = Date.now() - startMs;

    page.off('request', onRequest);
    page.off('response', onResponse);

    const payloadKb = (totalApiPayloadBytes / 1024).toFixed(2);
    console.log(
      `[TEST RESULT] ${route.name} | Init: ${domContentLoadedMs}ms | TTI: ${ttiMs}ms | Reqs: ${totalNetworkRequests} | API Calls: ${apiCallsCount} | Payload: ${payloadKb} kB`
    );
  }

  await browser.close();
}

testAuthSweep().catch(console.error);
