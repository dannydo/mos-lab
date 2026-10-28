'use client';

import React, { useState, useMemo } from 'react';
import { Card, Button, Tooltip } from 'antd';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  ExternalLink,
  ShieldAlert,
  Layers,
  Eye,
  Info,
  Calendar,
  User,
  Clock,
  Filter,
  ArrowRight,
  ShieldCheck,
  Award,
  ChevronDown,
  ChevronUp,
  Search,
  Image as ImageIcon,
  HelpCircle,
  Check,
  Flame,
  Sliders,
  ChevronRight,
  Maximize2,
  FileText,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { PilotSession } from '@mos-lab/shared';
import { AppIcon } from '../../../../components/ui/AppIcon';

interface PilotCriteriaSopDetailProps {
  onBack?: () => void;
  onOpenCriteriaModal?: () => void;
  onOpenSopModal?: () => void;
  sessions?: PilotSession[];
  onOpenSessionFlow?: (session: PilotSession) => void;
}

interface SopCriterionDetail {
  id: number;
  name: string;
  order: number;
  icon: LucideIcon;
  quickBadge: {
    pass: string;
    fail: string;
  };
  purpose: string;
  inspectionMethod: string;
  inspectionTools: string[];
  passStandard: {
    title: string;
    description: string;
    indicators: string[];
  };
  failStandard: {
    title: string;
    description: string;
    indicators: string[];
  };
  pilotEvidences: {
    type: 'PASS' | 'FAIL';
    sessionId: number;
    customerName: string;
    date: string;
    detail: string;
    photoUrl?: string | null;
  }[];
  expertConfirmationNote?: string;
  ktvDeepDive: {
    title: string;
    specifications: string[];
    chemistryNote?: string;
  };
}

