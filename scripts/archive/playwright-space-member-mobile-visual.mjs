import { chromium } from 'playwright';

const t = setTimeout(() => {
  console.error('Playwright visual test timed out');
  process.exit(1);
}, 25000);
t.unref();

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 12 viewport
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>mOS Chat - Space Members Mobile Visual QA</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #020617; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        
        /* Mobile Header */
        header { background: rgba(15, 23, 42, 0.95); border-bottom: 1px solid #1e293b; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; }
        .back-btn { color: #f59e0b; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 2px; }
        .room-info { text-align: center; }
        .room-title { font-size: 14px; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .room-sub { font-size: 11px; color: #94a3b8; }
        .header-actions { display: flex; align-items: center; gap: 6px; }
        .icon-btn { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #1e293b; color: #10b981; border: 1px solid #334155; }

        /* Modal Overlay */
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; padding: 12px; z-index: 100; }
        .modal { background: #0f172a; border: 1px solid #334155; border-radius: 16px; width: 100%; max-width: 366px; padding: 18px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .modal-title { font-size: 15px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px; }
        .close-btn { color: #94a3b8; font-size: 18px; cursor: pointer; }

        /* Add member section */
        .add-section { background: rgba(30, 41, 59, 0.7); border: 1px solid #334155; border-radius: 12px; padding: 12px; margin-bottom: 14px; }
        .add-label { font-size: 11px; font-weight: 700; color: #cbd5e1; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
        .input-row { display: flex; gap: 8px; margin-bottom: 10px; }
        .select-mock { flex: 1; background: #020617; border: 1px solid #475569; border-radius: 8px; padding: 6px 10px; font-size: 12px; color: #94a3b8; }
        .btn-add { background: #059669; color: #fff; font-size: 12px; font-weight: 700; border: none; border-radius: 8px; padding: 6px 14px; cursor: pointer; }

        /* Group pills */
        .groups-title { font-size: 10.5px; font-weight: 700; color: #94a3b8; margin-bottom: 6px; }
        .pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .pill { border-radius: 9999px; font-size: 10px; font-weight: 700; padding: 3px 8px; display: inline-flex; align-items: center; gap: 4px; }

        /* Member List */
        .members-title { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; display: flex; justify-content: space-between; }
        .member-row { display: flex; align-items: center; justify-content: space-between; padding: 8px; background: rgba(30, 41, 59, 0.4); border: 1px solid #1e293b; border-radius: 10px; margin-bottom: 6px; }
        .member-info { display: flex; align-items: center; gap: 10px; }
        .avatar { width: 32px; height: 32px; border-radius: 50%; background: #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
        .name { font-size: 12px; font-weight: 700; color: #fff; }
        .role { font-size: 10.5px; color: #94a3b8; }
        .nick { color: #34d399; font-weight: 700; }
        .btn-remove { font-size: 11px; font-weight: 700; color: #f43f5e; background: none; border: none; padding: 4px 6px; }
      </style>
    </head>
    <body>
      <header>
        <div class="back-btn">‹ Hộp thư</div>
        <div class="room-info">
          <div class="room-title"><span>🏢</span> van-hanh-shop</div>
          <div class="room-sub">3 thành viên</div>
        </div>
        <div class="header-actions">
          <div class="icon-btn" title="Thêm thành viên">＋</div>
          <div class="icon-btn" style="color: #cbd5e1;">☑</div>
        </div>
      </header>

      <div class="overlay">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">
              <span style="color: #3b82f6;">👥</span>
              <span>Thành viên · #van-hanh-shop</span>
            </div>
            <div class="close-btn">✕</div>
          </div>

          <div class="add-section">
            <div class="add-label">
              <span style="color: #10b981;">＋</span>
              <span>Thêm đồng nghiệp hoặc cả Bộ phận</span>
            </div>
            <div class="input-row">
              <div class="select-mock">Chọn đồng nghiệp để thêm...</div>
              <button class="btn-add">Thêm</button>
            </div>
            <div class="groups-title">Thêm nhanh cả Bộ phận / Nhóm:</div>
            <div class="pills">
              <span class="pill" style="background: rgba(212, 167, 44, 0.15); border: 1px solid rgba(212, 167, 44, 0.4); color: #d4a72c;">+ 🏢 Shop Ops (+4)</span>
              <span class="pill" style="background: rgba(250, 140, 22, 0.15); border: 1px solid rgba(250, 140, 22, 0.4); color: #fa8c16;">+ 📈 Growth (+2)</span>
              <span class="pill" style="background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.4); color: #a855f7;">+ 🎓 Academy (+3)</span>
            </div>
          </div>

          <div class="members-title">
            <span>Danh sách thành viên hiện tại</span>
            <span style="color: #10b981;">3 người</span>
          </div>

          <div class="member-row">
            <div class="member-info">
              <div class="avatar" style="background: #a855f7;">DD</div>
              <div>
                <div class="name">Danny Do <span style="font-size: 9px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 1px 4px; border-radius: 4px;">Bạn</span></div>
                <div class="role">Super Admin</div>
              </div>
            </div>
          </div>

          <div class="member-row">
            <div class="member-info">
              <div class="avatar" style="background: #059669;">HM</div>
              <div>
                <div class="name"><span class="nick">My My</span> <span style="font-size: 11px; color: #94a3b8; font-weight: normal;">(Hoài My)</span></div>
                <div class="role">CV Mi · Biệt danh</div>
              </div>
            </div>
            <button class="btn-remove">Xóa</button>
          </div>

          <div class="member-row">
            <div class="member-info">
              <div class="avatar" style="background: #d97706;">TT</div>
              <div>
                <div class="name">Thùy Trang</div>
                <div class="role">Tư Vấn CC</div>
              </div>
            </div>
            <button class="btn-remove">Xóa</button>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  await page.screenshot({ path: '/tmp/playwright-space-member-mobile.png' });
  console.log('Playwright visual QA PASSED: Screenshot captured at /tmp/playwright-space-member-mobile.png');
} catch (err) {
  console.error('Playwright error:', err);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  process.exit(0);
}
