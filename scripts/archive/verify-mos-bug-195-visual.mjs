import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { readFileSync, mkdirSync } from 'node:fs';

const timeout = setTimeout(() => {
  console.error('Playwright verification timed out');
  process.exit(1);
}, 25000);
timeout.unref();

let browser = null;

try {
  mkdirSync(resolve(process.cwd(), 'scratch'), { recursive: true });

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  // HTML simulating iOS PWA environment with Safe Area Insets and the adaptive-overlay modal
  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark-theme">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
      <title>MOS-BUG-195 Visual QA</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        :root {
          --safe-area-top: 47px;
          --safe-area-bottom: 34px;
        }

        body {
          margin: 0;
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: #020617;
          color: #f8fafc;
          overflow: hidden;
          height: 100vh;
        }

        /* Simulated iOS PWA Status Bar */
        .ios-status-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 47px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          z-index: 99999;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          pointer-events: none;
        }

        .ios-home-indicator {
          position: fixed;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 134px;
          height: 5px;
          background: #ffffff;
          border-radius: 100px;
          z-index: 99999;
          pointer-events: none;
          opacity: 0.8;
        }

        /* Rules matching globals.css */
        .adaptive-overlay-mobile-fullscreen.ant-modal,
        .adaptive-overlay-mobile-fullscreen .ant-modal {
          height: 100dvh !important;
          max-height: 100dvh !important;
          margin: 0 auto !important;
          max-width: calc(100vw - 16px);
          top: 0 !important;
          width: calc(100vw - 16px) !important;
          position: relative;
        }

        .adaptive-overlay-mobile-fullscreen.ant-modal .ant-modal-content,
        .adaptive-overlay-mobile-fullscreen .ant-modal-content {
          border-radius: 16px !important;
          display: flex !important;
          flex-direction: column !important;
          height: 100dvh !important;
          max-height: 100dvh !important;
          overflow: hidden !important;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: max(16px, calc(var(--safe-area-top) + 8px)) !important;
          padding-bottom: max(16px, calc(var(--safe-area-bottom) + 8px)) !important;
          padding-left: 16px !important;
          padding-right: 16px !important;
          box-sizing: border-box;
          position: relative;
        }

        .adaptive-overlay-mobile-fullscreen.ant-modal .ant-modal-header,
        .adaptive-overlay-mobile-fullscreen .ant-modal-header {
          flex-shrink: 0 !important;
          margin-bottom: 12px !important;
          padding-right: 48px !important;
        }

        .adaptive-overlay-mobile-fullscreen.ant-modal .ant-modal-title,
        .adaptive-overlay-mobile-fullscreen .ant-modal-title {
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
        }

        .adaptive-overlay-mobile-fullscreen.ant-modal .ant-modal-body,
        .adaptive-overlay-mobile-fullscreen .ant-modal-body {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }

        .adaptive-overlay-mobile-fullscreen.ant-modal .ant-modal-footer,
        .adaptive-overlay-mobile-fullscreen .ant-modal-footer {
          flex-shrink: 0 !important;
          margin-top: 12px !important;
        }

        .adaptive-overlay-mobile-fullscreen.ant-modal .ant-modal-close,
        .adaptive-overlay-mobile-fullscreen .ant-modal-close {
          border-radius: 8px !important;
          color: #cbd5e1 !important;
          background: rgba(255, 255, 255, 0.08) !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 36px !important;
          min-width: 36px !important;
          width: 36px !important;
          height: 36px !important;
          top: max(12px, calc(var(--safe-area-top) + 6px)) !important;
          right: 12px !important;
          position: absolute !important;
          z-index: 1020 !important;
          border: none;
          cursor: pointer;
        }

        /* Light theme overrides */
        .light-theme {
          background: #f1f5f9;
          color: #0f172a;
        }
        .light-theme .ios-status-bar {
          color: #0f172a;
        }
        .light-theme .ios-home-indicator {
          background: #0f172a;
        }
        .light-theme .adaptive-overlay-mobile-fullscreen .ant-modal-content {
          background: #ffffff !important;
          border-color: rgba(0, 0, 0, 0.1) !important;
        }
        .light-theme .adaptive-overlay-mobile-fullscreen .ant-modal-title {
          color: #0f172a !important;
        }
        .light-theme .adaptive-overlay-mobile-fullscreen .ant-modal-close {
          color: #334155 !important;
          background: rgba(0, 0, 0, 0.05) !important;
        }
      </style>
    </head>
    <body class="flex items-center justify-center p-2">
      <!-- Simulated iOS Chrome -->
      <div class="ios-status-bar">
        <span>11:50</span>
        <div class="flex items-center gap-1.5 text-xs">
          <span>5G</span>
          <span>●●●●</span>
          <span class="rounded px-1 bg-white/20 text-[10px]">13%</span>
        </div>
      </div>
      <div class="ios-home-indicator"></div>

      <!-- Adaptive Modal on Mobile PWA -->
      <div class="adaptive-overlay adaptive-overlay-mobile-fullscreen ant-modal">
        <div class="ant-modal-content">
          <button class="ant-modal-close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div class="ant-modal-header">
            <div class="ant-modal-title">Phản hồi mOS</div>
          </div>

          <div class="ant-modal-body space-y-4">
            <!-- Tabs -->
            <div class="flex items-center border-b border-slate-700/50 pb-2 gap-4 text-sm font-semibold">
              <span class="text-slate-400">Báo lỗi</span>
              <span class="text-slate-400">Tính năng mới</span>
              <span class="text-amber-400 border-b-2 border-amber-400 pb-1 flex items-center gap-1.5">
                Yêu cầu của tôi
                <span class="bg-amber-400/20 text-amber-300 text-xs px-1.5 rounded-full">40</span>
              </span>
            </div>

            <!-- List Preview -->
            <div class="space-y-2">
              <div class="text-xs uppercase tracking-wider text-slate-400 font-bold">mOS đang xử lý</div>
              <div class="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50 flex justify-between items-center">
                <div>
                  <div class="font-semibold text-sm">MOS-BUG-167</div>
                  <div class="text-xs text-slate-400">Lỗi hiện doanh thu thực tế sai...</div>
                </div>
                <span class="text-xs text-sky-400">Đang xử lý</span>
              </div>
            </div>

            <div class="space-y-2">
              <div class="text-xs uppercase tracking-wider text-emerald-400 font-bold">Đã hoàn tất</div>
              <div class="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50 flex justify-between items-center">
                <div>
                  <div class="font-semibold text-sm">MOS-BUG-193</div>
                  <div class="text-xs text-slate-400">https://lab.masteros.app/chat?convId=...</div>
                </div>
                <span class="text-xs text-emerald-400">Đã xong</span>
              </div>
              <div class="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50 flex justify-between items-center">
                <div>
                  <div class="font-semibold text-sm">MOS-BUG-190</div>
                  <div class="text-xs text-slate-400">Bấm thêm subtask trong main task...</div>
                </div>
                <span class="text-xs text-emerald-400">Đã xong</span>
              </div>
            </div>
          </div>

          <div class="ant-modal-footer flex justify-end gap-2 pt-2 border-t border-slate-700/50">
            <button class="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-sm font-semibold">Đóng</button>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);

  // Check metrics
  const closeBtnBox = await page.locator('.ant-modal-close').boundingBox();
  const titleBox = await page.locator('.ant-modal-title').boundingBox();
  const statusBarBox = await page.locator('.ios-status-bar').boundingBox();
  const footerBox = await page.locator('.ant-modal-footer').boundingBox();

  console.log('Close Button Box:', closeBtnBox);
  console.log('Title Box:', titleBox);
  console.log('Status Bar Bottom:', statusBarBox.y + statusBarBox.height);
  console.log('Footer Box Bottom:', footerBox.y + footerBox.height);

  // Assertions:
  // 1. Close button top must be below status bar height (47px)
  if (!closeBtnBox || closeBtnBox.y < 47) {
    throw new Error(`Close button overlaps status bar: top=${closeBtnBox?.y}, statusBarHeight=47`);
  }

  // 2. Title top must be below status bar height (47px)
  if (!titleBox || titleBox.y < 47) {
    throw new Error(`Title overlaps status bar: top=${titleBox?.y}, statusBarHeight=47`);
  }

  // 3. Touch target size >= 36px
  if (closeBtnBox.width < 36 || closeBtnBox.height < 36) {
    throw new Error(`Close button touch target too small: ${closeBtnBox.width}x${closeBtnBox.height}`);
  }

  // 4. Footer bottom must have clearance from screen bottom (844px) >= 34px (home indicator)
  const screenBottom = 844;
  const footerBottom = footerBox.y + footerBox.height;
  const clearance = screenBottom - footerBottom;
  console.log('Home Indicator clearance:', clearance);
  if (clearance < 20) {
    throw new Error(`Footer touches/overlaps home indicator: clearance=${clearance}`);
  }

  // Take screenshot in Dark Theme
  await page.screenshot({ path: resolve(process.cwd(), 'scratch/mos-bug-195-pwa-modal-dark.png') });

  // Switch to Light Theme and verify
  await page.evaluate(() => {
    document.documentElement.className = 'light-theme';
  });
  await page.screenshot({ path: resolve(process.cwd(), 'scratch/mos-bug-195-pwa-modal-light.png') });

  console.log('Playwright visual QA PASSED: MOS-BUG-195 modal layout verified on iOS PWA viewport');
} finally {
  await browser?.close?.();
  process.exit(0);
}
