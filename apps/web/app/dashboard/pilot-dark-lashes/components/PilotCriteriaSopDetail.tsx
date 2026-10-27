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
  purpose: string;
  inspectionMethod: string;
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
  }[];
  expertConfirmationNote?: string;
}

const SOP_CRITERIA_LIST: SopCriterionDetail[] = [
  {
    id: 1,
    name: 'Độ dài mi',
    order: 1,
    icon: Sparkles,
    purpose: 'Đảm bảo sợi mi đủ chiều dài để bắt dính chắc chắn và ôm sát qua đỉnh uốn của trục silicon chuyên dụng.',
    inspectionMethod:
      'Dùng cữ thước đo mi chuyên dụng hoặc ướm thử mi vào cạnh trục silicon size S/M tại bàn tư vấn. Sợi mi cần vượt qua điểm cong đỉnh của trục ít nhất 2mm.',
    passStandard: {
      title: 'ĐẠT (PASS) – Chiều dài ≥ 8mm',
      description: 'Sợi mi thật có chiều dài từ 8mm đến 11mm, bám chắc và ôm trọn ít nhất 2/3 bề mặt trục silicon.',
      indicators: [
        'Chiều dài mi đo đạt từ 8mm trở lên',
        'Sợi mi vươn qua gờ đỉnh trục uốn tối thiểu 2mm',
        'Bề mặt tiếp xúc keo định hình rộng, không bị bật ngọn',
      ],
    },
    failStandard: {
      title: 'KHÔNG ĐẠT (FAIL) – Mi ngắn < 8mm',
      description: 'Mi quá ngắn hoặc bị cắt tỉa, chỉ dính được phần chân mi, nguy cơ tuột sợi và thuốc lem vào niêm mạc mắt.',
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
        detail: 'Mi quá ngắn không lên được trục uốn để uốn, không thể bắt ngọn vào cữ silicon. Kết luận: FAIL tiêu chí Độ dài mi.',
      },
      {
        type: 'FAIL',
        sessionId: 5,
        customerName: 'Khách Phương Thảo',
        date: '26/09/2026',
        detail: 'Mi ngắn dưới 8mm và thưa mỏng. Kết luận: FAIL tiêu chí Độ dài, chuyển hướng sang dịch vụ nối mi Hyper.',
      },
      {
        type: 'PASS',
        sessionId: 18,
        customerName: 'Khách Nguyệt',
        date: '27/10/2026',
        detail: 'Mi khách dài 8–9mm, ôm chuẩn trục cá heo R3, thuốc số 1 ủ 15 phút, kết quả uốn cong đẹp xuất sắc.',
      },
    ],
    expertConfirmationNote:
      'Ngưỡng dung sai chiều dài tối thiểu (7.5mm vs 8.0mm) theo từng dạng mắt mí lót: Chờ Cô Giang Đàm xác nhận.',
  },
  {
    id: 2,
    name: 'Độ dày sợi mi',
    order: 2,
    icon: Layers,
    purpose: 'Đánh giá độ chịu tải và khả năng thẩm thấu hoạt chất của lớp biểu bì Keratin để căn chỉnh thời gian ủ thuốc 1 & 2.',
    inspectionMethod:
      'Soi dưới đèn lúp kỹ thuật hoặc kính Macro 15x để phân loại sợi mi (mảnh < 0.05mm, vừa 0.07–0.10mm, thô dày > 0.12mm) và kiểm tra độ bóng biểu bì.',
    passStandard: {
      title: 'ĐẠT (PASS) – Sợi vừa đến dày, biểu bì nguyên bản',
      description: 'Sợi mi có lớp vảy keratin xếp đều, thân sợi chắc khỏe, chịu được phản ứng bẻ gãy liên kết disulfide.',
      indicators: [
        'Đường kính sợi 0.07mm – 0.12mm có độ bóng khỏe',
        'Sợi mi tơ mảnh (< 0.06mm) nhưng biểu bì nguyên bản vẫn đạt nếu giảm thời gian ủ',
        'Nang mi bám chắc, không rụng khi gạt nhẹ bằng que định hình',
      ],
    },
    failStandard: {
      title: 'KHÔNG ĐẠT (FAIL) – Sợi teo nhỏ, mất lõi hoặc giòn mục',
      description: 'Sợi mi quá mỏng yếu, teo tóp, xơ mủn do lạm dụng hóa chất liên tục hoặc nang lông suy kiệt.',
      indicators: [
        'Sợi mi mất lõi Keratin, mềm nhũn như sợi tơ rách',
        'Thân mi bị khô khốc, chẻ ngọn hoặc gãy gập thân sợi',
        'Không có khả năng chịu đựng dung dịch kiềm uốn mi',
      ],
    },
    pilotEvidences: [
      {
        type: 'PASS',
        sessionId: 11,
        customerName: 'Khách Yến Vy',
        date: '07/10/2026',
        detail: 'Sợi mi dày khỏe, biểu bì nguyên bản chắc chắn. Cần ủ thuốc số 1 đủ 15 phút mới đạt độ mềm tiêu chuẩn. CSAT 5 sao.',
      },
      {
        type: 'PASS',
        sessionId: 10,
        customerName: 'Khách Tâm',
        date: '05/10/2026',
        detail: 'Sợi mi đạt độ dày chuẩn, nhưng không đạt các tiêu chí độ dài, mật độ và tình trạng sợi mi.',
      },
    ],
    expertConfirmationNote:
      'Bảng định mức thời gian ủ thuốc số 1 theo thang đo đường kính biểu bì sợi: Chờ Cô Giang Đàm xác nhận.',
  },
  {
    id: 3,
    name: 'Mật độ mi',
    order: 3,
    icon: Eye,
    purpose: 'Bảo đảm hàng mi có độ phủ rợp bóng đồng đều khi uốn lên, không để lộ các hốc mắt trống hoặc mảng rụng.',
    inspectionMethod:
      'Quan sát trực diện và góc nghiêng 45 độ, đếm ước lượng số sợi mi và rà soát các khoảng trống trên toàn cung mắt.',
    passStandard: {
      title: 'ĐẠT (PASS) – Phân bổ đều, không trống lỗ hổng lớn',
      description: 'Mật độ tương đối đồng đều (≥ 60 sợi/mắt), không có khoảng trống rụng vượt quá 2.5mm.',
      indicators: [
        'Hàng mi phân bố liên tục từ đầu mắt đến đuôi mắt',
        'Khoảng trống giữa các cụm mi không quá 2mm',
        'Gốc mi nhiều, tạo được hiệu ứng bóng đen tự nhiên sau khi phủ dưỡng',
      ],
    },
    failStandard: {
      title: 'KHÔNG ĐẠT (FAIL) – Mi thưa rỗng, trống trụi từng mảng',
      description: 'Mi bị rụng thành từng mảng lớn do thói quen giật mi, rụng sau nối mi sai cách hoặc bệnh lý.',
      indicators: [
        'Xuất hiện mảng trống không có sợi mi dài trên 3mm',
        'Tổng số sợi mi dưới 40 sợi/mắt, mi thưa thớt',
        'Uốn lên làm lộ rõ khuyết điểm hốc mắt trống, mất thẩm mỹ',
      ],
    },
    pilotEvidences: [
      {
        type: 'FAIL',
        sessionId: 10,
        customerName: 'Khách Tâm',
        date: '05/10/2026',
        detail: 'Mi bị trụi trống thưa nhiều chỗ, lộ rõ các hốc trống cung mi. Kết luận: FAIL tiêu chí Mật độ mi.',
      },
      {
        type: 'PASS',
        sessionId: 9,
        customerName: 'Khách Linh',
        date: '09/10/2026',
        detail: 'Dù mi ngắn nhưng gốc khỏe và mi đủ nhiều, mật độ dày đồng đều uốn lên rất đậm nét. Khách đánh giá 5 sao.',
      },
      {
        type: 'PASS',
        sessionId: 12,
        customerName: 'Khách Thảo',
        date: '10/10/2026',
        detail: 'Mi ngắn 9mm nhưng gốc mi nhiều và khỏe, độ phủ kín cung mắt, khách rất thích hiệu ứng tự nhiên.',
      },
    ],
    expertConfirmationNote:
      'Quy chuẩn kích thước khoảng trống tối đa cho phép trên cung mắt (2mm hay 3mm): Chờ Cô Giang Đàm xác nhận.',
  },
  {
    id: 4,
    name: 'Tình trạng sợi mi',
    order: 4,
    icon: ShieldCheck,
    purpose: 'Kiểm tra sức khỏe tế bào mi, tiền sử can thiệp hóa chất và loại trừ nguy cơ viêm nhiễm giác mạc bờ mi.',
    inspectionMethod:
      'Hỏi tiền sử uốn/nối mi trong 4–6 tuần gần nhất, dùng nhíp kiểm tra độ đàn hồi, kiểm tra chân mi và niêm mạc bờ mi.',
    passStandard: {
      title: 'ĐẠT (PASS) – Mi nguyên bản hoặc phục hồi hoàn toàn',
      description: 'Sợi mi chưa từng qua hóa chất gần đây, không có cặn keo cũ, bờ mi sạch sẽ, giác mạc trong sáng.',
      indicators: [
        'Không uốn mi trong vòng 6 tuần gần nhất',
        'Bờ mi không có cặn gàu viêm mi (Demodex), không sưng đỏ',
        'Thân mi trơn láng, có độ đàn hồi tốt khi kéo căng nhẹ',
      ],
    },
    failStandard: {
      title: 'KHÔNG ĐẠT (FAIL) – Mi cháy ngọn, biến dạng hoặc bờ mi kích ứng',
      description: 'Mi bị sun xoăn tít do hóa chất trước đó, nang lông mi yếu dễ rụng hoặc mắt đang viêm mí.',
      indicators: [
        'Đầu sợi mi bị sun cháy gập khúc do thuốc uốn cũ',
        'Nang mi đỏ rát hoặc mắt bị xung huyết giác mạc',
        'Mi đang trong đợt rụng cấp tính hoặc rụng sau điều trị',
      ],
    },
    pilotEvidences: [
      {
        type: 'FAIL',
        sessionId: 10,
        customerName: 'Khách Tâm',
        date: '05/10/2026',
        detail: 'Mi bị tổn thương, chân nang suy yếu, không đủ sức khỏe để tiếp xúc dung dịch uốn. Kết luận: FAIL tiêu chí Tình trạng sợi mi.',
      },
      {
        type: 'PASS',
        sessionId: 1,
        customerName: 'Khách Sinh Nguyên',
        date: '23/09/2026',
        detail: 'Sợi mi nguyên bản khỏe mạnh, lớp vảy Keratin xếp đều, chưa từng tổn thương hóa chất. Kết quả PASS tuyệt đối.',
      },
    ],
    expertConfirmationNote:
      'Thời gian khuyến nghị nghỉ dưỡng giữa 2 lần uốn liên tiếp (4 tuần hay 6 tuần): Chờ Cô Giang Đàm xác nhận.',
  },
  {
    id: 5,
    name: 'Khả năng tạo form',
    order: 5,
    icon: Award,
    purpose: 'Đánh giá tương quan giữa dáng mí mắt, hướng mọc tự nhiên của sợi mi và khả năng giữ nếp cong sau khi uốn.',
    inspectionMethod:
      'Nâng thử hàng mi góc 90 độ khi khách mở mắt tự nhiên. Đánh giá độ đè của nếp mí (mí sụp, mí lót, mắt sâu, mắt lồi) lên chân mi.',
    passStandard: {
      title: 'ĐẠT (PASS) – Tạo form thoáng mí, cong tự nhiên',
      description: 'Mi có thể kéo căng 90 độ lên trục uốn, khi mở mắt sợi mi thoát khỏi nếp mí, không bị đè bẹp.',
      indicators: [
        'Sợi mi mềm dẻo ôm khít đường cong trục silicon',
        'Nếp mí mắt khi mở không đè cụp ngọn mi xuống',
        'Đạt độ cong mong muốn (Cong tự nhiên M hoặc Cong bật cá heo R3)',
      ],
    },
    failStandard: {
      title: 'KHÔNG ĐẠT (FAIL) – Mí đè gập hoặc mi quặp ngược',
      description: 'Mí mắt quá dày mỡ đè bẹp chân mi, hướng mi mọc quặp sâu vào giác mạc không thể cố định lên trục.',
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
        detail: 'Không thể lên trục uốn để định hình form mi cong do mi quá ngắn và đứt gãy. Kết luận: FAIL tiêu chí Khả năng tạo form.',
      },
      {
        type: 'PASS',
        sessionId: 6,
        customerName: 'Khách Hương',
        date: '29/09/2026',
        detail: 'Dáng mi ôm form trục cong M rất tự nhiên, khách rất ưng ý. CSAT 5 sao.',
      },
      {
        type: 'PASS',
        sessionId: 18,
        customerName: 'Khách Nguyệt',
        date: '27/10/2026',
        detail: 'Sử dụng trục cá heo R3 tạo form vút bay ấn tượng, khách thích và đánh giá 5 sao.',
      },
    ],
    expertConfirmationNote:
      'Ma trận tra cứu trục silicon theo từng dáng mí mắt đặc thù (mí sụp, mí lót, mắt lồi): Chờ Cô Giang Đàm xác nhận.',
  },
];

