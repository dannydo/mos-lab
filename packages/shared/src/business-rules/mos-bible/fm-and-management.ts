import type { MosBibleCommandment } from '../../types/mos-bible.js';

export const MOS_BIBLE_FM_AND_MANAGEMENT_COMMANDMENTS: readonly MosBibleCommandment[] = [
  {
    id: 'FM-001',
    book: 'REWARDS',
    status: 'ACTIVE',
    version: '2.4.0',
    effectiveFrom: '2026-11-27',
    title: 'Cơ Chế Floor Manager (FM 1–2–3) · Mô Hình Tăng Trưởng Kép 8★, Quỹ Shop & Weekly Quest',
    summary:
      'Floor Manager vận hành theo Mô Hình Tăng Trưởng Kép 8 Trụ Cột Sao (24★, tối đa 5.05M) xóa bỏ vực thẳm 12→13 CV: tỷ lệ % DT mỗi FM tăng mượt theo độ lấp giường (1.00%→1.40%/FM) × hiệu suất REV/CV ÷ 48M (0.70×→1.15×), cổng kép tách 2 FM (≥13 CV chính thức & ≥650M), miễn mẫu số 45 ngày (1.5 tháng) cho CV mới, Thưởng Nóng Đẻ Quân (+500K/+1M/+2M/+3M), Trụ #8 Tiệc Tháng (70/80/90% + check-in MXH) và Weekly Quest co giãn theo quy mô shop.',
    rationale:
      'Đảm bảo khi nhận thêm CV mới hoặc mở rộng lên 13–18 CV, thu nhập FM và P&L shop luôn đồng thời tăng trưởng; tạo động lực phát triển CVL, CVLL, FM #2 và giữ văn hóa gắn kết qua Quỹ Shop & Weekly Quest.',
    routeScopes: [
      '/dashboard/career-path',
      '/dashboard/fm-simulator',
      '/dashboard/pnl-simulator',
      '/dashboard/funds',
      '/dashboard/cv',
    ],
    commandments: [
      '3 Bậc Lương Cứng FM 1–2–3 & Công Ngày + Active Claim: FM 1 nhận 8.000.000đ, FM 2 nhận 9.000.000đ (≥ 14/24★ liên tiếp 3 tháng, FAL ≤ 1.0%, HI Tua ≥ 80%, 0 tháng mất ≥ 2 khiên), FM 3 nhận 10.000.000đ (≥ 18/24★ liên tiếp 3 tháng, FAL ≤ 0.5%, HI Tua ≥ 90%, kèm ≥ 1 CVLL hoặc FM 1) trên chuẩn 26 công/tháng. Rớt chuẩn 2 tháng liên tiếp lùi 1 bậc; vi phạm trung thực rút quyền FM ngay. Tưới hộ đồng đội nghỉ thưởng +400.000đ/ca.',
      'Quỹ % DT Tăng Trưởng Kép & Cổng Kép Tách 2 FM (Xóa Vực Thẳm 12→13 CV): Tỷ lệ % DT của mỗi FM tính mượt theo độ lấp giường từ 50%→100% (1.00% → 1.40% × DT) nhân hệ số hiệu suất clamp(REV/CV ÷ 48M, 0.70×, 1.15×) (sàn 0.70× tại ≤33.6M · chuẩn 1.00× tại 48M · trần 1.15× tại ≥55.2M), cộng cổng giường tối thiểu ≥50% (ĐT ≥ 9 CV · EP ≥ 6 CV). Chỉ kích hoạt tách 2 FM khi đạt đồng thời ≥ 13 CV chính thức VÀ doanh thu ≥ 650M/tháng — mỗi FM nhận phần tỷ lệ riêng theo độ lấp giường nên thu nhập FM và P&L shop luôn cùng tăng từ 9 đến 18 CV.',
      'Miễn Mẫu Số 45 Ngày (Tối Đa 2 Kỳ Lương) Cho CV Mới & Thưởng Nóng Đẻ Quân (+500K / +1M / +2M / +3M): CV mới có thâm niên ≤ 45 ngày tính tới cuối kỳ lương (tối đa 2 kỳ lương, tuyệt đối không tràn kỳ thứ 3) được cộng 100% doanh thu vào tử số Quỹ DT nhưng miễn tính vào mẫu số REV/CV và miễn tăng mốc Maps/Undermink. Thưởng nóng 1 lần cho FM khi: CV mới qua thử việc 60 ngày (≥30M) = +500.000đ · CV thăng hạng CVL = +1.000.000đ · CVL thăng hạng CVLL (không giới hạn số lượng) = +2.000.000đ · Đào tạo CVLL lên FM #2 = +3.000.000đ.',
      'Trụ 1 · Google Maps (Chỉ tính 5★ · 4★ = 0đ · 1–3★ = Sâu · Trần ≤ 1 Sâu/Tháng): 1★ = 2% (2 rv/CV chính thức, +400.000đ); 2★ = 3% (3 rv/CV, +800.000đ); 3★ = 4% (4 rv/CV & 0 sâu, +1.200.000đ). Hỗ trợ Sâu Hóa Bướm (khách tự sửa lên 5★ xóa khỏi bộ đếm sâu).',
      'Trụ 2 & 3 · Kho Vật Tư + CSVC/Giường 3 Sạch/Son/Mi nối: Kho 1★ (hao hụt ≤ 3%) = +150.000đ · 2★ (≤ 2%) = +300.000đ · 3★ (≤ 1% & 0 đứt hàng) = +450.000đ. Phòng 5 Giác Quan & Phong thái (đồng phục, mi nối, son, tóc gọn) đều 1★ = +150.000đ · 2★ = +300.000đ · 3★ = +450.000đ.',
      'Trụ 4 · Tua, Giờ Công, FAL & Tư Vấn: FAL 1★ (≤ 1.5%) = +350.000đ · 2★ (≤ 1.0%) = +700.000đ · 3★ (≤ 0.5%) = +1.000.000đ; Đội ngũ Tự Lái trần 60% & CEO/HR ≥ 3 buổi/tuần = +200.000đ / +400.000đ / +600.000đ; Tua/HI & 6 Ca TV = +150.000đ / +300.000đ / +450.000đ.',
      'Trụ #8 · Gắn Kết & Tiệc Tháng (70/80/90% + Ảnh Check-in MXH · +150K / +300K / +450K): Mỗi tháng FM bắt buộc tổ chức cho thành viên trong shop đi ăn tối thiểu 1 lần, chi trực tiếp từ Quỹ Shop và xác nhận bằng ảnh check-in đăng mạng xã hội. Đạt ≥ 70% quân số = 1★ (+150.000đ) · ≥ 80% = 2★ (+300.000đ) · ≥ 90% = 3★ (+450.000đ). Không tổ chức tiệc nào trong tháng hoặc thiếu ảnh check-in MXH = 0★ Trụ #8 và mất 1 Khiên Tuần (-25% Quỹ Sao). Đi ăn nhưng < 70% tham gia chỉ 0★ (không mất thêm Khiên).',
      'Quỹ Shop Cộng Dồn & Weekly Quest Co Giãn Theo Quy Mô (HR & CEO Chỉnh): Quỹ Shop tại Quỹ Hoạt Động Nội Bộ (/dashboard/funds) được nạp từ Fun Fund (80.000đ/ca tư vấn FM) cộng 100% tiền thưởng Weekly Quest hoàn thành trong tháng và tự động cộng dồn số dư (rollover). Bộ 3 Quest mặc định (mặc định 400.000đ/quest): (1) ≥ 85% CV đi làm trong tuần nối ≥ 2 bộ Undermink; (2) 100% nhân viên tặng chuối (0 ca đi trễ); (3) Trần FAL ≤ 1F·1A·1L (nới ≤ 2F·1A·1L khi shop ≥ 13 CV hoạt động) — HR & CEO được phép thêm/sửa/bật/tắt quest bất kỳ lúc nào.',
      'Bậc Thang Phạt Sâu, 4 Khiên Tuần & Đặc Quyền Nghỉ Lễ Tự Lái: Xử lý dứt điểm ≤ 24h = 0đ phạt; trễ 24–48h trừ -200.000đ/lần vào Quỹ Sao; mỗi Khiên Tuần mất trừ -25% Quỹ Sao (tối đa 4 Khiên/tháng), tuyệt đối không trừ lương cứng. Đạt ≥ 2★ Tự lái & họp CEO/HR ≥ 3 buổi/tuần mở khóa Tự Lái Lễ Tết hưởng trọn gói tháng.',
    ],
    tags: [
      'fm',
      'floor-manager',
      'nong-trai-san',
      'google-maps',
      'fal',
      'sao',
      'sau',
      'nghi-le',
      'tuoi-ho',
      'active-claim',
    ],
    sources: [
      {
        label: 'FM Floor Farm Defaults',
        reference: 'packages/shared/src/types/career-progression/career-defaults.ts',
      },
      {
        label: 'Live Bible Hydrator (FM-001)',
        reference: 'packages/shared/src/business-rules/mos-bible/hydrate-career-commandments.ts',
      },
      {
        label: 'Admin FM Live Config UI',
        reference: 'apps/web/app/dashboard/career-path/components/career-config-drawer/CareerStage3FmConfigTab.tsx',
      },
    ],
  },
];
