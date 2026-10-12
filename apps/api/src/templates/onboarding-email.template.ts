export interface OnboardingEmailData {
  displayName: string;
  email: string;
  roleName?: string;
  loginUrl?: string;
}

export function generateOnboardingEmailHtml(data: OnboardingEmailData): string {
  const loginUrl = data.loginUrl || 'https://lab.masteros.app/login';
  const roleDisplay = data.roleName || 'Nhân viên';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hướng dẫn đăng nhập hệ thống mOS - Wings Lashes</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0b0f19; width: 100%;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 36px 24px 20px 24px; background: linear-gradient(180deg, rgba(212, 168, 75, 0.15) 0%, rgba(17, 24, 39, 0) 100%);">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="width: 56px; height: 56px; background: linear-gradient(135deg, #e6b85c 0%, #b88628 100%); border-radius: 16px; font-size: 26px; font-weight: bold; color: #0b0f19; line-height: 56px; box-shadow: 0 8px 24px rgba(212, 168, 75, 0.35);">
                    W
                  </td>
                </tr>
              </table>
              <h1 style="margin: 16px 0 4px 0; color: #f8fafc; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">WINGS LASHES</h1>
              <p style="margin: 0; color: #d4a84b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">Hệ Thống Điều Hành mOS Living Lab</p>
            </td>
          </tr>

          <!-- Welcome Banner -->
          <tr>
            <td style="padding: 12px 32px 24px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 26px; color: #f1f5f9;">
                Chào bạn <strong>${data.displayName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 24px; color: #94a3b8;">
                Chào mừng bạn gia nhập hệ thống điều hành công việc <strong>mOS (Master Operating System)</strong> của Wings Lashes. Tài khoản của bạn đã được thiết lập sẵn sàng với vai trò <strong>${roleDisplay}</strong>.
              </p>

              <!-- Main Steps Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1a2234; border: 1px solid #2d3748; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 24px 20px;">
                    <div style="font-size: 14px; font-weight: 700; color: #d4a84b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                      ✨ 3 Bước Đăng Nhập Nhanh Bằng Google (1-Chạm)
                    </div>

                    <!-- Step 1 -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 14px;">
                      <tr>
                        <td valign="top" style="width: 28px;">
                          <div style="width: 22px; height: 22px; border-radius: 50%; background-color: #d4a84b; color: #0b0f19; font-size: 12px; font-weight: bold; text-align: center; line-height: 22px;">1</div>
                        </td>
                        <td style="padding-left: 8px;">
                          <div style="font-size: 14px; font-weight: 600; color: #f8fafc; margin-bottom: 2px;">Nhấn nút truy cập mOS</div>
                          <div style="font-size: 13px; color: #94a3b8; line-height: 20px;">Mở trang đăng nhập hệ thống tại liên kết bên dưới.</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Step 2 -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 14px;">
                      <tr>
                        <td valign="top" style="width: 28px;">
                          <div style="width: 22px; height: 22px; border-radius: 50%; background-color: #d4a84b; color: #0b0f19; font-size: 12px; font-weight: bold; text-align: center; line-height: 22px;">2</div>
                        </td>
                        <td style="padding-left: 8px;">
                          <div style="font-size: 14px; font-weight: 600; color: #f8fafc; margin-bottom: 2px;">Chọn "Đăng nhập bằng Google"</div>
                          <div style="font-size: 13px; color: #94a3b8; line-height: 20px;">Nhấn vào nút <strong>Google Sign-In</strong> trên màn hình, không cần nhập mật khẩu riêng.</div>
                        </td>
                      </tr>
                    </table>

                    <!-- Step 3 -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="top" style="width: 28px;">
                          <div style="width: 22px; height: 22px; border-radius: 50%; background-color: #d4a84b; color: #0b0f19; font-size: 12px; font-weight: bold; text-align: center; line-height: 22px;">3</div>
                        </td>
                        <td style="padding-left: 8px;">
                          <div style="font-size: 14px; font-weight: 600; color: #f8fafc; margin-bottom: 2px;">Chọn đúng tài khoản Google được cấp</div>
                          <div style="font-size: 13px; color: #94a3b8; line-height: 20px;">
                            Đăng nhập bằng địa chỉ email:
                            <div style="margin-top: 6px; padding: 6px 12px; background-color: #0b0f19; border: 1px dashed #d4a84b; border-radius: 6px; color: #e6b85c; font-weight: 600; font-family: monospace; display: inline-block;">
                              ${data.email}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #e6b85c 0%, #b88628 100%); color: #0b0f19; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; box-shadow: 0 6px 20px rgba(212, 168, 75, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                      🚀 Đăng Nhập Vào mOS Ngay
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Pro Tip Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #131d2e; border-left: 4px solid #38bdf8; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <div style="font-size: 13px; color: #e2e8f0; line-height: 20px;">
                      <strong style="color: #38bdf8;">📱 Mẹo cài đặt nhanh trên điện thoại:</strong> Sau khi mở link trên trình duyệt Safari (iPhone) hoặc Chrome (Android), bạn chọn <em>"Chia sẻ"</em> &rarr; <em>"Thêm vào Màn hình chính (Add to Home Screen)"</em> để sử dụng mOS mượt mà như một ứng dụng độc lập.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Support Note -->
              <p style="margin: 0; font-size: 13px; line-height: 22px; color: #64748b; text-align: center;">
                Nếu bạn cần hỗ trợ kỹ thuật hoặc cần thay đổi email liên kết, vui lòng thông báo cho Bộ phận Quản lý hoặc Nhân sự Wings Lashes để được trợ giúp.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0b0f19; border-top: 1px solid #1f2937; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #94a3b8; font-weight: 500;">
                © 2026 Wings Lashes Living Lab. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Đây là email tự động gửi từ hệ thống mOS. Vui lòng không trả lời thư này.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
