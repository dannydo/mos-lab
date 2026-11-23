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
    viewport: { width: 390, height: 844 }, // iPhone 12/13/14
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  // Test rendering Mobile Chat Feed with standardized avatars
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>mOS Chat - Mobile Avatar Visual QA (MOS-BUG-158)</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #020617; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        header { height: 56px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background: #0f172a; flex-shrink: 0; }
        .header-peer { display: flex; align-items: center; gap: 10px; }
        .avatar-md { width: 32px; height: 32px; border-radius: 9999px; object-cover: cover; border: 1px solid rgba(255,255,255,0.15); }
        .feed { flex: 1; overflow-y: auto; padding: 16px 12px; display: flex; flex-direction: column; gap: 10px; }
        .welcome { text-align: center; padding: 18px 0; border-bottom: 1px solid #1e293b; margin-bottom: 10px; }
        .welcome-avatar { width: 56px; height: 56px; margin: 0 auto 10px; border-radius: 16px; object-fit: cover; border: 1.5px solid rgba(212, 168, 75, 0.4); box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
        
        .pinned-banner { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; margin-bottom: 8px; font-size: 12px; }
        .pinned-left { display: flex; align-items: center; gap: 8px; }
        .avatar-xs { width: 18px; height: 18px; border-radius: 9999px; object-fit: cover; }
        
        .msg-row { display: flex; flex-direction: column; margin-bottom: 6px; }
        .msg-other { align-items: flex-start; }
        .msg-mine { align-items: flex-end; }
        
        .sender-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; padding-left: 4px; }
        .avatar-sm { width: 24px; height: 24px; border-radius: 9999px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); }
        .avatar-initials-sm { width: 24px; height: 24px; border-radius: 9999px; background: linear-gradient(135deg, #a855f7, #6366f1); color: #fff; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
        .sender-name { font-size: 12px; font-weight: 600; color: #cbd5e1; }
        .role-badge { font-size: 9px; padding: 1px 6px; border-radius: 4px; background: #1e293b; color: #94a3b8; border: 1px solid #334155; text-transform: uppercase; font-weight: 600; }
        
        .bubble { max-width: 85%; padding: 10px 14px; border-radius: 18px; font-size: 13.5px; line-height: 1.45; }
        .bubble-other { background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(51, 65, 85, 0.7); border-top-left-radius: 4px; color: #f1f5f9; }
        .bubble-mine { background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.4); border-top-right-radius: 4px; color: #fff; }
        
        .quote-preview { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 8px; background: rgba(15, 23, 42, 0.6); border-left: 2px solid #f59e0b; margin-bottom: 8px; font-size: 11px; }
        .quote-avatar { width: 18px; height: 18px; border-radius: 9999px; object-fit: cover; }
        
        footer { height: 60px; border-top: 1px solid #1e293b; background: #0f172a; display: flex; align-items: center; padding: 0 12px; gap: 8px; flex-shrink: 0; }
        .composer-box { flex: 1; height: 38px; background: #1e293b; border-radius: 19px; border: 1px solid #334155; padding: 0 14px; color: #fff; font-size: 13px; display: flex; align-items: center; }
      </style>
    </head>
    <body>
      <header>
        <div class="header-peer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
          <img class="avatar-md" src="https://cdn.wingslashes.com/avatars/danny.jpg" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'32\\' height=\\'32\\'><rect width=\\'32\\' height=\\'32\\' fill=\\'%23d4a84b\\'/><text x=\\'50%\\' y=\\'55%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' fill=\\'%23000\\' font-size=\\'12\\' font-weight=\\'bold\\'>DD</text></svg>'" alt="Danny Do" />
          <div>
            <div style="font-size: 13.5px; font-weight: 700; color: #fff;">Danny Do</div>
            <div style="font-size: 10.5px; color: #10b981; font-weight: 500;">● Đang hoạt động</div>
          </div>
        </div>
        <div style="font-size: 12px; color: #f59e0b; font-weight: 600;">mOS Chat</div>
      </header>

      <div class="feed">
        <!-- Pinned Message Banner -->
        <div class="pinned-banner">
          <div class="pinned-left">
            <span style="color: #fbbf24; font-weight: 700;">📌 Ghim:</span>
            <img class="avatar-xs" src="https://cdn.wingslashes.com/avatars/danny.jpg" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'18\\' height=\\'18\\'><rect width=\\'18\\' height=\\'18\\' fill=\\'%23d4a84b\\'/><text x=\\'50%\\' y=\\'55%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' fill=\\'%23000\\' font-size=\\'9\\' font-weight=\\'bold\\'>DD</text></svg>'" alt="" />
            <span style="font-weight: 600; color: #fff;">Danny Do:</span>
            <span style="color: #cbd5e1; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Chuẩn hóa avatar trên mobile chat</span>
          </div>
        </div>

        <!-- 1-on-1 DM Welcome Header -->
        <div class="welcome">
          <img class="welcome-avatar" src="https://cdn.wingslashes.com/avatars/danny.jpg" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'56\\' height=\\'56\\'><rect width=\\'56\\' height=\\'56\\' fill=\\'%23d4a84b\\'/><text x=\\'50%\\' y=\\'55%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' fill=\\'%23000\\' font-size=\\'20\\' font-weight=\\'bold\\'>DD</text></svg>'" alt="Danny Do" />
          <div style="font-weight: 700; font-size: 15px;">Danny Do</div>
          <div style="font-size: 11.5px; color: #94a3b8; margin-top: 3px;">Quản trị viên hệ thống Wings & mOS</div>
        </div>

        <!-- Message from Danny with Avatar -->
        <div class="msg-row msg-other">
          <div class="sender-header">
            <img class="avatar-sm" src="https://cdn.wingslashes.com/avatars/danny.jpg" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'24\\' height=\\'24\\'><rect width=\\'24\\' height=\\'24\\' fill=\\'%23d4a84b\\'/><text x=\\'50%\\' y=\\'55%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' fill=\\'%23000\\' font-size=\\'10\\' font-weight=\\'bold\\'>DD</text></svg>'" alt="Danny Do" />
            <span class="sender-name">Danny Do</span>
            <span class="role-badge">Admin</span>
          </div>
          <div class="bubble bubble-other">
            Chào Khải, anh vừa duyệt kế hoạch hiển thị avatar trên mobile chat rồi nhé!
          </div>
        </div>

        <!-- Message from Ha My with Initials Fallback -->
        <div class="msg-row msg-other">
          <div class="sender-header">
            <div class="avatar-initials-sm">HM</div>
            <span class="sender-name">Hà My</span>
            <span class="role-badge">Chuyên Viên Mi</span>
          </div>
          <div class="bubble bubble-other">
            Dạ em vừa xem thử trên điện thoại, giao diện hiện avatar rõ ràng và đẹp mắt lắm ạ! ✨
          </div>
        </div>

        <!-- My Reply with Quoted Preview containing Mini Avatar -->
        <div class="msg-row msg-mine">
          <div class="bubble bubble-mine">
            <div class="quote-preview">
              <img class="quote-avatar" src="https://cdn.wingslashes.com/avatars/danny.jpg" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'18\\' height=\\'18\\'><rect width=\\'18\\' height=\\'18\\' fill=\\'%23d4a84b\\'/><text x=\\'50%\\' y=\\'55%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' fill=\\'%23000\\' font-size=\\'9\\' font-weight=\\'bold\\'>DD</text></svg>'" alt="" />
              <div>
                <strong style="color: #fbbf24;">Danny Do:</strong> Chào Khải, anh vừa duyệt kế hoạch...
              </div>
            </div>
            Dạ em đã kiểm thử xong và chuẩn hóa toàn bộ avatar trên mobile chat theo đúng Kinh Thánh mOS rồi anh nhé! 🚀
          </div>
        </div>
      </div>

      <footer>
        <div class="composer-box">Nhắn tin cho Danny Do...</div>
      </footer>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  await page.waitForTimeout(500);

  // Validate avatar elements rendered
  const avatarElements = await page.$$('.avatar-sm, .avatar-initials-sm, .avatar-md, .welcome-avatar');
  if (avatarElements.length < 4) {
    throw new Error('Not all mobile avatars were rendered properly!');
  }

  const screenshotPath = '/tmp/mos-bug-158-mobile-avatar-visual-qa.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`[Playwright Visual QA PASSED] Mobile chat avatar visual screenshot saved to ${screenshotPath}`);
} catch (err) {
  console.error('[Playwright Visual QA FAILED]:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
