-- The Academy Tố Chất picker needs real catalogue data instead of browser
-- constants.  Courses are grouped by learner market and carry optional
-- package pricing that is snapshotted by the assessment invoice.
ALTER TABLE `crm_academy_courses`
  ADD COLUMN `market` VARCHAR(20) NOT NULL DEFAULT 'DOMESTIC' AFTER `description`,
  ADD COLUMN `cover_image_url` TEXT NULL AFTER `market`,
  ADD COLUMN `kit_price_vnd` INTEGER NOT NULL DEFAULT 0 AFTER `kit_url`,
  ADD COLUMN `sample_price_vnd` INTEGER NOT NULL DEFAULT 0 AFTER `kit_price_vnd`;

ALTER TABLE `crm_academy_talent_assessments`
  ADD COLUMN `selected_sample_course_ids` LONGTEXT NULL AFTER `selected_course_ids`,
  ADD COLUMN `selected_kit_course_ids` LONGTEXT NULL AFTER `selected_sample_course_ids`;

-- Idempotent course catalogue. Existing domestic records are enriched, never
-- duplicated; the four overseas paths are materialised so the second native
-- market tab also has real records to select and quote.
INSERT INTO `crm_academy_courses` (
  `code`, `name`, `name_en`, `tag`, `description`, `market`, `list_price_vnd`, `promo_price_vnd`,
  `kit_name`, `kit_price_vnd`, `sample_price_vnd`, `lesson_count`, `lash_model_count`, `sort_order`, `is_active`, `updated_at`
) VALUES
  ('combo', 'Combo 4 Khóa Nối Mi Bóng Tối Chuyên Nghiệp', 'Full Professional Combo', 'COMBO PRO', 'Học cốt MI ID chuẩn chỉnh quỹ · Tiết kiệm nhất · Bảo hành nghề tại Việt Nam & quốc tế.', 'DOMESTIC', 34600000, 19900000, 'Đồ nghề: MS92 Cốp VIP – Dụng cụ hành nghề', 13550000, 4800000, 32, 31, 1, 1, CURRENT_TIMESTAMP(0)),
  ('basic', 'Nền Tảng Nối Mi Bóng Tối Độc Quyền', 'Foundation Dark Lash', 'NỀN TẢNG', 'Phù hợp người mới · MI ID Classic & Ivy Light · Cam kết bảo hành nghề.', 'DOMESTIC', 5900000, 1900000, 'Đồ nghề: MS90 Cốp Basic – Người mới bắt đầu', 4450000, 900000, 6, 5, 2, 1, CURRENT_TIMESTAMP(0)),
  ('advanced', 'Tinh Hoa Nối Mi Bóng Tối Nâng Cao', 'Elite Artistry', 'TINH HOA', 'Kỹ thuật Wispy, Sexy Wings, Baby Doll · Nâng cấp tay nghề chuyên sâu.', 'DOMESTIC', 12900000, 9900000, 'Đồ nghề: Nhíp Elite và 6 khay mi', 9900000, 900000, 6, 6, 3, 1, CURRENT_TIMESTAMP(0)),
  ('fan', 'Nối Mi Volume & Mega Chuẩn Quốc Tế', 'Volume & Mega Volume', 'VOLUME', 'Kỹ thuật tạo fan tay · Volume 2D–5D · Mega Lash · Chuẩn quốc tế.', 'DOMESTIC', 20900000, 9900000, 'Đồ nghề: Nhíp Volume và 6 khay mi', 9900000, 1500000, 10, 10, 4, 1, CURRENT_TIMESTAMP(0)),
  ('design', 'Thiết Kế & Tạo Dáng Mi Nghệ Thuật', 'Lash Design & Styling', 'DESIGN', 'Phân tích dáng mắt · Thiết kế form mi · Sáng tạo phong mi nghệ thuật.', 'DOMESTIC', 20900000, 9900000, 'Đồ nghề: Thước mi và 4 khay mi', 9900000, 1500000, 10, 10, 5, 1, CURRENT_TIMESTAMP(0)),
  ('overseas_bootcamp', 'Fast-track Bootcamp 3-in-1', 'Fast-track Bootcamp 3-in-1', 'FAST-TRACK', 'Lộ trình tăng tốc cho học viên Việt kiều và định cư.', 'OVERSEAS', 24900000, 19900000, 'Đồ nghề: MS92 Cốp VIP – Dụng cụ hành nghề', 13550000, 4650000, 31, 31, 11, 1, CURRENT_TIMESTAMP(0)),
  ('overseas_styling', 'Western Styling & Speed Volume', 'Western Styling & Speed Volume', 'WESTERN', 'Thiết kế phong cách phương Tây và kỹ thuật Volume tốc độ.', 'OVERSEAS', 18900000, 14900000, 'Đồ nghề: Nhíp Volume và 6 khay mi', 9900000, 1500000, 10, 10, 12, 1, CURRENT_TIMESTAMP(0)),
  ('overseas_business', 'VIP Business & Global Licensing', 'VIP Business & Global Licensing', 'VIP BUSINESS', 'Nghề, vận hành và giấy phép cho thị trường quốc tế.', 'OVERSEAS', 29900000, 24900000, 'Đồ nghề: MS92 Cốp VIP – Dụng cụ hành nghề', 13550000, 4650000, 31, 31, 13, 1, CURRENT_TIMESTAMP(0)),
  ('overseas_crash', 'Crash Course Nối Mi 5 Ngày', '5-day Lash Crash Course', 'CRASH COURSE', 'Khoá tăng tốc nối mi 5 ngày cho người cần bắt đầu nhanh.', 'OVERSEAS', 24900000, 19900000, 'Đồ nghề: MS90 Cốp Basic – Người mới bắt đầu', 4450000, 1500000, 10, 5, 14, 1, CURRENT_TIMESTAMP(0))
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `name_en` = VALUES(`name_en`),
  `tag` = VALUES(`tag`),
  `description` = VALUES(`description`),
  `market` = VALUES(`market`),
  `list_price_vnd` = VALUES(`list_price_vnd`),
  `promo_price_vnd` = VALUES(`promo_price_vnd`),
  `kit_name` = VALUES(`kit_name`),
  `kit_price_vnd` = VALUES(`kit_price_vnd`),
  `sample_price_vnd` = VALUES(`sample_price_vnd`),
  `lesson_count` = VALUES(`lesson_count`),
  `lash_model_count` = VALUES(`lash_model_count`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = VALUES(`is_active`);
