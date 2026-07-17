import jwt from 'jsonwebtoken';
import axios from 'axios';

const LOCAL_API_URL = 'http://localhost:4001/api';
const PROD_API_URL = 'https://api.lab.masteros.app/api';

const LOCAL_JWT_SECRET = 'super_secret_mos_lab_jwt_key_development_only';
const PROD_JWT_SECRET = 'mos_lab_jwt_super_secret_production_2026_XkP9mNqR7vT3wY';

const ADMIN_PAYLOAD = {
  id: 1,
  username: 'danhdo@gmail.com',
  displayName: 'Danny Do',
  role: 'admin',
};

// Generate JWT tokens
const localToken = jwt.sign(ADMIN_PAYLOAD, LOCAL_JWT_SECRET);
const prodToken = jwt.sign(ADMIN_PAYLOAD, PROD_JWT_SECRET);

const localClient = axios.create({
  baseURL: LOCAL_API_URL,
  headers: { Authorization: `Bearer ${localToken}` },
});

const prodClient = axios.create({
  baseURL: PROD_API_URL,
  headers: { Authorization: `Bearer ${prodToken}` },
});

function parseCSV(csvContent: string): any[][] {
  const lines = csvContent.split('\n');
  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      // Simple regex split for CSV lines handling basic quotes
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
}

async function runComparison(
  name: string,
  path: string,
  extractor: (data: any) => any,
  comparator: (local: any, prod: any) => boolean = (l, p) => JSON.stringify(l) === JSON.stringify(p)
) {
  console.log(`[CHECK] Comparing: ${name} (${path})`);
  try {
    const [localRes, prodRes] = await Promise.all([localClient.get(path), prodClient.get(path)]);

    const localData = extractor(localRes.data);
    const prodData = extractor(prodRes.data);

    const matches = comparator(localData, prodData);

    console.log(`  Local: ${JSON.stringify(localData)}`);
    console.log(`  Prod:  ${JSON.stringify(prodData)}`);
    if (matches) {
      console.log(`  \x1b[32m[PASS] MATCHED\x1b[0m`);
    } else {
      console.log(`  \x1b[31m[FAIL] MISMATCHED\x1b[0m`);
    }
  } catch (err: any) {
    console.error(`  \x1b[31m[ERROR] Failed to compare: ${err.message}\x1b[0m`);
    if (err.response) {
      console.error(`    Status: ${err.response.status}`);
      console.error(`    Data: ${JSON.stringify(err.response.data)}`);
    }
  }
  console.log('----------------------------------------------------');
}

async function main() {
  console.log('=== STARTING MULTI-PAGE DATA MATCHING CHECKS ===\n');

  // 1. Customer stats overview
  await runComparison('Overall Customer Stats', '/customers/stats', (d) => ({
    total: d.total,
    comboLive: d.comboLive,
    comboDead: d.comboDead,
    single: d.single,
  }));

  // 2. NYC - Touchpoint "CHẠM NOW" count (daysSinceLastVisit: 0 to 1)
  await runComparison(
    'NYC Touchpoint CHẠM NOW (0-1 days)',
    '/customers/stats?bucket=COMBO_LIVE&daysSinceLastVisitMin=0&daysSinceLastVisitMax=1',
    (d) => ({ total: d.total, comboLive: d.comboLive })
  );

  // 3. NYC - Touchpoint "CHẠM 7" count (daysSinceLastVisit: 7 to 7)
  await runComparison(
    'NYC Touchpoint CHẠM 7 (7-7 days)',
    '/customers/stats?bucket=COMBO_LIVE&daysSinceLastVisitMin=7&daysSinceLastVisitMax=7',
    (d) => ({ total: d.total, comboLive: d.comboLive })
  );

  // 4. Customers List comparison (compare first customer IDs and names to verify sorting/indexing)
  await runComparison('First page of Customers list (IDs & names)', '/customers?limit=5', (d) =>
    (d.data || []).map((c: any) => ({ id: c.id, fullName: c.fullName }))
  );

  // 5. KPI summary for June 2026
  await runComparison('KPI Summary (June 2026)', '/kpi/summary?startDate=2026-06-01&endDate=2026-06-30', (d) => ({
    totalPlanned: d.totalPlanned,
    totalCalled: d.totalCalled,
    totalAnswered: d.totalAnswered,
    totalHappy: d.totalHappy,
    totalBooked: d.totalBooked,
    totalCheckin: d.totalCheckin,
    totalEarnings: d.totalEarnings,
  }));

  // 6. Booker Salary Report comparison (Tâm Nguyễn - June 2026)
  await runComparison(
    'Booker Salary (Tâm Nguyễn - June 2026)',
    '/kpi/export-booker-salary?key=FDC0D0A177694777A&booker=T%C3%A2m%20Nguy%E1%BB%85n&date_from=2026-06-01&date_to=2026-06-30',
    (csvContent) => {
      const parsed = parseCSV(csvContent);
      const dataRows = parsed.slice(1, 5); // Ignore header row, take first 4 rows
      return dataRows.map((r) => ({
        id: r[0], // Order ID
        client: r[1], // User ID/Name
        bookingType: r[12], // Booking type (Combo/Refill/Fullset)
        bonus: r[13], // Booking bonus
        netRevenue: r[15], // Net revenue
      }));
    }
  );

  console.log('\n=== CHECKS COMPLETED ===');
}

main();