const SOP_CRITERIA_LIST: SopCriterionDetail[] = [
  {
    id: 1,
    name: 'Độ dài mi',
    order: 1,
    icon: Sparkles,
    quickBadge: {
      pass: '≥ 8.0mm',
      fail: '< 8.0mm',
    },
    purpose:
      'Đảm bảo sợi mi đủ chiều dài để bắt dính chắc chắn và ôm sát qua đỉnh uốn của trục silicon chuyên dụng, tránh tuột ngọn và tránh lem hóa chất vào giác mạc.',
    inspectionMethod:
      'Dùng cữ thước đo mi chuyên dụng hoặc ướm thử mi vào cạnh trục silicon size S/M tại bàn tư vấn. Sợi mi cần vượt qua điểm cong đỉnh của trục ít nhất 2mm.',
    inspectionTools: ['Cữ thước đo mi khắc vạch mm', 'Trục silicon uốn cỡ S/M', 'Que gạt định hình'],
    passStandard: {
      title: 'ĐẠT (PASS) – Chiều dài ≥ 8mm',
      description: 'Sợi mi thật có chiều dài từ 8mm đến 11mm, bám chắc và ôm trọn ít nhất 2/3 bề mặt trục silicon.',
      indicators: [
        'Chiều dài mi đo đạt từ 8mm trở lên tại tâm mắt',
        'Sợi mi vươn qua gờ đỉnh trục uốn tối thiểu 2mm',
        'Bề mặt tiếp xúc keo định hình rộng, không bị bật ngọn khi thao tác',
      ],
    },
    failStandard: {
      title: 'KHÔNG ĐẠT (FAIL) – Mi ngắn < 8mm',
      description:
        'Mi quá ngắn hoặc bị cắt tỉa, chỉ dính được phần chân mi, nguy cơ tuột sợi và thuốc uốn lem vào niêm mạc mắt.',
      indicators: [
        'Chiều dài sợi mi đo dưới 8mm',
        'Mi không với tới đỉnh cong của trục silicon nhỏ nhất (Size S/XS)',
        'Khi chải keo bị bật gốc hoặc đâm ngược vào đệm mắt',
      ],
    },
    pilotEvidences: [
      {
        type: 'FAIL',
        sessionId: 10,
        customerName: 'Khách Tâm',
        date: '05/10/2026',
        detail:
          'Mi quá ngắn không lên được trục uốn để uốn, không thể bắt ngọn vào cữ silicon. Kết luận: FAIL tiêu chí Độ dài mi.',
        photoUrl: '/api/pilot/media/ea735600-d100-4749-9db8-54405430e956.jpg',
      },
      {
        type: 'FAIL',
        sessionId: 5,
        customerName: 'Khách Phương Thảo',
        date: '26/09/2026',
        detail:
          'Mi ngắn dưới 8mm và thưa mỏng. Kết luận: FAIL tiêu chí Độ dài, chuyển hướng sang dịch vụ nối mi Hyper.',
      },
      {
        type: 'PASS',
        sessionId: 18,
        customerName: 'Khách Nguyệt',
        date: '27/10/2026',
        detail:
          'Mi khách dài 8–9mm, ôm chuẩn trục cá heo R3, thuốc số 1 ủ 15 phút, kết quả uốn cong đẹp xuất sắc.',
        photoUrl: '/api/pilot/media/1f7ce362-702c-497b-b169-50008332e018.jpg',
      },
    ],
    expertConfirmationNote:
      'Ngưỡng dung sai chiều dài tối thiểu (7.5mm vs 8.0mm) theo từng dạng mắt mí lót: Chờ Cô Giang Đàm xác nhận.',
    ktvDeepDive: {
      title: 'Thông số KTV chuyên sâu – Cỡ trục & Điểm tiếp xúc',
      specifications: [
        'Chiều dài 8.0 – 9.0mm: Chọn trục Silicon Size S hoặc M1 nếp cong nhẹ.',
        'Chiều dài 9.5 – 11.0mm: Chọn trục Silicon Size M hoặc Trục Cá Heo R3 tạo cong bật đỉnh cao.',
        'Chiều dài > 11.5mm: Chọn trục Size L để không làm ngọn mi cong quặp vào bầu mắt.',
        'Điểm đặt chân trục: Cách chân bờ mi đúng 0.5mm – 1.0mm, tuyệt đối không đè lên nang lông mi.',
      ],
      chemistryNote:
        'Vùng quét thuốc số 1 chỉ bao phủ từ 1/3 đến 1/2 thân mi tính từ gốc, cách ngọn mi tối thiểu 1.5mm để tránh cháy ngọn.',
    },
  },
  {
    id: 2,
    name: 'Độ dày sợi mi',
    order: 2,
    icon: Layers,
    quickBadge: {
      pass: '0.07 – 0.12mm',
      fail: 'Mất lõi / Xơ mủn',
    },
    purpose:
      'Đánh giá độ chịu tải cơ học và khả năng thẩm thấu hoạt chất của lớp biểu bì Keratin để căn chỉnh thời gian ủ thuốc số 1 & 2 chính xác từng phút.',
    inspectionMethod:
      'Soi dưới đèn lúp kỹ thuật hoặc kính Macro 15x để phân loại sợi mi (mảnh < 0.05mm, vừa 0.07–0.10mm, thô dày > 0.12mm) và kiểm tra độ bóng biểu bì.',
    inspectionTools: ['Kính phóng đại Macro 15x', 'Đèn rọi quang học chuyên dụng', 'Nhíp y tế kiểm tra độ nảy sợi'],
    passStandard: {
      title: 'ĐẠT (PASS) – Sợi vừa đến dày, biểu bì nguyên bản',
      description:
        'Sợi mi có lớp vảy keratin xếp đều, thân sợi chắc khỏe, chịu được phản ứng bẻ gãy liên kết disulfide một cách an toàn.',
      indicators: [
        'Đường kính sợi 0.07mm – 0.12mm có độ bóng khỏe tự nhiên',
        'Sợi mi tơ mảnh (< 0.06mm) nhưng biểu bì nguyên bản vẫn đạt nếu giảm thời gian ủ xuống 10–12 phút',
        'Nang mi bám chắc, không rụng khi gạt nhẹ bằng que định hình',
      ],
    },
    failStandard: {
      title: 'KHÔNG ĐẠT (FAIL) – Sợi teo nhỏ, mất lõi hoặc giòn mục',
      description:
        'Sợi mi quá mỏng yếu, teo tóp, xơ mủn do lạm dụng hóa chất liên tục hoặc nang lông mi bị suy thoái dinh dưỡng.',
      indicators: [
        'Sợi mi mất lõi Keratin, mềm nhũn như sợi tơ rách',
        'Thân mi bị khô khốc, chẻ ngọn hoặc gãy gập thân sợi',
        'Không có khả năng chịu đựng dung dịch kiềm uốn mi, nguy cơ sun cháy 100%',
      ],
    },
    pilotEvidences: [
      {
        type: 'PASS',
        sessionId: 11,
        customerName: 'Khách Yến Vy',
        date: '07/10/2026',
        detail:
          'Sợi mi dày khỏe, biểu bì nguyên bản chắc chắn. Cần ủ thuốc số 1 đủ 15 phút mới đạt độ mềm tiêu chuẩn. CSAT 5 sao.',
        photoUrl: '/api/pilot/media/0d7a30c5-22ec-48e2-bafe-10085da19bdb.jpg',
      },
      {
        type: 'PASS',
        sessionId: 10,
        customerName: 'Khách Tâm',
        date: '05/10/2026',
        detail:
          'Sợi mi đạt độ dày chuẩn, nhưng không đạt các tiêu chí độ dài, mật độ và tình trạng sợi mi.',
        photoUrl: '/api/pilot/media/ea735600-d100-4749-9db8-54405430e956.jpg',
      },
    ],
    expertConfirmationNote:
      'Bảng định mức thời gian ủ thuốc số 1 theo thang đo đường kính biểu bì sợi: Chờ Cô Giang Đàm xác nhận.',
    ktvDeepDive: {
      title: 'Thông số KTV chuyên sâu – Thang thời gian ủ hoạt chất',
      specifications: [
        'Mi tơ mảnh (< 0.06mm): Thời gian ủ thuốc 1 từ 10 – 12 phút (kiểm tra độ mềm sau 8 phút).',
        'Mi trung bình (0.07 – 0.09mm): Thời gian ủ thuốc 1 từ 13 – 15 phút.',
        'Mi thô cứng (> 0.10mm): Thời gian ủ thuốc 1 từ 15 – 17 phút (kết hợp ủ màng bọc giữ nhiệt).',
        'Định hình thuốc số 2: Luôn bằng 80% thời gian ủ thực tế của thuốc 1.',
      ],
      chemistryNote:
        'Phản ứng kiềm hóa chỉ được phép bẻ gãy tối đa 35–45% liên kết cầu disulfide bên trong lõi vỏ mi để giữ nguyên độ dai tự nhiên.',
    },
  },
  {
    id: 3,
    name: 'Mật độ mi',
    order: 3,
    icon: Eye,
    quickBadge: {
      pass: '≥ 60 sợi / Không hốc trống',
      fail: 'Trống rụng > 2.5mm',
    },
    purpose:
      'Bảo đảm hàng mi có độ phủ rợp bóng đồng đều khi uốn lên, không để lộ các hốc mắt trống hoặc mảng rụng mất thẩm mỹ.',
    inspectionMethod:
      'Quan sát trực diện và góc nghiêng 45 độ, đếm ước lượng số sợi mi và rà soát các khoảng trống trên toàn cung mắt.',
    inspectionTools: ['Kính bảo hộ chuyên dụng', 'Góc chiếu sáng 45 độ', 'Thước đo vi cữ cung mắt'],
    passStandard: {
      title: 'ĐẠT (PASS) – Phân bổ đều, không trống lỗ hổng lớn',
      description: 'Mật độ tương đối đồng đều (≥ 60 sợi/mắt), không có khoảng trống rụng vượt quá 2.5mm.',
      indicators: [
        'Hàng mi phân bố liên tục từ đầu mắt đến đuôi mắt',
        'Khoảng trống giữa các cụm mi không quá 2mm',
        'Gốc mi nhiều, tạo được hiệu ứng bóng đen tự nhiên sau khi phủ dưỡng collagen bóng tối',
      ],
    },
    failStandard: {
      title: 'KHÔNG ĐẠT (FAIL) – Mi thưa rỗng, trống trụi từng mảng',
      description:
        'Mi bị rụng thành từng mảng lớn do thói quen giật mi, rụng sau nối mi sai cách hoặc bệnh lý nang mi.',
      indicators: [
        'Xuất hiện mảng trống không có sợi mi dài trên 3mm',
        'Tổng số sợi mi dưới 40 sợi/mắt, mi thưa thớt',
        'Uốn lên làm lộ rõ khuyết điểm hốc mắt trống, giảm tính thẩm mỹ của gương mặt',
      ],
    },
    pilotEvidences: [
      {
        type: 'FAIL',
        sessionId: 10,
        customerName: 'Khách Tâm',
        date: '05/10/2026',
        detail:
          'Mi bị trụi trống thưa nhiều chỗ, lộ rõ các hốc trống cung mi. Kết luận: FAIL tiêu chí Mật độ mi.',
        photoUrl: '/api/pilot/media/ea735600-d100-4749-9db8-54405430e956.jpg',
      },
      {
        type: 'PASS',
        sessionId: 9,
        customerName: 'Khách Linh',
        date: '09/10/2026',
        detail:
          'Dù mi ngắn nhưng gốc khỏe và mi đủ nhiều, mật độ dày đồng đều uốn lên rất đậm nét. Khách đánh giá 5 sao.',
        photoUrl: '/api/pilot/media/85a596d9-d6ca-426c-8990-131677ddeb09.jpg',
      },
      {
        type: 'PASS',
        sessionId: 12,
        customerName: 'Khách Thảo',
        date: '10/10/2026',
        detail:
          'Mi ngắn 9mm nhưng gốc mi nhiều và khỏe, độ phủ kín cung mắt, khách rất thích hiệu ứng tự nhiên.',
        photoUrl: '/api/pilot/media/f0d1cfad-a915-4bf8-87a7-fe1cf592813e.jpg',
      },
    ],
    expertConfirmationNote:
      'Quy chuẩn kích thước khoảng trống tối đa cho phép trên cung mắt (2mm hay 3mm): Chờ Cô Giang Đàm xác nhận.',
    ktvDeepDive: {
      title: 'Thông số KTV chuyên sâu – Phân bố cung mi & Hiệu ứng bóng đen',
      specifications: [
        'Mật độ chuẩn Đề Thám: Tối thiểu 50 – 70 sợi mi trưởng thành (anagen/catagen) trên một cung mí trên.',
        'Khoảng trống cho phép: Dưới 2.0mm có thể dùng kỹ thuật vuốt đan chéo ngọn mi để che phủ nhẹ.',
        'Khoảng trống > 2.5mm: Bắt buộc từ chối uốn và tư vấn cấy mi nối sợi Hyper che phủ.',
        'Kỹ thuật nhuộm phủ đen bóng tối (Tinting): Bù trừ độ đậm thị giác đến 30% cho khách hàng mi tơ.',
      ],
    },
  },
  {
    id: 4,
    name: 'Tình trạng sợi mi',
    order: 4,
    icon: ShieldCheck,
    quickBadge: {
      pass: 'Mi nguyên bản / Khỏe mạnh',
      fail: 'Cháy sun / Viêm bờ mi',
    },
    purpose:
      'Kiểm tra sức khỏe tế bào nang mi, tiền sử can thiệp hóa chất uốn/nối và loại trừ tuyệt đối nguy cơ viêm nhiễm giác mạc bờ mi.',
    inspectionMethod:
      'Hỏi tiền sử uốn/nối mi trong 4–6 tuần gần nhất, dùng nhíp kiểm tra độ đàn hồi, kiểm tra chân mi và niêm mạc bờ mi.',
    inspectionTools: ['Bảng câu hỏi tiền sử dịch vụ', 'Đèn lúp Macro kiểm tra Demodex bờ mi', 'Que tăm bông vô trùng'],
    passStandard: {
      title: 'ĐẠT (PASS) – Mi nguyên bản hoặc phục hồi hoàn toàn',
      description:
        'Sợi mi chưa từng qua hóa chất gần đây, không có cặn keo cũ, bờ mi sạch sẽ, giác mạc trong sáng.',
      indicators: [
        'Không uốn mi trong vòng 6 tuần gần nhất',
        'Bờ mi không có cặn gàu viêm mi (Demodex), không sưng đỏ, tuyến bã nhờn thông thoáng',
        'Thân mi trơn láng, có độ đàn hồi tốt khi kéo căng nhẹ, không bị giòn gãy',
      ],
    },
    failStandard: {
      title: 'KHÔNG ĐẠT (FAIL) – Mi cháy ngọn, biến dạng hoặc bờ mi kích ứng',
      description:
        'Mi bị sun xoăn tít do hóa chất trước đó, nang lông mi yếu dễ rụng hoặc mắt đang có dấu hiệu viêm mí.',
      indicators: [
        'Đầu sợi mi bị sun cháy gập khúc hình chữ Z do hóa chất uốn cũ',
        'Nang mi đỏ rát hoặc mắt bị xung huyết giác mạc, chảy nước mắt sống',
        'Mi đang trong đợt rụng cấp tính hoặc rụng sau điều trị y khoa',
      ],
    },
    pilotEvidences: [
      {
        type: 'FAIL',
        sessionId: 10,
        customerName: 'Khách Tâm',
        date: '05/10/2026',
        detail:
          'Mi bị tổn thương, chân nang suy yếu, không đủ sức khỏe để tiếp xúc dung dịch uốn. Kết luận: FAIL tiêu chí Tình trạng sợi mi.',
        photoUrl: '/api/pilot/media/ea735600-d100-4749-9db8-54405430e956.jpg',
      },
      {
        type: 'PASS',
        sessionId: 1,
        customerName: 'Khách Sinh Nguyên',
        date: '23/09/2026',
        detail:
          'Sợi mi nguyên bản khỏe mạnh, lớp vảy Keratin xếp đều, chưa từng tổn thương hóa chất. Kết quả PASS tuyệt đối.',
        photoUrl: '/api/pilot/media/32f48e47-b02a-4b0b-9ecc-cc843d018385.jpg',
      },
      {
        type: 'PASS',
        sessionId: 15,
        customerName: 'Khách Mai',
        date: '14/10/2026',
        detail: 'Sợi mi chắc khỏe, bờ mi sạch thông thoáng, hoàn tất liệu trình CSAT 5 sao.',
        photoUrl: '/api/pilot/media/142d7e0f-3f8c-4df2-9c42-3b309f66d100.jpg',
      },
    ],
    expertConfirmationNote:
      'Thời gian khuyến nghị nghỉ dưỡng giữa 2 lần uốn liên tiếp (4 tuần hay 6 tuần): Chờ Cô Giang Đàm xác nhận.',
    ktvDeepDive: {
      title: 'Thông số KTV chuyên sâu – Chu kỳ sinh học nang mi & An toàn bờ mi',
      specifications: [
        'Chu kỳ thay mi tự nhiên: 60 – 90 ngày. Khuyến cáo tối thiểu 6 tuần để ít nhất 50% hàng mi là sợi non mới.',
        'Dấu hiệu viêm bờ mi (Blepharitis): Vảy vàng chân mi, đỏ bờ mi. Nghiêm cấm đặt trục silicon uốn.',
        'Xử lý mi tồn dư keo nối: Phải tháo keo bằng gel tháo organic chuyên dụng trước ít nhất 48 giờ.',
      ],
    },
  },
  {
    id: 5,
    name: 'Khả năng tạo form',
    order: 5,
    icon: Award,
    quickBadge: {
      pass: 'Thoát nếp mí 90°',
      fail: 'Mí sụp đè bẹp ngọn',
    },
    purpose:
      'Đánh giá tương quan giữa dáng mí mắt (mí lót, mí sụp, mắt sâu), hướng mọc tự nhiên của sợi mi và khả năng giữ nếp cong sau khi uốn.',
    inspectionMethod:
      'Nâng thử hàng mi góc 90 độ khi khách mở mắt tự nhiên. Đánh giá độ đè của nếp mí (mí sụp, mí lót, mắt sâu, mắt lồi) lên chân mi.',
    inspectionTools: ['Gương cầm tay góc nghiêng', 'Que uốn kiểm tra nếp mở mắt', 'Trục silicon Cá Heo R3 thử dáng'],
    passStandard: {
      title: 'ĐẠT (PASS) – Tạo form thoáng mí, cong tự nhiên',
      description:
        'Mi có thể kéo căng 90 độ lên trục uốn, khi mở mắt sợi mi thoát khỏi nếp mí, không bị đè bẹp.',
      indicators: [
        'Sợi mi mềm dẻo ôm khít đường cong trục silicon',
        'Nếp mí mắt khi mở không đè cụp ngọn mi xuống',
        'Đạt độ cong mong muốn (Cong tự nhiên M hoặc Cong bật cá heo R3)',
      ],
    },
    failStandard: {
      title: 'KHÔNG ĐẠT (FAIL) – Mí đè gập hoặc mi quặp ngược',
      description:
        'Mí mắt quá dày mỡ đè bẹp chân mi, hướng mi mọc quặp sâu vào giác mạc không thể cố định lên trục.',
      indicators: [
        'Mí mắt sụp che hoàn toàn chân mi khi mở mắt',
        'Sợi mi quá cứng đơ kháng cự hoàn toàn độ uốn của trục',
        'Hướng mi mọc quặp ngược vào giác mạc nguy hiểm',
      ],
    },
    pilotEvidences: [
      {
        type: 'FAIL',
        sessionId: 10,
        customerName: 'Khách Tâm',
        date: '05/10/2026',
        detail:
          'Không thể lên trục uốn để định hình form mi cong do mi quá ngắn và đứt gãy. Kết luận: FAIL tiêu chí Khả năng tạo form.',
        photoUrl: '/api/pilot/media/ea735600-d100-4749-9db8-54405430e956.jpg',
      },
      {
        type: 'PASS',
        sessionId: 6,
        customerName: 'Khách Hương',
        date: '29/09/2026',
        detail: 'Dáng mi ôm form trục cong M rất tự nhiên, khách rất ưng ý. CSAT 5 sao.',
        photoUrl: '/api/pilot/media/49376a6c-aabd-49e7-a1fe-78c317c1d871.jpg',
      },
      {
        type: 'PASS',
        sessionId: 18,
        customerName: 'Khách Nguyệt',
        date: '27/10/2026',
        detail: 'Sử dụng trục cá heo R3 tạo form vút bay ấn tượng, khách thích và đánh giá 5 sao.',
        photoUrl: '/api/pilot/media/1f7ce362-702c-497b-b169-50008332e018.jpg',
      },
    ],
    expertConfirmationNote:
      'Ma trận tra cứu trục silicon theo từng dáng mí mắt đặc thù (mí sụp, mí lót, mắt lồi): Chờ Cô Giang Đàm xác nhận.',
    ktvDeepDive: {
      title: 'Thông số KTV chuyên sâu – Ma trận phối hợp Form trục & Dáng mí',
      specifications: [
        'Mắt 2 mí rõ, chân mi hở: Phù hợp Trục Cá Heo R3 (đỉnh uốn bật cao, hiệu ứng mở to mắt).',
        'Mắt mí lót, da chùng nhẹ: Dùng Form M uốn cong tròn C-Curl để ngọn mi vươn qua nếp mí.',
        'Mắt mí sụp mỡ dày: Bắt buộc thử kéo nếp mí; nếu ngọn mi vẫn bị mí che > 50% ➔ Khuyên nối mi thiết kế.',
      ],
    },
  },
];

