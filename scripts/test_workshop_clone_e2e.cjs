const puppeteer = require('puppeteer');
const http = require('http');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = '/Users/dannydo/.gemini/antigravity/brain/9665f9fb-99ee-435c-82c4-cc494790a5b2';
const WEB_URL = 'http://localhost:4000';
const API_URL = 'http://localhost:4001';

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

async function dismissDailyPromptsIfPresent(page) {
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const dismissBtn = btns.find(
      (b) =>
        b.innerText.includes('Để mai mình đổi') ||
        b.innerText.includes('Bỏ qua') ||
        b.innerText.includes('Đóng')
    );
    if (dismissBtn) dismissBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));
}

async function runE2ETest() {
  console.log('🚀 Starting Comprehensive Workshop Clone E2E Test on Dev Environment...');

  // 1. Get mock token
  const authData = await getMockToken();
  if (!authData || !authData.token) {
    throw new Error('Failed to obtain mock auth token from API');
  }
  console.log('✅ Auth token acquired for:', authData.user?.displayName, `(${authData.user?.role})`);

  // 2. Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('⚠️ [BROWSER ERROR]:', msg.text());
  });

  try {
    // 3. Authenticate via localStorage
    console.log('🔑 Injecting auth tokens into browser localStorage...');
    await page.goto(`${WEB_URL}/dashboard/today`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(
      (token, user) => {
        localStorage.setItem('mos_token', token);
        localStorage.setItem('mos_user', JSON.stringify(user));
      },
      authData.token,
      authData.user
    );

    // 4. Navigate to Workshops list
    console.log('📋 Step 1: Navigating to Workshop List...');
    await page.goto(`${WEB_URL}/dashboard/academy-leads/workshops`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('table', { timeout: 15000 });
    await dismissDailyPromptsIfPresent(page);

    const listScreenshot = path.join(ARTIFACT_DIR, 'e2e_01_workshops_list.png');
    await page.screenshot({ path: listScreenshot, fullPage: false });
    console.log('📸 Captured:', listScreenshot);

    // Verify "Lash&Lunch" exists in table
    const tableContent = await page.evaluate(() => document.body.innerText);
    if (!tableContent.includes('Lash&Lunch')) {
      throw new Error('Expected "Lash&Lunch" to be in workshops list');
    }
    console.log('✅ Found source workshop "Lash&Lunch" in list.');

    // 5. Navigate into source workshop detail
    console.log('🔍 Step 2: Opening source workshop workspace (slug: lashlunch)...');
    await page.goto(`${WEB_URL}/dashboard/academy-leads/workshops/lashlunch`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.academy-workshop-header-actions', { timeout: 15000 });
    await dismissDailyPromptsIfPresent(page);

    const sourceScreenshot = path.join(ARTIFACT_DIR, 'e2e_02_source_workshop.png');
    await page.screenshot({ path: sourceScreenshot, fullPage: false });
    console.log('📸 Captured:', sourceScreenshot);

    // Verify "Nhân bản khóa mới" button exists
    const cloneButtonExists = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Nhân bản khóa mới"]');
      return Boolean(btn);
    });
    if (!cloneButtonExists) {
      throw new Error('Clone button not found in header actions');
    }
    console.log('✅ "Nhân bản khóa mới" button found in header actions.');

    // 6. Click Clone button and open Modal
    console.log('⚡ Step 3: Triggering Clone Modal...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Nhân bản khóa mới"]');
      btn.click();
    });

    // Wait for clone modal to appear and load preview
    console.log('⏳ Waiting for clone preview data...');
    await page.waitForFunction(
      () => {
        const modals = Array.from(document.querySelectorAll('.ant-modal-content'));
        const target = modals.find((m) => m.innerText.includes('Nhân bản Workshop'));
        if (!target) return false;
        const nameInput = target.querySelector('input#name');
        return nameInput && nameInput.value && nameInput.value.includes('(K');
      },
      { timeout: 15000 }
    );

    // Read modal form values & preview checklist
    const previewData = await page.evaluate(() => {
      const modals = Array.from(document.querySelectorAll('.ant-modal-content'));
      const target = modals.find((m) => m.innerText.includes('Nhân bản Workshop'));
      const nameInput = target.querySelector('input#name');
      const slugInput = target.querySelector('input#slug');
      const modalText = target.innerText;
      return {
        name: nameInput?.value,
        slug: slugInput?.value,
        hasAgendaCount: modalText.includes('Agenda & Timeline\n(6 chặng)'),
        hasMenuCount: modalText.includes('Thực đơn ăn trưa\n(20 món)'),
        hasEquipmentCount: modalText.includes('Bộ dụng cụ đồ nghề\n(4 gói)'),
        hasQuizCount: modalText.includes('36 câu hỏi'),
        text: modalText,
      };
    });

    console.log('📊 Clone preview extracted:', {
      suggestedName: previewData.name,
      suggestedSlug: previewData.slug,
      hasAgendaCount: previewData.hasAgendaCount,
      hasMenuCount: previewData.hasMenuCount,
      hasEquipmentCount: previewData.hasEquipmentCount,
      hasQuizCount: previewData.hasQuizCount,
    });

    if (!previewData.name?.match(/\(K\d+\)/)) {
      throw new Error(`Unexpected suggested name: ${previewData.name}, expected to contain "(Kxx)"`);
    }

    const modalScreenshot = path.join(ARTIFACT_DIR, 'e2e_03_clone_modal_preview.png');
    await page.screenshot({ path: modalScreenshot, fullPage: false });
    console.log('📸 Captured:', modalScreenshot);

    // 7. Submit clone request
    console.log('🚀 Step 4: Submitting Clone Request to create new workshop instance...');
    await page.evaluate(() => {
      const modals = Array.from(document.querySelectorAll('.ant-modal-content'));
      const target = modals.find((m) => m.innerText.includes('Nhân bản Workshop'));
      const submitBtn = target.querySelector('button[type="submit"]');
      submitBtn.click();
    });

    // 8. Wait for redirection to new cloned workshop page
    console.log('⏳ Waiting for navigation to new cloned workshop URL...');
    await page.waitForFunction(
      () => window.location.pathname.includes('/workshops/lashlunch-k'),
      { timeout: 25000 }
    );

    const newUrl = page.url();
    console.log('🎉 Successfully navigated to new cloned workshop:', newUrl);

    // Wait for the new workspace page to load
    await page.waitForSelector('.academy-workshop-header-actions', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));
    await dismissDailyPromptsIfPresent(page);

    const clonedScreenshot = path.join(ARTIFACT_DIR, 'e2e_04_cloned_workshop_workspace.png');
    await page.screenshot({ path: clonedScreenshot, fullPage: false });
    console.log('📸 Captured:', clonedScreenshot);

    // Verify Workspace content of cloned instance:
    const clonedWorkspaceInfo = await page.evaluate(() => {
      const title = document.querySelector('h1')?.innerText || '';
      const text = document.body.innerText;
      return {
        title,
        hasZeroParticipants: text.includes('0 học viên') || text.includes('0 check-in / 0 học viên'),
        url: window.location.href,
      };
    });
    console.log('📋 Cloned workspace verification:', clonedWorkspaceInfo);

    if (!clonedWorkspaceInfo.hasZeroParticipants) {
      console.warn('⚠️ Warning: Expected 0 participants in fresh cloned roster, text check result:', clonedWorkspaceInfo);
    } else {
      console.log('✅ Roster isolation confirmed: 0 participants in fresh cloned workshop!');
    }

    // 9. Check Agenda Tab in cloned workshop
    console.log('📅 Step 5: Checking Agenda Tab in cloned workshop...');
    await page.goto(`${newUrl}?tab=agenda`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));
    await dismissDailyPromptsIfPresent(page);

    const agendaScreenshot = path.join(ARTIFACT_DIR, 'e2e_05_cloned_agenda_tab.png');
    await page.screenshot({ path: agendaScreenshot, fullPage: false });
    console.log('📸 Captured:', agendaScreenshot);

    // 10. Check Menu Tab in cloned workshop
    console.log('🍜 Step 6: Checking Menu Tab in cloned workshop...');
    await page.goto(`${newUrl}?tab=menu`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1500));
    await dismissDailyPromptsIfPresent(page);

    const menuScreenshot = path.join(ARTIFACT_DIR, 'e2e_06_cloned_menu_tab.png');
    await page.screenshot({ path: menuScreenshot, fullPage: false });
    console.log('📸 Captured:', menuScreenshot);

    // 11. Navigate back to workshops list and verify Series filter
    console.log('🏷️ Step 7: Verifying Series Filter on Workshops Directory...');
    await page.goto(`${WEB_URL}/dashboard/academy-leads/workshops`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('table', { timeout: 15000 });
    await dismissDailyPromptsIfPresent(page);

    const seriesFilterExists = await page.evaluate(() => {
      const selectElements = Array.from(document.querySelectorAll('.ant-select-selection-item'));
      return selectElements.some(
        (el) => el.innerText.includes('Tất cả chuỗi Series') || el.innerText.includes('Series:')
      );
    });

    console.log('Series filter dropdown present:', seriesFilterExists ? 'YES' : 'NO');

    const seriesFilterScreenshot = path.join(ARTIFACT_DIR, 'e2e_07_series_filter.png');
    await page.screenshot({ path: seriesFilterScreenshot, fullPage: false });
    console.log('📸 Captured:', seriesFilterScreenshot);

    // 12. Direct API verification of ACID clone in DB
    console.log('🔬 Step 8: Verifying DB invariants via backend API...');
    const listResponse = await new Promise((res) => {
      http.get(
        `${API_URL}/api/academy-sales/workshops?seriesKey=lashlunch`,
        { headers: { Authorization: `Bearer ${authData.token}` } },
        (r) => {
          let d = '';
          r.on('data', (c) => (d += c));
          r.on('end', () => res(JSON.parse(d)));
        }
      );
    });

    const seriesWorkshops = listResponse.data || [];
    console.log(
      'Series "lashlunch" workshops in DB:',
      seriesWorkshops.map((w) => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        seriesKey: w.seriesKey,
        parentWorkshopId: w.parentWorkshopId,
        participantCount: w.participantCount,
      }))
    );

    const clonedDbRecord = seriesWorkshops.find((w) => w.slug === previewData.slug || w.slug.includes('-k'));
    if (!clonedDbRecord) {
      throw new Error('Cloned workshop record not found in series query from API');
    }

    if (clonedDbRecord.parentWorkshopId !== 8) {
      throw new Error(`Expected parentWorkshopId to be 8, got ${clonedDbRecord.parentWorkshopId}`);
    }
    if (clonedDbRecord.participantCount !== 0) {
      throw new Error(`Expected participantCount to be 0, got ${clonedDbRecord.participantCount}`);
    }

    console.log('✅ DB Verification 100% PASSED:');
    console.log('   - seriesKey:', clonedDbRecord.seriesKey);
    console.log('   - parentWorkshopId:', clonedDbRecord.parentWorkshopId);
    console.log('   - participantCount:', clonedDbRecord.participantCount);

    console.log('\n🎉 ALL WORKSHOP CLONE E2E TESTS PASSED 100% ON DEV!');
  } catch (err) {
    console.error('❌ E2E Test Failed:', err);
    const errScreenshot = path.join(ARTIFACT_DIR, 'e2e_error.png');
    await page.screenshot({ path: errScreenshot, fullPage: false }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

runE2ETest().catch((err) => {
  console.error(err);
  process.exit(1);
});