// Fallback pilot sessions for evidence table if sessions prop is empty
const DEFAULT_PILOT_SESSIONS: Partial<PilotSession>[] = [
  {
    id: 10,
    sessionDate: '2026-10-05',
    customerName: 'Khách Tâm',
    customerPhone: '098***',
    technicianName: 'Cô Đẫm',
    status: 'INELIGIBLE',
    assessmentStatus: 'FAIL',
    assessmentReason: 'Mi quá ngắn không lên được trục uốn để uốn. Mi bị trụi trống thưa nhiều chỗ.',
    assessmentNotes: 'Hiện khách muốn về dưỡng mi chứ không muốn nối nữa. Dưỡng 1-2 tuần rồi khách sẽ quay lại để kiểm tra sức khỏe uốn mi tiếp',
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: false },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: false },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: false },
      { criterionId: 5, name: 'Khả năng tạo form', passed: false },
    ],
    csatScore: null,
  },
  {
    id: 5,
    sessionDate: '2026-09-26',
    customerName: 'Phương Thảo',
    customerPhone: '091***',
    technicianName: 'Cô Đẫm',
    status: 'INELIGIBLE',
    assessmentStatus: 'FAIL',
    assessmentReason: 'Mi ngắn dưới 8mm và mi thưa mỏng',
    assessmentNotes: 'Chuyển qua nối mi hyper có độ che phủ',
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: false },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: false },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: false },
    ],
    csatScore: null,
  },
  {
    id: 7,
    sessionDate: '2026-10-02',
    customerName: 'Vân Anh',
    customerPhone: '090***',
    technicianName: 'Cô Đẫm',
    status: 'INELIGIBLE',
    assessmentStatus: 'FAIL',
    assessmentReason: 'Khách đủ điều kiện mi thật khỏe và độ dài là 9-10. Nhưng khách muốn nối lại mi chồn như trước đây',
    assessmentNotes: 'Khách đủ điều kiện mi thật khỏe và độ dài là 9-10. Nhưng khách muốn nối lại mi chồn như trước đây. Chuyển qua nối mi',
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
    csatScore: null,
  },
  {
    id: 1,
    sessionDate: '2026-09-23',
    customerName: 'Sinh Nguyên',
    customerPhone: '085***',
    technicianName: 'Cô Đẫm',
    status: 'BEFORE_PHOTO',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Biểu bì keratin nguyên bản, nang mi khỏe đạt chuẩn',
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
    csatScore: 5,
  },
  {
    id: 6,
    sessionDate: '2026-09-29',
    customerName: 'Hương',
    customerPhone: '097***',
    technicianName: 'Cô Đẫm',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Độ cong vừa phải, form trục cong M khách rất ưng ý',
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
    csatScore: 5,
  },
  {
    id: 9,
    sessionDate: '2026-10-09',
    customerName: 'Linh',
    customerPhone: '098***',
    technicianName: 'Cô Đẫm',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Mi ngắn nhưng gốc khỏe và mi đủ nhiều để uốn. Khách rất thích',
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
    csatScore: 5,
  },
  {
    id: 11,
    sessionDate: '2026-10-07',
    customerName: 'Yến Vy',
    customerPhone: '093***',
    technicianName: 'Cô Đẫm',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Mi khỏe, thuốc số 1 ủ 15 phút mới đạt độ mềm. Dùng độ cong M',
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
    csatScore: 5,
  },
  {
    id: 12,
    sessionDate: '2026-10-10',
    customerName: 'Thảo',
    customerPhone: '096***',
    technicianName: 'Cô Đẫm',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Mi ngắn 9mm nhưng gốc nhiều và khỏe. Uốn lên rất đẹp',
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
    csatScore: 5,
  },
  {
    id: 18,
    sessionDate: '2026-10-27',
    customerName: 'Nguyệt',
    customerPhone: '090***',
    technicianName: 'Cô Đẫm',
    status: 'CHECKED_OUT',
    assessmentStatus: 'PASS',
    assessmentReason: null,
    assessmentNotes: 'Mi dài 8-9mm, gốc khỏe thuốc 1 ủ 15 phút, trục cá heo R3',
    assessmentCriteria: [
      { criterionId: 1, name: 'Độ dài mi', passed: true },
      { criterionId: 2, name: 'Độ dày sợi mi', passed: true },
      { criterionId: 3, name: 'Mật độ mi', passed: true },
      { criterionId: 4, name: 'Tình trạng sợi mi', passed: true },
      { criterionId: 5, name: 'Khả năng tạo form', passed: true },
    ],
    csatScore: 5,
  },
];