// Fallback pilot sessions for evidence table enriched with all 17 pilot records from Đề Thám
const DEFAULT_PILOT_SESSIONS: Partial<PilotSession>[] = [
  {
    id: 1,
    sessionDate: '2026-09-23',
    customerName: 'Sinh Nguyên',
    customerPhone: '0855955653',
    technicianName: 'Cô Đẫm',
    status: 'BEFORE_PHOTO',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Biểu bì keratin nguyên bản, nang mi khỏe đạt chuẩn',
    beforePhotoUrl: '/api/pilot/media/32f48e47-b02a-4b0b-9ecc-cc843d018385.jpg',
    afterPhotoUrl: null,
    csatScore: 5,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
  {
    id: 2,
    sessionDate: '2026-09-24',
    customerName: 'Bảo Hân',
    customerPhone: '0702610128',
    technicianName: 'Cô Đẫm',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Đủ điều kiện uốn mi bóng tối',
    beforePhotoUrl: '/api/pilot/media/7d76c1ad-c17f-43f9-9784-50ac73d9920a.jpg',
    afterPhotoUrl: '/api/pilot/media/c1caf0d2-2911-4b7c-834e-0cefee325099.jpg',
    csatScore: 3,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
  {
    id: 3,
    sessionDate: '2026-09-24',
    customerName: 'Nguyễn Quang Khải',
    customerPhone: '0355175680',
    technicianName: 'Cô Đẫm',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Đủ điều kiện uốn mi nam tính tự nhiên',
    beforePhotoUrl: '/api/pilot/media/aff994c6-aa9c-47a4-b35a-ef0feeb040b5.jpg',
    afterPhotoUrl: '/api/pilot/media/ae37a5ae-8c52-4bc6-8e9c-ac3ea8c21f98.jpg',
    csatScore: 5,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
  {
    id: 4,
    sessionDate: '2026-09-25',
    customerName: 'Phương Nhi',
    customerPhone: '0796821920',
    technicianName: 'Cô Đẫm',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Sợi mi đạt tiêu chuẩn uốn cong tự nhiên',
    beforePhotoUrl: '/api/pilot/media/b4eaafbd-93ee-4105-aac6-f1eb09752b8c.jpg',
    afterPhotoUrl: '/api/pilot/media/cb329768-ed3d-489e-8e58-d123ac746e0e.jpg',
    csatScore: 5,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
  {
    id: 5,
    sessionDate: '2026-09-26',
    customerName: 'Phương Thảo',
    customerPhone: '0916492727',
    technicianName: 'Cô Đẫm',
    status: 'INELIGIBLE',
    assessmentStatus: 'FAIL',
    assessmentReason: 'Mi ngắn dưới 8mm và mi thưa mỏng',
    assessmentNotes: 'Chuyển qua nối mi hyper có độ che phủ',
    beforePhotoUrl: null,
    afterPhotoUrl: null,
    csatScore: null,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: false },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: false },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: false },
    ],
  },
  {
    id: 6,
    sessionDate: '2026-09-29',
    customerName: 'Hương',
    customerPhone: '0908867857',
    technicianName: 'Cô Đẫm',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Độ cong vừa phải, form trục cong M khách rất ưng ý',
    beforePhotoUrl: '/api/pilot/media/49376a6c-aabd-49e7-a1fe-78c317c1d871.jpg',
    afterPhotoUrl: '/api/pilot/media/9ee5bcd1-28f5-423f-a2d7-2fba566be191.jpg',
    csatScore: 5,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
  {
    id: 7,
    sessionDate: '2026-10-02',
    customerName: 'Vân Anh',
    customerPhone: '0972020009',
    technicianName: 'Cô Đẫm',
    status: 'INELIGIBLE',
    assessmentStatus: 'FAIL',
    assessmentReason:
      'Khách đủ điều kiện mi thật khỏe và độ dài là 9-10. Nhưng khách muốn nối lại mi chồn như trước đây',
    assessmentNotes:
      'Khách đủ điều kiện mi thật khỏe và độ dài là 9-10. Nhưng khách muốn nối lại mi chồn như trước đây. Chuyển qua nối mi',
    beforePhotoUrl: null,
    afterPhotoUrl: null,
    csatScore: null,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
  {
    id: 8,
    sessionDate: '2026-10-03',
    customerName: 'Hạnh',
    customerPhone: '0984084061',
    technicianName: 'Cô Đẫm',
    status: 'CHECKED_IN',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Đủ điều kiện uốn mi bóng tối',
    beforePhotoUrl: null,
    afterPhotoUrl: null,
    csatScore: null,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
  {
    id: 9,
    sessionDate: '2026-10-09',
    customerName: 'Linh',
    customerPhone: '0903804101',
    technicianName: 'Cô Đẫm',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Mi ngắn nhưng gốc khỏe và mi đủ nhiều để uốn. Khách rất thích',
    beforePhotoUrl: '/api/pilot/media/85a596d9-d6ca-426c-8990-131677ddeb09.jpg',
    afterPhotoUrl: '/api/pilot/media/596637a5-5f1d-4941-bbbd-9e1b69370b0f.jpg',
    csatScore: 5,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
  {
    id: 10,
    sessionDate: '2026-10-05',
    customerName: 'Khách Tâm',
    customerPhone: '0909877006',
    technicianName: 'Cô Đẫm',
    status: 'INELIGIBLE',
    assessmentStatus: 'FAIL',
    assessmentReason: 'Mi quá ngắn không lên được trục uốn để uốn. Mi bị trụi trống thưa nhiều chỗ.',
    assessmentNotes:
      'Hiện khách muốn về dưỡng mi chứ không muốn nối nữa. Dưỡng 1-2 tuần rồi khách sẽ quay lại để kiểm tra sức khỏe uốn mi tiếp',
    beforePhotoUrl: '/api/pilot/media/ea735600-d100-4749-9db8-54405430e956.jpg',
    afterPhotoUrl: null,
    csatScore: null,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: false },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: false },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: false },
      { criterionId: 5, name: 'Khả năng tạo form', passed: false },
    ],
  },
  {
    id: 11,
    sessionDate: '2026-10-07',
    customerName: 'Yến Vy',
    customerPhone: '0346784054',
    technicianName: 'Cô Đẫm',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Mi khỏe, thuốc số 1 ủ 15 phút mới đạt độ mềm. Dùng độ cong M',
    beforePhotoUrl: '/api/pilot/media/0d7a30c5-22ec-48e2-bafe-10085da19bdb.jpg',
    afterPhotoUrl: '/api/pilot/media/b36bd44d-ec95-4536-8cc4-2335c3ff028f.jpg',
    csatScore: 5,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
  {
    id: 12,
    sessionDate: '2026-10-10',
    customerName: 'Thảo',
    customerPhone: '0914940969',
    technicianName: 'Cô Đẫm',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Mi ngắn 9mm nhưng gốc nhiều và khỏe. Uốn lên rất đẹp',
    beforePhotoUrl: '/api/pilot/media/f0d1cfad-a915-4bf8-87a7-fe1cf592813e.jpg',
    afterPhotoUrl: '/api/pilot/media/cbd93d27-24b9-48fb-87a4-f3ca97a0e741.jpg',
    csatScore: 5,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
  {
    id: 13,
    sessionDate: '2026-10-16',
    customerName: 'Mi',
    customerPhone: '0947010195',
    technicianName: 'Cô Đẫm',
    status: 'BOOKED',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Đặt lịch trải nghiệm dịch vụ uốn mi bóng tối',
    beforePhotoUrl: null,
    afterPhotoUrl: null,
    csatScore: null,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
  {
    id: 14,
    sessionDate: '2026-10-12',
    customerName: 'NI NA',
    customerPhone: '0977057575',
    technicianName: 'Cô Đẫm',
    status: 'BOOKED',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Đặt lịch kiểm tra sức khỏe mi uốn bóng tối',
    beforePhotoUrl: null,
    afterPhotoUrl: null,
    csatScore: null,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
  {
    id: 15,
    sessionDate: '2026-10-14',
    customerName: 'Mai',
    customerPhone: '0982406668',
    technicianName: 'Cô Đẫm',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Mi đạt chuẩn, kết quả hoàn thiện xuất sắc',
    beforePhotoUrl: '/api/pilot/media/142d7e0f-3f8c-4df2-9c42-3b309f66d100.jpg',
    afterPhotoUrl: '/api/pilot/media/f81878f9-e4f0-45e3-ae5c-49d1b118cac3.jpg',
    csatScore: 5,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
  {
    id: 16,
    sessionDate: '2026-10-17',
    customerName: 'Bách Kim',
    customerPhone: '0907775263',
    technicianName: 'Cô Đẫm',
    status: 'BOOKED',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Hẹn tư vấn uốn mi bóng tối',
    beforePhotoUrl: null,
    afterPhotoUrl: null,
    csatScore: null,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
  {
    id: 17,
    sessionDate: '2026-10-21',
    customerName: 'Rosa',
    customerPhone: '0368015830',
    technicianName: 'Cô Đẫm',
    status: 'FEEDBACK_DONE',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Khách đánh giá 5 sao, dáng mi cong bóng đẹp',
    beforePhotoUrl: '/api/pilot/media/ea0da56d-f449-40c9-9023-cef6c78145ef.jpg',
    afterPhotoUrl: '/api/pilot/media/ab71de6b-6289-4dcf-8b74-bd051a0b61e9.jpg',
    csatScore: 5,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
  {
    id: 18,
    sessionDate: '2026-10-27',
    customerName: 'Nguyệt',
    customerPhone: '0904055550',
    technicianName: 'Cô Đẫm',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Mi dài 8-9mm, gốc khỏe thuốc 1 ủ 15 phút, trục cá heo R3',
    beforePhotoUrl: '/api/pilot/media/1f7ce362-702c-497b-b169-50008332e018.jpg',
    afterPhotoUrl: '/api/pilot/media/5c3fcdfa-0d01-4ed4-81aa-e19033e1d445.jpg',
    csatScore: 5,
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
  },
];

const TECHNICAL_GLOSSARY = [
  {
    term: 'Liên kết Disulfide (S-S)',
    simpleExplain:
      'Cầu nối hóa học tự nhiên bên trong sợi mi quyết định hình dáng thẳng hay cong. Dung dịch số 1 làm mềm tạm thời bẻ gãy liên kết này, sau đó thuốc số 2 hàn gắn lại theo hình dáng trục uốn.',
  },
  {
    term: 'Lớp biểu bì Keratin',
    simpleExplain:
      'Lớp "vảy sừng" bảo vệ ngoài cùng của sợi mi. Sợi mi bóng mượt là lớp vảy khép kín; sợi mi xơ mủn là biểu bì đã bị tổn hại do lạm dụng hóa chất.',
  },
  {
    term: 'Trục Cá Heo R3 & Trục Silicon',
    simpleExplain:
      'Khuôn đệm silicon chuyên dụng đặt sát mí mắt để nâng cong mi. Trục Cá Heo R3 có gờ nhô vút đỉnh cao tạo hiệu ứng mắt mở to rạng rỡ cho mi dài.',
  },
  {
    term: 'Cữ thước đo mi',
    simpleExplain:
      'Thước đo chuyên dụng có khắc vạch milimet để Chuyên Viên kiểm tra chính xác chiều dài mi thật của khách tại bàn tư vấn trong vòng 5 giây.',
  },
  {
    term: 'Nang lông mi',
    simpleExplain:
      'Chân gốc sợi mi nằm dưới bờ mi nơi nuôi dưỡng và sản sinh sợi mi mới. Nang mi yếu hoặc rụng mảng cần được nghỉ dưỡng, không được tác động nhiệt hay hóa chất.',
  },
  {
    term: 'CSAT 5 sao',
    simpleExplain:
      'Customer Satisfaction Score – Điểm số hài lòng tuyệt đối của khách hàng sau khi trải nghiệm uốn mi bóng tối và hoàn tất phỏng vấn tại quầy lễ tân.',
  },
];

export function PilotCriteriaSopDetail({
  onBack,
  onOpenCriteriaModal,
  onOpenSopModal,
  sessions,
  onOpenSessionFlow,
}: PilotCriteriaSopDetailProps) {
  // Collapsible criteria states: default all expanded for thorough viewing
  const [expandedCriteria, setExpandedCriteria] = useState<number[]>([1, 2, 3, 4, 5]);
  const [expandedDeepDives, setExpandedDeepDives] = useState<number[]>([]);
  const [showGlossary, setShowGlossary] = useState<boolean>(false);

  // Evidence filtering & searching
  const [evidenceFilter, setEvidenceFilter] = useState<'ALL' | 'FAIL' | 'PASS' | 'HAS_PHOTO'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Photo preview modal state
  const [previewPhoto, setPreviewPhoto] = useState<{
    url: string;
    title: string;
    subtitle: string;
  } | null>(null);

  // Toggle criterion expansion
  const toggleCriterion = (id: number) => {
    setExpandedCriteria((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const expandAllCriteria = () => setExpandedCriteria([1, 2, 3, 4, 5]);
  const collapseAllCriteria = () => setExpandedCriteria([]);

  const toggleDeepDive = (id: number) => {
    setExpandedDeepDives((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Merge live sessions from props or complete 17 pilot sessions fallback
  const displaySessions = useMemo(() => {
    if (sessions && sessions.length > 0) {
      // Prioritize sessions that have assessment data or are case studies
      const evaluated = sessions.filter(
        (s) => s.assessmentStatus || s.status === 'INELIGIBLE' || s.id === 10 || s.id === 5 || s.id === 7
      );
      if (evaluated.length >= 3) return sessions;
    }
    return DEFAULT_PILOT_SESSIONS as PilotSession[];
  }, [sessions]);

  // Filtered sessions with search and evidence type
  const filteredSessions = useMemo(() => {
    return displaySessions.filter((s) => {
      const isFail = s.assessmentStatus === 'FAIL' || s.status === 'INELIGIBLE';
      const isPass = s.assessmentStatus === 'PASS' || s.status === 'CHECKED_OUT' || s.status === 'FEEDBACK_DONE';
      const hasPhoto = Boolean(s.beforePhotoUrl || s.afterPhotoUrl);

      // Filter tabs
      if (evidenceFilter === 'FAIL' && !isFail) return false;
      if (evidenceFilter === 'PASS' && !isPass) return false;
      if (evidenceFilter === 'HAS_PHOTO' && !hasPhoto) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = s.customerName?.toLowerCase().includes(q);
        const idMatch = String(s.id).includes(q);
        const phoneMatch = s.customerPhone?.includes(q);
        const reasonMatch = s.assessmentReason?.toLowerCase().includes(q);
        const notesMatch = s.assessmentNotes?.toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !phoneMatch && !reasonMatch && !notesMatch) {
          return false;
        }
      }

      return true;
    });
  }, [displaySessions, evidenceFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = displaySessions.length;
    const passCount = displaySessions.filter(
      (s) => s.assessmentStatus === 'PASS' || (s.status !== 'INELIGIBLE' && s.assessmentStatus !== 'FAIL')
    ).length;
    const failCount = displaySessions.filter(
      (s) => s.assessmentStatus === 'FAIL' || s.status === 'INELIGIBLE'
    ).length;
    const withPhotosCount = displaySessions.filter(
      (s) => s.beforePhotoUrl || s.afterPhotoUrl
    ).length;
    return {
      total,
      passCount,
      failCount,
      withPhotosCount,
      passRate: total > 0 ? ((passCount / total) * 100).toFixed(1) : '0',
    };
  }, [displaySessions]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 antialiased" data-testid="pilot-criteria-sop-detail">
      {/* ═══════════════════════════════════════════════════════════
          BREADCRUMBS & TOP CONTROLS
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          {onBack && (
            <Button
              type="text"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 -ml-2 rounded-lg"
              data-testid="sop-detail-back-button"
            >
              <AppIcon icon={ArrowLeft} size={14} />
              <span>Quay lại Khung đào tạo</span>
            </Button>
          )}
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Khung 5 Hạng mục SOP</span>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            Hạng mục 1: SOP Đánh giá &amp; Phân loại dáng mi
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="small"
            onClick={() => setShowGlossary(!showGlossary)}
            className="inline-flex items-center gap-1.5 text-xs rounded-lg border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/5 hover:bg-amber-500/10"
            data-testid="toggle-glossary-button"
          >
            <AppIcon icon={HelpCircle} size={13} className="text-amber-500" />
            <span>{showGlossary ? 'Đóng giải thích thuật ngữ' : 'Từ điển thuật ngữ (Dễ hiểu)'}</span>
          </Button>

          {onOpenCriteriaModal && (
            <Button
              size="small"
              onClick={onOpenCriteriaModal}
              className="inline-flex items-center gap-1.5 text-xs rounded-lg border-slate-200 dark:border-slate-700"
            >
              <AppIcon icon={Sparkles} size={13} className="text-violet-500" />
              <span>Danh mục 5 tiêu chí</span>
            </Button>
          )}
          {onOpenSopModal && (
            <Button
              size="small"
              onClick={onOpenSopModal}
              className="inline-flex items-center gap-1.5 text-xs rounded-lg border-slate-200 dark:border-slate-700"
            >
              <AppIcon icon={BookOpen} size={13} className="text-teal-500" />
              <span>Xem trước SOP 7 bước</span>
            </Button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          HEADER BANNER & SCALE APPROVAL STATUS
          ═══════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl p-5 sm:p-6 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent relative overflow-hidden shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2 max-w-4xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <AppIcon icon={Sparkles} size={13} className="mr-1.5" />
                Hạng mục 1 · SOP Tiêu Chuẩn Kỹ Thuật
              </span>
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                Phiên bản SOP v1.0
              </span>
              <span
                className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                data-testid="expert-approval-status-badge"
              >
                <AppIcon icon={Clock} size={13} className="mr-1.5 text-amber-500" />
                Chờ Cô Giang Đàm thẩm định chuyên môn
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight m-0">
              SOP Đánh Giá &amp; Phân Loại Dáng Mi Trước Dịch Vụ
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed m-0">
              Bộ chuẩn mực kỹ thuật thẩm định cấu trúc nang lông mi tự nhiên, độ dài, mật độ và khả năng tạo form dành cho{' '}
              <strong className="text-slate-800 dark:text-slate-100">Chuyên Viên Kỹ Thuật</strong> tại Wings. Tài liệu được
              tổng hợp trực tiếp từ dữ liệu thực nghiệm 17 ca Pilot tại chi nhánh Đề Thám, phục vụ công tác đào tạo KTV và
              trình CEO phê duyệt mở rộng quy mô (Scale-up) toàn chuỗi.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shrink-0 space-y-1.5 min-w-[220px]">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Hồ sơ trình phê duyệt
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Chuyên gia phụ trách:</span>
              <strong className="text-slate-800 dark:text-slate-200">Cô Giang Đàm</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Thực nghiệm Pilot:</span>
              <strong className="text-slate-800 dark:text-slate-200">Cô Đẫm (17 ca)</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Trạng thái phê duyệt:</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">Chờ thẩm định</span>
            </div>
          </div>
        </div>

        {/* 3 Trụ cột mục tiêu */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <AppIcon icon={CheckCircle2} size={14} className="text-emerald-500" />
              <span>Đào tạo Chuyên Viên Kỹ Thuật</span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 leading-normal">
              Chuẩn hóa 5 bước quan sát, thẩm định mi bằng kính Macro 15x và cữ thước đo mi tại bàn tư vấn.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <AppIcon icon={ShieldAlert} size={14} className="text-rose-500" />
              <span>Triệt tiêu Rủi ro &amp; Biến chứng</span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 leading-normal">
              Từ chối kiên quyết các trường hợp mi ngắn &lt; 8mm, mi trụi mảng (như ca #10) để bảo vệ uy tín Wings.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <AppIcon icon={Award} size={14} className="text-teal-500" />
              <span>Căn cứ Trình CEO Phê Duyệt</span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 leading-normal">
              Định lượng tỷ lệ PASS/FAIL thực tế ({stats.passRate}% Đạt) và quy trình chuyển đổi dịch vụ linh hoạt.
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TỪ ĐIỂN THUẬT NGỮ KỸ THUẬT (DÀNH CHO NGƯỜI MỚI & QUẢN LÝ)
          ═══════════════════════════════════════════════════════════ */}
      {showGlossary && (
        <div
          className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 space-y-3 transition-all"
          data-testid="sop-glossary-section"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AppIcon icon={BookOpen} size={15} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                Từ Điển Thuật Ngữ Kỹ Thuật (Diễn Giải Dễ Hiểu Cho Mọi Người)
              </h3>
            </div>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Không cần chuyên môn vẫn hiểu rõ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {TECHNICAL_GLOSSARY.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-amber-500/20 space-y-1"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <AppIcon icon={HelpCircle} size={13} className="text-amber-500" />
                  <span>{item.term}</span>
                </div>
                <p className="text-[11.5px] text-slate-600 dark:text-slate-300 m-0 leading-relaxed">
                  {item.simpleExplain}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          QUY TRÌNH RA QUYẾT ĐỊNH PASS/FAIL NHANH (DECISION FLOW)
          ═══════════════════════════════════════════════════════════ */}
      <div className="p-4 sm:p-5 rounded-2xl border border-teal-500/20 bg-gradient-to-r from-teal-500/5 via-emerald-500/5 to-transparent space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">
              Sơ Đồ Ra Quyết Định Nhanh Trong 30 Giây
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
              Quy Trình 5 Cửa Kiểm Soát PASS/FAIL (Đạt 5/5 Mới Được Uốn)
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Áp dụng trực tiếp tại Bàn tư vấn khách hàng
          </span>
        </div>

        {/* 5 Bước kiểm soát tuần tự */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 relative">
            <div className="flex items-center justify-between">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center">
                1
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">≥ 8.0mm</span>
            </div>
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">Độ dài mi</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 leading-tight">
              Dưới 8mm ➔ Dừng, từ chối an toàn
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center">
                2
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Sợi khỏe</span>
            </div>
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">Độ dày &amp; Biểu bì</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 leading-tight">
              Mất lõi, xơ mủn ➔ FAIL ngay
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center">
                3
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Kín cung</span>
            </div>
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">Mật độ mi</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 leading-tight">
              Trống hốc &gt; 2.5mm ➔ Tư vấn nối mi
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center">
                4
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">&gt; 6 tuần</span>
            </div>
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">Tình trạng mi</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 leading-tight">
              Viêm bờ mi / cháy sun ➔ Không làm
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center">
                5
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Thoát mí 90°</span>
            </div>
            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">Khả năng tạo form</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 leading-tight">
              Mí đè gập ➔ Không uốn được
            </p>
          </div>
        </div>

        {/* Nguyên tắc cốt lõi & Hướng ra quyết định */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <AppIcon icon={CheckCircle2} size={16} className="text-emerald-500 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300">
              <strong>Nguyên tắc vàng:</strong> Chỉ cần vi phạm <strong>1 trong 5 tiêu chí</strong> ➔ Dừng lại ngay, bảo vệ sức khỏe mắt khách hàng và uy tín của Wings.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">PASS: Vào SOP 7 bước</span>
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">FAIL: Từ chối an toàn</span>
            <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">CHUYỂN: Nối mi Hyper</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2: CHECKLIST 5 TIÊU CHÍ ĐÁNH GIÁ (COLLAPSIBLE)
          ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Khung Thẩm Định Kỹ Thuật Chi Tiết
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
              Checklist 5 Tiêu Chí Đánh Giá Chuyên Môn (Do Cô Giang Đàm Xây Dựng)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="small"
              onClick={expandAllCriteria}
              className="text-xs rounded-lg"
              data-testid="expand-all-criteria-button"
            >
              <AppIcon icon={ChevronDown} size={13} />
              <span>Mở rộng tất cả</span>
            </Button>
            <Button
              size="small"
              onClick={collapseAllCriteria}
              className="text-xs rounded-lg"
              data-testid="collapse-all-criteria-button"
            >
              <AppIcon icon={ChevronUp} size={13} />
              <span>Thu gọn tất cả</span>
            </Button>
          </div>
        </div>

        {/* 5 Tiêu chí Collapsible Accordion */}
        <div className="grid grid-cols-1 gap-3.5">
          {SOP_CRITERIA_LIST.map((crit) => {
            const isExpanded = expandedCriteria.includes(crit.id);
            const isDeepDiveOpen = expandedDeepDives.includes(crit.id);
            const IconComp = crit.icon;

            return (
              <Card
                key={crit.id}
                variant="outlined"
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isExpanded
                    ? 'border-emerald-500/30 dark:border-emerald-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
                data-testid={`sop-criterion-card-${crit.id}`}
              >
                {/* Header Tiêu chí có thể bấm mở/thu gọn */}
                <div
                  onClick={() => toggleCriterion(crit.id)}
                  className="flex items-center justify-between gap-3 cursor-pointer select-none"
                  data-testid={`sop-criterion-header-${crit.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm transition-colors ${
                        isExpanded
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {crit.order}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                          Tiêu chí {crit.order}: {crit.name}
                        </h3>
                        <span className="inline-flex items-center justify-center leading-none text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          Checklist Bước 3
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          ĐẠT: {crit.quickBadge.pass}
                        </span>
                        <span>•</span>
                        <span className="text-rose-600 dark:text-rose-400 font-medium">
                          FAIL: {crit.quickBadge.fail}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      {crit.pilotEvidences.length} ca minh chứng
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                      <AppIcon
                        icon={isExpanded ? ChevronUp : ChevronDown}
                        size={15}
                      />
                    </div>
                  </div>
                </div>

                {/* Nội dung chi tiết 5 phần theo chuẩn */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                    {/* Phần 1: MỤC ĐÍCH */}
                    <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <AppIcon icon={Info} size={14} className="text-emerald-500" />
                        <span>1. Mục đích kiểm tra:</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 m-0 leading-relaxed">
                        {crit.purpose}
                      </p>
                    </div>

                    {/* Phần 2: CÁCH KIỂM TRA & DỤNG CỤ */}
                    <div className="p-3 rounded-xl bg-teal-500/5 dark:bg-teal-950/20 border border-teal-500/20 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300">
                          <AppIcon icon={Eye} size={14} className="text-teal-500" />
                          <span>2. Cách kiểm tra thực tế:</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-teal-700 dark:text-teal-400">
                          <span className="font-semibold">Dụng cụ:</span>
                          {crit.inspectionTools.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/20 text-[10.5px]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 m-0 leading-relaxed">
                        {crit.inspectionMethod}
                      </p>
                    </div>

                    {/* Phần 3: ĐẠT (PASS) vs KHÔNG ĐẠT (FAIL) */}
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        3. Tiêu chuẩn ĐẠT / KHÔNG ĐẠT:
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Cột ĐẠT (PASS) */}
                        <div className="p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                              <AppIcon icon={CheckCircle2} size={15} className="text-emerald-500 shrink-0" />
                              <span>{crit.passStandard.title}</span>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                              ĐẠT CHUẨN
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 m-0">
                            {crit.passStandard.description}
                          </p>
                          <ul className="m-0 p-0 list-none space-y-1 pt-1">
                            {crit.passStandard.indicators.map((ind, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-1.5 text-[11.5px] text-slate-700 dark:text-slate-300"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                <span className="leading-tight">{ind}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Cột KHÔNG ĐẠT (FAIL) */}
                        <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                              <AppIcon icon={XCircle} size={15} className="text-rose-500 shrink-0" />
                              <span>{crit.failStandard.title}</span>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300">
                              TỪ CHỐI AN TOÀN
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 m-0">
                            {crit.failStandard.description}
                          </p>
                          <ul className="m-0 p-0 list-none space-y-1 pt-1">
                            {crit.failStandard.indicators.map((ind, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-1.5 text-[11.5px] text-slate-700 dark:text-slate-300"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                                <span className="leading-tight">{ind}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Phần 4: VÍ DỤ THỰC TẾ TỪ 17 CA PILOT */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          4. Minh chứng thực tế từ 17 ca Pilot Đề Thám:
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Ảnh chụp lâm sàng thật · Không dùng ảnh minh họa
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {crit.pilotEvidences.map((ev, idx) => {
                          const isFail = ev.type === 'FAIL';
                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-xl border text-xs space-y-2 ${
                                isFail
                                  ? 'bg-rose-500/5 dark:bg-rose-950/10 border-rose-500/20 text-rose-900 dark:text-rose-200'
                                  : 'bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold flex items-center gap-1.5">
                                  {isFail ? (
                                    <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold">
                                      FAIL #{ev.sessionId}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                                      PASS #{ev.sessionId}
                                    </span>
                                  )}
                                  <span>{ev.customerName}</span>
                                </span>
                                <span className="text-[10px] text-slate-400">{ev.date}</span>
                              </div>

                              {/* Hiển thị ảnh minh chứng thực tế nếu có */}
                              {ev.photoUrl ? (
                                <div className="space-y-1">
                                  <div
                                    onClick={() =>
                                      setPreviewPhoto({
                                        url: ev.photoUrl!,
                                        title: `Minh chứng Ca #${ev.sessionId} – ${ev.customerName}`,
                                        subtitle: ev.detail,
                                      })
                                    }
                                    className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 h-24 bg-slate-950 cursor-pointer group"
                                  >
                                    <img
                                      src={ev.photoUrl}
                                      alt={`Ảnh ca #${ev.sessionId}`}
                                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                      onError={(e) => {
                                        // Graceful fallback for broken image
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] gap-1">
                                      <AppIcon icon={Maximize2} size={12} />
                                      <span>Phóng to</span>
                                    </div>
                                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9.5px] font-medium backdrop-blur-xs">
                                      Ảnh thực tế
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                  <AppIcon icon={FileText} size={12} className="shrink-0" />
                                  <span>Biên bản đánh giá lâm sàng (Không lưu ảnh)</span>
                                </div>
                              )}

                              <p className="text-[11px] text-slate-600 dark:text-slate-400 m-0 leading-tight">
                                {ev.detail}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Phần 5: LƯU Ý CHUYÊN MÔN & THÔNG SỐ KTV MỞ RỘNG */}
                    <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      {/* Cảnh báo trạng thái chờ Cô Giang Đàm thẩm định */}
                      {crit.expertConfirmationNote && (
                        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl">
                          <AppIcon icon={AlertTriangle} size={14} className="text-amber-500 shrink-0" />
                          <span>
                            <strong>Lưu ý chuyên môn:</strong> {crit.expertConfirmationNote}
                          </span>
                        </div>
                      )}

                      {/* Khu vực mở rộng Thông số chuyên sâu cho Chuyên Viên (KTV) */}
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleDeepDive(crit.id)}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                          data-testid={`toggle-deep-dive-${crit.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <AppIcon icon={Sliders} size={13} className="text-violet-500" />
                            <span>{crit.ktvDeepDive.title}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            {isDeepDiveOpen ? 'Thu gọn thông số' : 'Mở rộng thông số KTV'}
                            <AppIcon icon={isDeepDiveOpen ? ChevronUp : ChevronDown} size={13} />
                          </span>
                        </button>

                        {isDeepDiveOpen && (
                          <div className="px-3.5 pb-3.5 pt-1 space-y-2 text-xs border-t border-slate-200/50 dark:border-slate-800/50">
                            <ul className="m-0 p-0 list-none space-y-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                              {crit.ktvDeepDive.specifications.map((spec, sIdx) => (
                                <li key={sIdx} className="flex items-start gap-1.5">
                                  <span className="text-violet-500 font-bold mt-0.5">•</span>
                                  <span>{spec}</span>
                                </li>
                              ))}
                            </ul>
                            {crit.ktvDeepDive.chemistryNote && (
                              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-800 dark:text-violet-200 border border-violet-500/20 text-[11px]">
                                <strong>Cơ chế hóa sinh:</strong> {crit.ktvDeepDive.chemistryNote}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3: QUY TRÌNH KẾT LUẬN & HƯỚNG XỬ LÝ KỸ THUẬT
          ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">
            Decision Matrix &amp; Action Flow
          </span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
            Quy Trình Kết Luận Điều Kiện Mi &amp; Hướng Xử Lý Tương Ứng
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Trường hợp 1: PASS TOÀN BỘ */}
          <Card
            variant="outlined"
            className="rounded-2xl border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  Trường hợp 1: PASS
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">5/5 ĐẠT</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                Đủ Điều Kiện Uốn Mi Bóng Tối
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
                Khách hàng thỏa mãn cả 5 tiêu chí: Sợi mi khỏe, dài ≥ 8mm, mật độ đều, không tổn thương và tạo form tốt.
              </p>
              <div className="pt-2 border-t border-emerald-500/20 space-y-1.5 text-xs">
                <div className="font-semibold text-emerald-800 dark:text-emerald-200">Quy trình thực hiện:</div>
                <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-emerald-600">1.</span>
                  <span>Chụp ảnh Before chính diện và góc 45 độ lưu vào hồ sơ</span>
                </div>
                <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-emerald-600">2.</span>
                  <span>Chọn size trục silicon (S, M, L hoặc trục cá heo R3)</span>
                </div>
                <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-emerald-600">3.</span>
                  <span>Kích hoạt Quy trình kỹ thuật SOP 7 bước tiêu chuẩn</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
              Áp dụng: Ca #1, #6, #9, #11, #12, #15, #17, #18
            </div>
          </Card>

          {/* Trường hợp 2: FAIL KỸ THUẬT (Điển hình Ca #10) */}
          <Card
            variant="outlined"
            className="rounded-2xl border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300">
                  Trường hợp 2: FAIL Kỹ Thuật
                </span>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Từ chối an toàn</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                Mi Quá Ngắn / Trụi Trống / Hư Tổn
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
                Mi không đủ điều kiện an toàn (như Ca #10 khách Tâm: Mi quá ngắn, trụi trống nhiều chỗ, không ôm được trục).
              </p>
              <div className="pt-2 border-t border-rose-500/20 space-y-1.5 text-xs">
                <div className="font-semibold text-rose-800 dark:text-rose-200">Hướng xử lý chuẩn mực Wings:</div>
                <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-rose-600">1.</span>
                  <span>Giải thích trung thực lý do kỹ thuật, tuyệt đối không làm gượng ép</span>
                </div>
                <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-rose-600">2.</span>
                  <span>Tư vấn khách về dưỡng mi tại nhà bằng serum/keratin từ 1–2 tuần</span>
                </div>
                <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-rose-600">3.</span>
                  <span>Hẹn lịch tái khám kiểm tra nang mi trước khi quyết định uốn</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 text-[11px] text-rose-700 dark:text-rose-300 font-medium">
              Minh chứng đối chiếu: Ca #10 (Khách Tâm - 05/10/2026)
            </div>
          </Card>

          {/* Trường hợp 3: CHUYỂN ĐỔI DỊCH VỤ (Điển hình Ca #5, Ca #7) */}
          <Card
            variant="outlined"
            className="rounded-2xl border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300">
                  Trường hợp 3: Chuyển Dịch Vụ
                </span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Tư vấn linh hoạt</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                Nhu Cầu Khác Hoặc Cần Độ Che Phủ
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
                Khách hàng có mi thưa mỏng cần che phủ (Ca #5) hoặc thích phong cách dày đậm cá tính (Ca #7).
              </p>
              <div className="pt-2 border-t border-blue-500/20 space-y-1.5 text-xs">
                <div className="font-semibold text-blue-800 dark:text-blue-200">Hướng chuyển đổi phù hợp:</div>
                <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-blue-600">•</span>
                  <span>
                    <strong>Mi thưa ngắn (Ca #5):</strong> Chuyển sang Nối mi Hyper / Thiết kế mi tơ có độ che phủ cao
                  </span>
                </div>
                <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-blue-600">•</span>
                  <span>
                    <strong>Mi khỏe thích dày đậm (Ca #7):</strong> Tôn trọng sở thích, chuyển sang Nối mi chồn sắc sảo
                  </span>
                </div>
                <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-blue-600">•</span>
                  <span>Ghi nhận trạng thái INELIGIBLE kèm lý do và chuyển ca mượt mà</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 text-[11px] text-blue-700 dark:text-blue-300 font-medium">
              Minh chứng đối chiếu: Ca #5 (Phương Thảo) &amp; Ca #7 (Vân Anh)
            </div>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4: BẢNG MINH CHỨNG THỰC TẾ 17 CA PILOT
          ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-4" data-testid="sop-evidence-section">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Bằng Chứng Thực Nghiệm Chi Nhánh Đề Thám
              </span>
              <span className="inline-flex items-center justify-center leading-none text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums">
                {filteredSessions.length} / {stats.total} ca hiển thị
              </span>
              <span className="inline-flex items-center justify-center leading-none text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                Tỷ lệ đạt: {stats.passRate}% ({stats.passCount} PASS)
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
              Bảng Minh Chứng Thực Tế 17 Ca Pilot (Liên Kết Ca Gốc mOS)
            </h2>
          </div>

          {/* Ô tìm kiếm & Bộ lọc filter & Toggle View */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-48 sm:w-56">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <AppIcon icon={Search} size={13} />
              </span>
              <input
                type="text"
                placeholder="Tìm khách hàng, ca #, lý do..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                data-testid="search-evidence-input"
              />
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shrink-0">
              <button
                type="button"
                onClick={() => setEvidenceFilter('ALL')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  evidenceFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Tất cả ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setEvidenceFilter('FAIL')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  evidenceFilter === 'FAIL'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                }`}
              >
                Chỉ ca FAIL ({stats.failCount})
              </button>
              <button
                type="button"
                onClick={() => setEvidenceFilter('PASS')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  evidenceFilter === 'PASS'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                }`}
              >
                Chỉ ca PASS ({stats.passCount})
              </button>
              <button
                type="button"
                onClick={() => setEvidenceFilter('HAS_PHOTO')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  evidenceFilter === 'HAS_PHOTO'
                    ? 'bg-violet-500 text-white shadow-sm'
                    : 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                }`}
              >
                Có ảnh ({stats.withPhotosCount})
              </button>
            </div>
          </div>
        </div>

        {/* Danh sách các ca minh chứng dạng Cards */}
        {filteredSessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
            Không tìm thấy ca pilot nào khớp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredSessions.map((s) => {
              const isFail = s.assessmentStatus === 'FAIL' || s.status === 'INELIGIBLE';
              const isCase10 = s.id === 10;
              const hasPhoto = Boolean(s.beforePhotoUrl || s.afterPhotoUrl);

              return (
                <div
                  key={s.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
                    isCase10
                      ? 'border-rose-500/40 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent ring-1 ring-rose-500/30 shadow-sm'
                      : isFail
                      ? 'border-rose-500/20 bg-rose-500/[0.02] dark:bg-rose-950/10'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Cột 1: Thông tin ca */}
                    <div className="space-y-1.5 min-w-[220px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 tabular-nums">
                          Ca #{s.id}
                        </span>
                        {isCase10 && (
                          <span className="inline-flex items-center justify-center leading-none text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-xs">
                            Điển hình FAIL Case Study
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center justify-center leading-none text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                            isFail
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                          }`}
                        >
                          {isFail ? 'FAIL · TỪ CHỐI AN TOÀN' : 'PASS · ĐỦ ĐIỀU KIỆN'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{s.customerName}</span>
                        <span>•</span>
                        <span className="tabular-nums">{formatDate(s.sessionDate)}</span>
                        <span>•</span>
                        <span>CV: {s.technicianName || 'Cô Đẫm'}</span>
                      </div>
                    </div>

                    {/* Cột 2: Ảnh minh chứng thu nhỏ nếu có */}
                    <div className="shrink-0 flex items-center gap-2">
                      {s.beforePhotoUrl ? (
                        <div
                          onClick={() =>
                            setPreviewPhoto({
                              url: s.beforePhotoUrl!,
                              title: `Ảnh Trước Uốn – Ca #${s.id} (${s.customerName})`,
                              subtitle: s.assessmentNotes || s.assessmentReason || 'Hồ sơ lâm sàng ca Pilot Đề Thám',
                            })
                          }
                          className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 cursor-pointer relative group shrink-0"
                          title="Bấm xem ảnh Before lớn"
                        >
                          <img
                            src={s.beforePhotoUrl}
                            alt="Before"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-white text-center py-0.5">
                            Before
                          </span>
                        </div>
                      ) : null}

                      {s.afterPhotoUrl ? (
                        <div
                          onClick={() =>
                            setPreviewPhoto({
                              url: s.afterPhotoUrl!,
                              title: `Ảnh Sau Uốn Hoàn Tất – Ca #${s.id} (${s.customerName})`,
                              subtitle: s.assessmentNotes || 'Kết quả uốn mi bóng tối chuẩn mực',
                            })
                          }
                          className="w-14 h-14 rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-950 cursor-pointer relative group shrink-0"
                          title="Bấm xem ảnh After lớn"
                        >
                          <img
                            src={s.afterPhotoUrl}
                            alt="After"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-[9px] text-white text-center py-0.5 font-bold">
                            After
                          </span>
                        </div>
                      ) : null}

                      {!hasPhoto && (
                        <div className="w-14 h-14 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-[9.5px] text-slate-400 text-center px-1">
                          <AppIcon icon={FileText} size={14} className="mb-0.5" />
                          <span>Biên bản</span>
                        </div>
                      )}
                    </div>

                    {/* Cột 3: Checklist 5 tiêu chí */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Checklist 5 Tiêu chí:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {critNameList.map((crit, idx) => {
                          const evalItem = s.assessmentCriteria?.find(
                            (c) => c.criterionId === crit.id || c.name === crit.short
                          );
                          const passed = evalItem ? evalItem.passed : !isFail;
                          return (
                            <span
                              key={idx}
                              className={`inline-flex items-center justify-center leading-none gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border ${
                                passed
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                              }`}
                            >
                              {passed ? (
                                <AppIcon icon={CheckCircle2} size={11} className="text-emerald-500" />
                              ) : (
                                <AppIcon icon={XCircle} size={11} className="text-rose-500" />
                              )}
                              <span>{crit.short}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cột 4: Lý do & Hướng xử lý */}
                    <div className="flex-1 max-w-xl text-xs space-y-1">
                      {s.assessmentReason && (
                        <div className="text-rose-700 dark:text-rose-300">
                          <strong>Lý do từ chối:</strong> {s.assessmentReason}
                        </div>
                      )}
                      {s.assessmentNotes && (
                        <div className="text-slate-600 dark:text-slate-300">
                          <strong>Hướng xử lý:</strong> {s.assessmentNotes}
                        </div>
                      )}
                      {!s.assessmentReason && !s.assessmentNotes && (
                        <div className="text-slate-500 dark:text-slate-400 italic">
                          Đủ điều kiện, hoàn tất quy trình uốn mi bóng tối chuẩn mực.
                        </div>
                      )}
                    </div>

                    {/* Cột 5: Nút Xem Ca Gốc */}
                    <div className="shrink-0 flex items-center gap-2">
                      {onOpenSessionFlow && (
                        <Button
                          size="small"
                          onClick={() => onOpenSessionFlow(s as PilotSession)}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-xl ${
                            isCase10
                              ? 'border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                          data-testid={`view-session-flow-${s.id}`}
                        >
                          <AppIcon icon={ExternalLink} size={12} />
                          <span>Xem ca gốc #{s.id}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5: TRẠNG THÁI THẨM ĐỊNH CHUYÊN MÔN (SIGN-OFF)
          ═══════════════════════════════════════════════════════════ */}
      <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AppIcon icon={ShieldAlert} size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                Trạng Thái Thẩm Định Chuyên Môn Trước Khi Ban Hành Toàn Hệ Thống
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
                Toàn bộ nội dung SOP Hạng mục 1 đang ở trạng thái{' '}
                <strong className="text-amber-600 dark:text-amber-400">CHỜ CÔ GIANG ĐÀM THẨM ĐỊNH</strong>
              </p>
            </div>
          </div>
          <span className="inline-flex items-center justify-center leading-none px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            Chờ Cô Giang Đàm Thẩm Định
          </span>
        </div>

        <div className="pt-2 border-t border-amber-500/20 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
          <div className="font-semibold text-slate-800 dark:text-slate-200">
            3 Điểm kỹ thuật đang chờ Cô Giang Đàm phê duyệt chính thức:
          </div>
          <ul className="m-0 p-0 list-none space-y-1">
            <li className="flex items-start gap-1.5">
              <AppIcon icon={Clock} size={13} className="text-amber-500 mt-0.5 shrink-0" />
              <span>
                <strong>1. Chuẩn hóa ngưỡng độ dài mi:</strong> Xác nhận chính thức ngưỡng tối thiểu 8.0mm hay 7.5mm theo từng dáng mắt mí lót/mí sụp.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <AppIcon icon={Clock} size={13} className="text-amber-500 mt-0.5 shrink-0" />
              <span>
                <strong>2. Thời gian an toàn giữa 2 lần uốn:</strong> Chốt quy định 4 tuần hay 6 tuần để bảo toàn lớp Keratin tự nhiên của khách hàng.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <AppIcon icon={Clock} size={13} className="text-amber-500 mt-0.5 shrink-0" />
              <span>
                <strong>3. Ma trận chọn trục silicon:</strong> Hướng dẫn định lượng chọn form trục S / M / L hoặc trục cá heo R3 theo độ dài mi và dáng mí mắt.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MODAL XEM ẢNH PHÓNG TO MINH CHỨNG THỰC TẾ
          ═══════════════════════════════════════════════════════════ */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewPhoto(null)}
          data-testid="sop-photo-modal"
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl space-y-3 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 m-0">
                  {previewPhoto.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
                  {previewPhoto.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 flex items-center justify-center font-bold text-xs"
                title="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black flex items-center justify-center max-h-[65vh]">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="max-h-[63vh] w-auto object-contain"
              />
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400">
                Minh chứng thực tế chi nhánh Đề Thám · Uốn Mi Bóng Tối Pilot
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const critNameList = [
  { id: 1, short: 'Độ dài' },
  { id: 2, short: 'Độ dày' },
  { id: 3, short: 'Mật độ' },
  { id: 4, short: 'Tình trạng' },
  { id: 5, short: 'Tạo form' },
];

export default PilotCriteriaSopDetail;
