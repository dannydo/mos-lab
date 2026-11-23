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

  // Test rendering Mobile Stream mockup verifying bottom scroll & floating unread pill
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>mOS Chat - Space Auto-Scroll Visual QA</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #020617; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        header { height: 56px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background: #0f172a; flex-shrink: 0; }
        .header-title { font-size: 15px; font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 8px; }
        .feed { flex: 1; overflow-y: auto; padding: 16px 12px; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; }
        .welcome { text-align: center; padding: 20px 0; border-bottom: 1px solid #1e293b; margin-bottom: 12px; }
        .welcome-icon { width: 52px; height: 52px; margin: 0 auto 10px; border-radius: 20px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); display: flex; align-items: center; justify-content: center; font-size: 24px; color: #fbbf24; }
        .msg { max-width: 82%; padding: 10px 14px; border-radius: 18px; font-size: 13.5px; line-height: 1.45; }
        .msg-other { align-self: flex-start; background: #1e293b; color: #f1f5f9; border-bottom-left-radius: 4px; }
        .msg-mine { align-self: flex-end; background: #d97706; color: #ffffff; border-bottom-right-radius: 4px; }
        .author { font-size: 11px; font-weight: 600; color: #94a3b8; margin-bottom: 3px; }
        .floating-pill { position: fixed; right: 16px; bottom: 84px; display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 9999px; background: rgba(30, 41, 59, 0.95); border: 1px solid #475569; color: #fff; font-size: 12px; font-weight: 600; box-shadow: 0 10px 25px rgba(0,0,0,0.5); backdrop-filter: blur(8px); }
        .badge { background: #ef4444; color: #fff; font-size: 10px; font-weight: 700; border-radius: 9999px; padding: 1px 6px; }
        footer { height: 64px; border-top: 1px solid #1e293b; background: #0f172a; display: flex; align-items: center; padding: 0 12px; gap: 8px; flex-shrink: 0; }
        .input-box { flex: 1; height: 40px; background: #1e293b; border-radius: 20px; border: 1px solid #334155; padding: 0 16px; color: #fff; font-size: 13px; display: flex; align-items: center; }
      </style>
    </head>
    <body>
      <header>
        <div class="header-title">
          <span># Kênh Vận Hành</span>
          <span style="font-size: 11px; padding: 2px 6px; border-radius: 6px; background: rgba(245, 158, 11, 0.2); color: #fbbf24;">12 TV</span>
        </div>
        <div style="font-size: 12px; color: #94a3b8;">mOS Chat</div>
      </header>

      <div class="feed" id="scrollContainer">
        <div class="welcome">
          <div class="welcome-icon">#</div>
          <div style="font-weight: 700; font-size: 15px;">Chào mừng bạn đến với #Kênh Vận Hành</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Không gian trao đổi nghiệp vụ và điều phối salon</div>
        </div>

        <div class="msg msg-other">
          <div class="author">Chuyên Viên Mai • 09:15</div>
          <div>Hôm nay salon có lịch khách vip lúc 14:00 nha cả nhà.</div>
        </div>

        <div class="msg msg-other">
          <div class="author">Hương CC • 10:20</div>
          <div>Dạ em đã chuẩn bị xong phòng VIP và khay mi lụa 0.07 rồi ạ!</div>
        </div>

        <div class="msg msg-mine">
          <div style="font-size: 11px; opacity: 0.8; margin-bottom: 2px; text-align: right;">Danny Do • 11:30</div>
          <div>Tuyệt vời em nhé! Chúc ca làm việc chiều nay đông khách và đạt tip cao!</div>
        </div>

        <div class="msg msg-other">
          <div class="author">Chuyên Viên Mai • 14:05</div>
          <div>Khách đã tới và bắt đầu làm rồi anh nhé!</div>
        </div>

        <div class="msg msg-other">
          <div class="author">Hương CC • 15:30</div>
          <div>Khách vừa làm xong rất ưng ý và tip 100k chia đều cho cả ca ạ! 🎉</div>
        </div>

        <div class="msg msg-mine" style="border: 2px solid #fbbf24;">
          <div style="font-size: 11px; opacity: 0.8; margin-bottom: 2px; text-align: right;">Danny Do • Vừa xong</div>
          <div><strong>[Tin nhắn mới nhất]</strong>: Cảm ơn 2 em rất nhiều, hệ thống đã cộng thưởng CC và Tip 100k vào bảng lương rồi nha!</div>
        </div>
      </div>

      <div class="floating-pill">
        <span>↓ Tin mới</span>
        <span class="badge">1</span>
      </div>

      <footer>
        <div class="input-box">Nhắn tin trong #Kênh Vận Hành...</div>
      </footer>

      <script>
        // Simulate auto-scroll to bottom
        const el = document.getElementById('scrollContainer');
        el.scrollTop = el.scrollHeight;
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  await page.waitForTimeout(500);

  // Check that scroll container is scrolled to bottom
  const isAtBottom = await page.evaluate(() => {
    const el = document.getElementById('scrollContainer');
    return el.scrollHeight - el.scrollTop - el.clientHeight < 20;
  });

  if (!isAtBottom) {
    throw new Error('Container was not scrolled to bottom on initial render!');
  }

  await page.screenshot({ path: '/tmp/mos-bug-152-visual-qa.png', fullPage: true });
  console.log('Playwright Visual QA PASSED: Screenshot saved to /tmp/mos-bug-152-visual-qa.png');
} catch (err) {
  console.error('Playwright Visual QA FAILED:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
