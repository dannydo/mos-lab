const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:4000';
const API_URL = 'http://localhost:4001';

async function getMockAuthToken() {
  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isMock: true }),
  });
  if (!res.ok) {
    throw new Error(`Failed to get mock token: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

const ITEMS = [
  { name: '1. /dashboard/today', url: '/dashboard/today', type: 'page' },
  {
    name: '2. /dashboard/customers (All)',
    url: '/dashboard/customers',
    tabKey: 'ALL',
    selector: '[role="tab"]:nth-child(1)',
    type: 'subtab',
  },
  {
    name: '2. /dashboard/customers (My Customers)',
    url: '/dashboard/customers',
    tabKey: 'COMBO_LIVE',
    selector: '[role="tab"]:nth-child(2)',
    type: 'subtab',
  },
  { name: '2. /dashboard/customers (Referrals)', url: '/dashboard/referrals', type: 'subtab' },
  { name: '3. /dashboard/nyc', url: '/dashboard/nyc', type: 'page' },
  { name: '4. /dashboard/loca', url: '/dashboard/loca', type: 'page' },
  { name: '5. /dashboard/appointments', url: '/dashboard/appointments', type: 'page' },
  { name: '6. /dashboard/plans', url: '/dashboard/plans', type: 'page' },
  { name: '7. /dashboard/calls', url: '/dashboard/calls', type: 'page' },
  { name: '8. /dashboard/omicall', url: '/dashboard/omicall', type: 'page' },
  { name: '9. /dashboard/kpi', url: '/dashboard/kpi', type: 'page' },
  {
    name: '10. /dashboard/cc (Xoay)',
    url: '/dashboard/cc',
    tabKey: 'xoay',
    selector: '[role="tab"]:nth-child(1)',
    type: 'subtab',
  },
  {
    name: '10. /dashboard/cc (Thưởng)',
    url: '/dashboard/cc',
    tabKey: 'thuong',
    selector: '[role="tab"]:nth-child(2)',
    type: 'subtab',
  },
  {
    name: '10. /dashboard/cc (Minigame)',
    url: '/dashboard/cc',
    tabKey: 'minigame',
    selector: '[role="tab"]:nth-child(3)',
    type: 'subtab',
  },
  {
    name: '10. /dashboard/cc (Tip)',
    url: '/dashboard/cc',
    tabKey: 'tip',
    selector: '[role="tab"]:nth-child(4)',
    type: 'subtab',
  },
  {
    name: '10. /dashboard/cc (Diamond)',
    url: '/dashboard/cc',
    tabKey: 'diamond',
    selector: '[role="tab"]:nth-child(5)',
    type: 'subtab',
  },
  {
    name: '10. /dashboard/cc (Thu nhập)',
    url: '/dashboard/cc',
    tabKey: 'thunhap',
    selector: '[role="tab"]:nth-child(6)',
    type: 'subtab',
  },
  {
    name: '11. /dashboard/cv (Xoay)',
    url: '/dashboard/cv',
    tabKey: 'xoay',
    selector: '[role="tab"]:nth-child(1)',
    type: 'subtab',
  },
  {
    name: '11. /dashboard/cv (Tip)',
    url: '/dashboard/cv',
    tabKey: 'tip',
    selector: '[role="tab"]:nth-child(2)',
    type: 'subtab',
  },
  {
    name: '11. /dashboard/cv (Thu nhập)',
    url: '/dashboard/cv',
    tabKey: 'thunhap',
    selector: '[role="tab"]:nth-child(3)',
    type: 'subtab',
  },
  {
    name: '12. /dashboard/bk (Booking)',
    url: '/dashboard/bk',
    tabKey: 'booking',
    selector: '[role="tab"]:nth-child(1)',
    type: 'subtab',
  },
  {
    name: '12. /dashboard/bk (Done)',
    url: '/dashboard/bk',
    tabKey: 'done',
    selector: '[role="tab"]:nth-child(2)',
    type: 'subtab',
  },
  {
    name: '12. /dashboard/bk (Tip)',
    url: '/dashboard/bk',
    tabKey: 'tip',
    selector: '[role="tab"]:nth-child(3)',
    type: 'subtab',
  },
  {
    name: '12. /dashboard/bk (Revenue)',
    url: '/dashboard/bk',
    tabKey: 'revenue',
    selector: '[role="tab"]:nth-child(4)',
    type: 'subtab',
  },
  {
    name: '12. /dashboard/bk (Thu nhập)',
    url: '/dashboard/bk',
    tabKey: 'thunhap',
    selector: '[role="tab"]:nth-child(5)',
    type: 'subtab',
  },
  { name: '13. /dashboard/staff', url: '/dashboard/staff', type: 'page' },
];

async function runBenchmark() {
  console.log('Obtaining auth token...');
  const authData = await getMockAuthToken();
  const token = authData.token;
  const user = authData.user;
  console.log(`Auth token obtained for user: ${user.displayName} (${user.role})`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.setDefaultNavigationTimeout(90000);
  page.setDefaultTimeout(90000);

  // Pre-seed localStorage with token
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.evaluate(
    (t, u) => {
      localStorage.setItem('mos_token', t);
      localStorage.setItem('mos_user', JSON.stringify(u));
    },
    token,
    user
  );

  const results = [];

  for (const item of ITEMS) {
    console.log(`\n----------------------------------------`);
    console.log(`Benchmarking: ${item.name}...`);

    const requests = [];
    const apiCalls = [];

    const requestHandler = (req) => {
      const url = req.url();
      requests.push({
        url,
        resourceType: req.resourceType(),
        startTime: Date.now(),
      });
    };

    const responseHandler = async (res) => {
      const req = res.request();
      const url = req.url();
      let size = 0;
      try {
        const buffer = await res.buffer();
        size = buffer.length;
      } catch (e) {
        size = 0;
      }
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

    page.on('request', requestHandler);
    page.on('response', responseHandler);

    const startTime = Date.now();
    let initialLoadTime = 0;
    let ttiTime = 0;
    let loadFailed = false;
    let errorMessage = null;

    try {
      const fullUrl = item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`;

      // Navigate to page
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
      initialLoadTime = Date.now() - startTime;

      // Click sub-tab if needed
      if (item.selector && item.tabKey) {
        try {
          await page.waitForSelector('.ant-tabs-tab', { timeout: 8000 });
          await page.evaluate((tabK) => {
            const tabsList = Array.from(document.querySelectorAll('.ant-tabs-tab'));
            const matched = tabsList.find((t) => {
              const text = t.innerText || '';
              return text.toLowerCase().includes(tabK.toLowerCase());
            });
            if (matched) {
              matched.click();
            }
          }, item.tabKey);
          await new Promise((r) => setTimeout(r, 500));
        } catch (err) {
          console.warn(`Subtab click warning for ${item.name}: ${err.message}`);
        }
      }

      // Wait for network idle or timeout
      try {
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 12000 });
      } catch (e) {
        // network idle timeout fine
      }

      // Wait for ant spinners to disappear
      try {
        await page.evaluate(() => {
          return new Promise((resolve) => {
            let start = Date.now();
            const check = () => {
              const spin = document.querySelector('.ant-spin-spinning');
              if (!spin || Date.now() - start > 8000) resolve();
              else setTimeout(check, 100);
            };
            check();
          });
        });
      } catch (e) {}

      ttiTime = Date.now() - startTime;
    } catch (err) {
      loadFailed = true;
      errorMessage = err.message;
      initialLoadTime = Date.now() - startTime;
      ttiTime = initialLoadTime;
      console.error(`Error loading ${item.name}: ${err.message}`);
    }

    page.off('request', requestHandler);
    page.off('response', responseHandler);

    // DOM diagnostics & tabular-nums inspection
    let tabularNumsCheck = { totalCount: 0, tabularCount: 0, missingCount: 0, missingTabularElements: [] };
    let domDiagnostics = {
      tableCount: 0,
      totalRowsRendered: 0,
      hasPagination: false,
      selectCount: 0,
      modalCount: 0,
      drawerCount: 0,
    };

    if (!loadFailed) {
      try {
        tabularNumsCheck = await page.evaluate(() => {
          const numbersAndTimers = Array.from(
            document.querySelectorAll('span, td, div, p, strong, h1, h2, h3, h4')
          ).filter((el) => {
            const text = (el.innerText || '').trim();
            return (
              /^\d{2}:\d{2}(:\d{2})?$/.test(text) ||
              /^\d{1,3}(\.\d{3})*\s?đ$/.test(text) ||
              /^\$\d+/.test(text) ||
              /^\d+(\.\d+)?%$/.test(text)
            );
          });

          let totalCount = numbersAndTimers.length;
          let tabularCount = 0;
          const missingTabularElements = [];

          numbersAndTimers.forEach((el) => {
            const style = window.getComputedStyle(el);
            const fontVar = style.fontVariantNumeric;
            const fontFeat = style.fontFeatureSettings;
            const parentStyle = window.getComputedStyle(el.parentElement);

            const isTabular =
              fontVar.includes('tabular-nums') ||
              fontFeat.includes('tnum') ||
              parentStyle.fontVariantNumeric.includes('tabular-nums') ||
              parentStyle.fontFeatureSettings.includes('tnum') ||
              el.classList.contains('tabular-nums');

            if (isTabular) {
              tabularCount++;
            } else {
              if (missingTabularElements.length < 5) {
                missingTabularElements.push({
                  text: el.innerText.trim().slice(0, 30),
                  tag: el.tagName,
                  className: el.className,
                });
              }
            }
          });

          return {
            totalCount,
            tabularCount,
            missingCount: totalCount - tabularCount,
            missingTabularElements,
          };
        });

        domDiagnostics = await page.evaluate(() => {
          const tables = document.querySelectorAll('.ant-table');
          const tableRows = document.querySelectorAll('.ant-table-row');
          const pagination = document.querySelectorAll('.ant-pagination');
          const selects = document.querySelectorAll('.ant-select');
          const modals = document.querySelectorAll('.ant-modal');
          const drawer = document.querySelectorAll('.ant-drawer');

          return {
            tableCount: tables.length,
            totalRowsRendered: tableRows.length,
            hasPagination: pagination.length > 0,
            selectCount: selects.length,
            modalCount: modals.length,
            drawerCount: drawer.length,
          };
        });
      } catch (e) {
        console.warn(`DOM inspection failed for ${item.name}: ${e.message}`);
      }
    }

    const totalRequests = requests.length;
    let totalPayloadBytes = 0;
    apiCalls.forEach((c) => (totalPayloadBytes += c.sizeBytes));
    const totalPayloadKb = (totalPayloadBytes / 1024).toFixed(2);
    const totalPayloadMb = (totalPayloadBytes / (1024 * 1024)).toFixed(3);

    const pageResult = {
      name: item.name,
      url: item.url,
      type: item.type,
      tabKey: item.tabKey || null,
      loadFailed,
      errorMessage,
      initialLoadDurationMs: initialLoadTime,
      ttiDurationMs: ttiTime,
      totalNetworkRequests: totalRequests,
      totalApiPayloadKb: totalPayloadKb,
      totalApiPayloadMb: totalPayloadMb,
      apiCallsCount: apiCalls.length,
      apiCalls,
      tabularNumsCheck,
      domDiagnostics,
    };

    console.log(` -> Load Time: ${initialLoadTime} ms`);
    console.log(` -> TTI / Render Complete: ${ttiTime} ms`);
    console.log(` -> Total Requests: ${totalRequests}, API Payload: ${totalPayloadKb} kB`);
    console.log(` -> API Calls Triggered: ${apiCalls.length}`);
    console.log(` -> Tabular-nums missing count: ${tabularNumsCheck.missingCount}/${tabularNumsCheck.totalCount}`);

    results.push(pageResult);
  }

  await browser.close();

  fs.writeFileSync(path.join(__dirname, 'benchmark_results.json'), JSON.stringify(results, null, 2));

  console.log('\nBenchmark completed successfully! Results written to benchmark_results.json');
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
