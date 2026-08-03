const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');

const TARGET_URL = 'http://localhost:4000/dashboard/nyc/campaigns/ghost-mode';
const BASE_API = 'http://localhost:4001';

async function getAuthToken() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ isMock: true, email: 'danhdo@gmail.com' });
    const req = http.request(
      `${BASE_API}/api/auth/google`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body).token);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function benchmark(url, label, browser, token) {
  const page = await browser.newPage();

  // Set auth token
  await page.evaluateOnNewDocument((t) => {
    localStorage.setItem('mos_token', t);
    localStorage.setItem(
      'mos_user',
      JSON.stringify({ id: 1, email: 'danhdo@gmail.com', name: 'Danny Do', role: 'admin', username: 'admin' })
    );
  }, token);

  // Track API requests
  const apiRequests = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      const timing = response.timing();
      apiRequests.push({
        url,
        status: response.status(),
        duration: timing ? timing.receiveHeadersEnd : null,
        bytes: parseInt(response.headers()['content-length'] || '0', 10),
      });
    }
  });

  const startTime = Date.now();

  // Navigate
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  const metrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0];
    return {
      domContentLoaded: Math.round(perf?.domContentLoadedEventEnd || 0),
    };
  });

  // Wait a bit more for lazy-loaded data
  await new Promise((r) => setTimeout(r, 2000));

  const tti = Date.now() - startTime;

  // DOM analysis
  const domAnalysis = await page.evaluate(() => {
    const allNodes = document.querySelectorAll('*');
    let missingTabularNums = 0;
    allNodes.forEach((node) => {
      if (node.childNodes.length === 1 && node.childNodes[0].nodeType === 3) {
        const text = node.textContent?.trim() || '';
        if (/^\d[\d,.\s]*$/.test(text) && text.length > 0) {
          const style = getComputedStyle(node);
          if (!style.fontVariantNumeric.includes('tabular-nums')) {
            missingTabularNums++;
          }
        }
      }
    });

    const hasH1 = !!document.querySelector('h1');
    const hasNav = !!document.querySelector('nav');
    const unlabeledButtons = document.querySelectorAll('button:not([aria-label]):not([title])');
    let iconOnlyButtons = 0;
    unlabeledButtons.forEach((btn) => {
      const text = btn.textContent?.trim() || '';
      if (text.length === 0 || text.length <= 2) iconOnlyButtons++;
    });

    // Check table rows
    const tableRows = document.querySelectorAll('.ant-table-row');

    return {
      nodeCount: allNodes.length,
      missingTabularNums,
      hasH1,
      hasNav,
      iconOnlyButtons,
      tableRowCount: tableRows.length,
    };
  });

  const report = {
    url,
    label,
    domContentLoaded: metrics.domContentLoaded,
    tti,
    totalNetworkReqs: apiRequests.length + (await page.evaluate(() => performance.getEntriesByType('resource').length)),
    apiCallCount: apiRequests.length,
    apiPayloadKB: +(apiRequests.reduce((s, r) => s + (r.bytes || 0), 0) / 1024).toFixed(2),
    apiRequests,
    dom: domAnalysis,
  };

  console.log(`\n${'='.repeat(40)}`);
  console.log(`Benchmarking: ${label}`);
  console.log(`URL: ${url}`);
  console.log(`${'='.repeat(40)}`);
  console.log(`DOM Content Loaded: ${metrics.domContentLoaded} ms`);
  console.log(`TTI / Render Complete: ${tti} ms`);
  console.log(`Total Network Reqs: ${report.totalNetworkReqs}`);
  console.log(`API Calls Triggered: ${apiRequests.length}`);
  console.log(`Total API Payload: ${report.apiPayloadKB} kB`);
  console.log(`DOM Node Count: ${domAnalysis.nodeCount}`);
  console.log(`Table Rows Rendered: ${domAnalysis.tableRowCount}`);
  console.log(`Numbers missing tabular-nums: ${domAnalysis.missingTabularNums}`);
  console.log(
    `Accessibility: Has H1 = ${domAnalysis.hasH1}, Has Nav = ${domAnalysis.hasNav}, Unlabeled Icon Buttons = ${domAnalysis.iconOnlyButtons}`
  );

  await page.close();
  return report;
}

(async () => {
  const token = await getAuthToken();
  console.log(`Successfully acquired mock auth token for: Danny Do`);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  const report = await benchmark(TARGET_URL, 'NYC Ghost Mode Campaign', browser, token);

  await browser.close();

  // Save results
  const output = { timestamp: new Date().toISOString(), report };
  fs.writeFileSync('scripts/benchmark_nyc_ghost_results.json', JSON.stringify(output, null, 2));
  console.log('\nSaved benchmark result to scripts/benchmark_nyc_ghost_results.json');
})();
