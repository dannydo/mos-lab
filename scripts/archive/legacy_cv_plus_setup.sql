-- ==============================================================================
-- WINGS LEGACY & iOS APP COMPATIBILITY SCRIPT: CẤU HÌNH NHÓM CV+ (CHUYÊN VIÊN TỰ CHỦ)
-- ==============================================================================
-- Mục đích:
-- 1. Đăng ký nhóm người dùng mới `Group 15: cv_plus` trên database `management`.
-- 2. Đảm bảo nhân sự được nâng cấp lên CV+ giữ nguyên toàn bộ quyền hạn kỹ thuật của CV,
--    đồng thời mở rộng quyền tự check-in / check-out / tạo booking kiêm nhiệm trên iOS App.
-- ==============================================================================

-- 1. Tạo User Group mới trên MySQL Legacy (nếu chưa có)
INSERT INTO user_group (id, group_key, is_admin, is_disabled, date_created)
VALUES (15, 'cv_plus', 0, 0, NOW())
ON DUPLICATE KEY UPDATE group_key = 'cv_plus', is_disabled = 0;

-- 2. Tên hiển thị chuẩn tôn trọng Chuyên Viên
INSERT INTO user_group_language (user_group_id, language_id, user_group_name)
VALUES (15, 1, 'Chuyên Viên Tự Chủ (CV+)')
ON DUPLICATE KEY UPDATE user_group_name = 'Chuyên Viên Tự Chủ (CV+)';

-- 3. Hướng dẫn cấu hình permissions.json trên Legacy Wings API:
-- Thêm block quyền hạn cho nhóm "cv_plus" trong permissions.json:
-- {
--   "cv_plus": {
--     "order": ["view", "create", "edit", "check_in", "check_out"],
--     "booking": ["view", "create", "edit"],
--     "customer": ["view", "create", "edit"],
--     "service": ["view"],
--     "product": ["view"],
--     "report": ["view_own"]
--   }
-- }

-- 4. Truy vấn đối soát danh sách CV+ hiện tại
SELECT 
  u.id, 
  up.full_name, 
  u.mobile, 
  ugl.user_group_name, 
  up.client_store_id
FROM user u
JOIN user_profile up ON up.user_id = u.id
JOIN user_group_language ugl ON ugl.user_group_id = u.user_group_id AND ugl.language_id = 1
WHERE u.user_group_id IN (15) OR ugl.user_group_name LIKE '%CV+%'
ORDER BY up.client_store_id ASC, up.full_name ASC;