export function PilotCriteriaSopDetail({
  onBack,
  onOpenCriteriaModal,
  onOpenSopModal,
  sessions,
  onOpenSessionFlow,
}: PilotCriteriaSopDetailProps) {
  const [evidenceFilter, setEvidenceFilter] = useState<'ALL' | 'FAIL' | 'PASS'>('ALL');

  // Merge live sessions from props or fallback
  const displaySessions = useMemo(() => {
    if (sessions && sessions.length > 0) {
      // Prioritize sessions that have assessment data or are case studies
      const evaluated = sessions.filter(
        (s) => s.assessmentStatus || s.status === 'INELIGIBLE' || s.id === 10 || s.id === 5 || s.id === 7
      );
      if (evaluated.length >= 3) return evaluated;
      return sessions;
    }
    return DEFAULT_PILOT_SESSIONS as PilotSession[];
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (evidenceFilter === 'FAIL') {
      return displaySessions.filter((s) => s.assessmentStatus === 'FAIL' || s.status === 'INELIGIBLE');
    }
    if (evidenceFilter === 'PASS') {
      return displaySessions.filter((s) => s.assessmentStatus === 'PASS');
    }
    return displaySessions;
  }, [displaySessions, evidenceFilter]);

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
              Định lượng tỷ lệ PASS/FAIL thực tế (83.3% Đạt) và quy trình chuyển đổi dịch vụ linh hoạt.
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2: CHECKLIST 5 TIÊU CHÍ ĐÁNH GIÁ (CÔ GIANG ĐÀM)
          ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Khung Thẩm Định Kỹ Thuật
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
              Checklist 5 Tiêu Chí Đánh Giá Chuyên Môn (Do Cô Giang Đàm Xây Dựng)
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
            Bắt buộc đạt 5/5 tiêu chí để thực hiện Uốn Mi Bóng Tối
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {SOP_CRITERIA_LIST.map((crit) => {
            const IconComp = crit.icon;
            return (
              <Card
                key={crit.id}
                variant="outlined"
                className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:shadow-sm"
              >
                <div className="space-y-4">
                  {/* Tiêu đề tiêu chí & Mục đích */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold text-sm">
                        {crit.order}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 m-0">
                            Tiêu chí {crit.order}: {crit.name}
                          </h3>
                          <span className="inline-flex items-center justify-center leading-none text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            Checklist Bước 3
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
                          <strong>Mục đích kỹ thuật:</strong> {crit.purpose}
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-300 sm:max-w-md shrink-0">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        <AppIcon icon={Eye} size={13} className="text-teal-500" />
                        <span>Phương pháp kiểm tra:</span>
                      </div>
                      <p className="m-0 text-[11.5px] leading-relaxed">{crit.inspectionMethod}</p>
                    </div>
                  </div>

                  {/* So sánh PASS vs FAIL */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Cột ĐẠT (PASS) */}
                    <div className="p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        <AppIcon icon={CheckCircle2} size={15} className="text-emerald-500 shrink-0" />
                        <span>{crit.passStandard.title}</span>
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
                    <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                        <AppIcon icon={XCircle} size={15} className="text-rose-500 shrink-0" />
                        <span>{crit.failStandard.title}</span>
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

                  {/* Minh chứng thực tế từ Pilot */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Minh chứng ca Pilot thực tế:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {crit.pilotEvidences.map((ev, idx) => {
                        const isFail = ev.type === 'FAIL';
                        return (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                              isFail
                                ? 'bg-rose-500/5 dark:bg-rose-950/10 border-rose-500/20 text-rose-900 dark:text-rose-200'
                                : 'bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold flex items-center gap-1">
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
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 m-0 leading-tight">
                              {ev.detail}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ghi chú chờ thẩm định */}
                  {crit.expertConfirmationNote && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                      <AppIcon icon={AlertTriangle} size={13} className="shrink-0" />
                      <span>{crit.expertConfirmationNote}</span>
                    </div>
                  )}
                </div>
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
      <div className="space-y-3" data-testid="sop-evidence-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Bằng Chứng Thực Nghiệm
              </span>
              <span className="inline-flex items-center justify-center leading-none text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums">
                {filteredSessions.length} ca hiển thị
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
              Bảng Minh Chứng Thực Tế 17 Ca Pilot (Liên Kết Ca Gốc)
            </h2>
          </div>

          {/* Bộ lọc filter */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shrink-0">
            <button
              type="button"
              onClick={() => setEvidenceFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                evidenceFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Tất cả ({displaySessions.length})
            </button>
            <button
              type="button"
              onClick={() => setEvidenceFilter('FAIL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                evidenceFilter === 'FAIL'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              }`}
            >
              Chỉ ca FAIL
            </button>
            <button
              type="button"
              onClick={() => setEvidenceFilter('PASS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                evidenceFilter === 'PASS'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
            >
              Chỉ ca PASS
            </button>
          </div>
        </div>

        {/* Danh sách các ca minh chứng */}
        <div className="space-y-2.5">
          {filteredSessions.map((s) => {
            const isFail = s.assessmentStatus === 'FAIL' || s.status === 'INELIGIBLE';
            const isCase10 = s.id === 10;
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
                  <div className="space-y-1.5 min-w-[240px]">
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
                        {isFail ? 'FAIL · INELIGIBLE' : 'PASS · ĐỦ ĐIỀU KIỆN'}
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

                  {/* Cột 2: Checklist 5 tiêu chí */}
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

                  {/* Cột 3: Lý do & Hướng xử lý */}
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

                  {/* Cột 4: Nút Xem Ca Gốc */}
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
