import type { MosBibleCommandment } from '../../types/mos-bible.js';

export const MOS_BIBLE_FM_AND_MANAGEMENT_COMMANDMENTS: readonly MosBibleCommandment[] = [
  {
    id: 'FM-001',
    book: 'REWARDS',
    status: 'ACTIVE',
    version: '1.0.0',
    effectiveFrom: '2026-11-26',
    title: 'Cơ Chế Floor Manager (FM 1–2–3) · Nông Trại Sàn, 4 Trụ Sao & Chế Tài Sâu',
    summary:
      'Floor Manager vận hành theo mô hình Nông Trại Vui Vẻ với 3 bậc lương cứng (FM 1: 8M · FM 2: 9M · FM 3: 10M / 26 công), Quỹ DT bậc thang 1%/2%/2.2% chia 60/40, 4 trụ sao 1★–3★ (tối đa +3.50M), Google Maps chỉ tính 5★ & trần ≤ 1 sâu/tháng, FAL tối đa 0.5%/1.0%/1.5%, giữ lửa 6 ca tư vấn/tuần (Tip đổ Quỹ Ăn Chơi Team) và chế độ Active Claim bấm nhận tiền vào ví.',
    rationale:
      'Gắn thu nhập quản lý sàn với 4 trụ vận hành đo lường minh bạch (Maps 5★, Kho, CSVC/Son, Tua/FAL), loại bỏ cảnh tranh khách hoa hồng với CVLL, tạo lộ trình thăng cấp FM 1 ➔ FM 2 ➔ FM 3 nối thẳng CHO (11M) và khuyến khích FM chủ động săn lỗi ≤ 24h thay vì giấu lỗi.',
    routeScopes: ['/dashboard/career-path', '/dashboard/fm', '/dashboard/cv'],
    commandments: [
      '3 Bậc Lương Cứng FM 1–2–3 & Công Ngày + Active Claim: FM 1 nhận 8.000.000đ, FM 2 nhận 9.000.000đ (≥ 8/12★ liên tiếp 3 tháng, FAL ≤ 1.0%, HI Tua ≥ 80%, 0 tháng vỡ ≥ 2 tuần), FM 3 nhận 10.000.000đ (≥ 10/12★ liên tiếp 3 tháng, FAL ≤ 0.5%, HI Tua ≥ 90%, kèm ≥ 1 CVLL hoặc FM 1) trên chuẩn 26 công/tháng. Rớt chuẩn 2 tháng liên tiếp lùi 1 bậc; vi phạm trung thực rút quyền FM ngay. Bấm nhận công & nhận thưởng kiểu Active Claim tiền mới nổ vào Ví (quên bấm công ngày cuối tháng vẫn auto trả đủ 100% theo luật lao động); Tưới hộ đồng đội nghỉ thưởng +400.000đ/ca.',
      'Biên Chế Sàn, Công Suất & Chia Quỹ DT 60/40: Định mức 1 FM / 8 CV-CVL; khi vượt quá tỷ lệ 1.5× (> 12 CV, từ ≥ 13 CV) mới được phép và bắt buộc tuyển FM #2. Chuẩn công suất ≥ 2/3 số giường (40M & 100 khách/CV). Quỹ DT bậc thang mềm: dưới 2/3 giường = 1.0% DT · đạt ≥ 2/3 giường = 2.0% DT · vượt ≥ 80% giường = 2.2% DT. Khi chi nhánh có ≥ 2 FM: 60% Quỹ DT chia chung toàn đội theo ngày công & độ xanh vườn, 40% theo doanh thu nhóm phụ trách kèm điều phối Tua FIFO trên mOS.',
      'Trụ 1 · Google Maps (Chỉ tính 5★ · 4★ = 0đ · 1–3★ = Sâu · Trần ≤ 1 Sâu/Tháng): 1★ = 3 quả 5★/CV (+400.000đ); 2★ = 4 quả 5★/CV + SLA ≤ 24h (+800.000đ); 3★ = ≥ 5 quả 5★/CV + 0 sâu (+1.200.000đ). Trần sâu: 0 sâu mở 3★; 1 sâu tối đa 2★; 2 sâu tụt trần tối đa 1★ & khóa Vòng Quay; ≥ 3 sâu khóa thẳng 0★ (0đ). Hỗ trợ miễn trừ review ảo (Verified Customer Only) và cơ chế Sâu Hóa Bướm (khách tự sửa lên 5★ xóa khỏi bộ đếm sâu).',
      'Trụ 2 & 3 · Kho Vật Tư + CSVC/Giường 3 Sạch/Son: Kho 1★ (hao hụt ≤ 3%) = +300.000đ · 2★ (≤ 2%) = +600.000đ · 3★ (≤ 1% & 0 đứt hàng) = +750.000đ. CSVC & Phong thái 1★ (≥ 90đ) = +300.000đ · 2★ (≥ 95đ & 0 lỗi son) = +600.000đ · 3★ (≥ 98đ & 0 lỗi QA) = +750.000đ.',
      'Trụ 4 · Tua, Giờ Công, FAL & Tư Vấn: Mức FAL 0.5% / 1.0% / 1.5% là ngưỡng trần (trên 1.5% = 0★). 1★ (FAL ≤ 1.5%, HI ≥ 75%) = +300.000đ · 2★ (FAL ≤ 1.0%, HI ≥ 85%) = +600.000đ · 3★ (FAL ≤ 0.5%, HI ≥ 92%) = +800.000đ.',
      'Cổng Kiểm Định 100% FAL & Giữ Lửa Nghề Tư Vấn (Tip ➔ Quỹ Ăn Chơi Team): 100% ca FAL (Fix · Adjust · Log) đi qua cổng FM xác minh trong 24h (cấm tự duyệt Adjust của chính FM). FM thực hiện tối thiểu 6 ca tư vấn thường/tuần (tối thiểu 2 ca Khách Mới), duy trì Combo ≥ 25% (xuất sắc ≥ 30%). FM không nhận hoa hồng Combo/SP cá nhân; toàn bộ 20% Tip tư vấn của FM chảy về Quỹ Ăn Chơi Nhóm/Chi Nhánh.',
      'Bậc Thang Phạt Sâu Xử Lý Trễ: Xử lý dứt điểm ≤ 24h = 0đ phạt. Trễ 24–48h: sâu Google Maps 1–3★ trừ -200.000đ/con, sâu FAL nội bộ trừ -100.000đ/con. Trễ > 48h: sâu Maps gây Vỡ Rương tuần (-25% Quỹ Sao) + khóa Vòng Quay; sâu FAL nội bộ trừ -300.000đ/con + khóa Vòng Quay. Tiền phạt chỉ trừ trong Quỹ Sao/Thưởng, tuyệt đối không trừ lương cứng.',
      'Lõi Game Nông Trại Vui Vẻ & Vòng Quay 4 Tuần Xanh: Hoàn thành 4 khung giờ chuẩn mỗi ngày nhận +110.000đ/ngày, giữ Thanh Khiên ≥ 80 HP (mất -10 HP/việc sót) để bảo toàn Rương tuần; QA/CHO kiểm đột xuất chống tưới khống. Đủ 4/4 Tuần Xanh + ≥ 8/12★ mở Vòng Quay Thần Tài (+500.000đ đến +1.500.000đ).',
      'Đặc Quyền Nghỉ Lễ Tự Lái (Thay thế CC): Mở khóa khi chi nhánh đạt tỷ lệ ≥ 50% CVL/CVLL, có ≥ 1 CVLL cầm chìa khóa trực lễ và FM hoàn tất 5 bước bàn giao T-1 (quân số, kho đệm 150%, CSVC/POS 100%, khóa tua Booker, Hotline/Maps từ xa). FM nghỉ lễ hưởng trọn 100% gói tháng.',
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
