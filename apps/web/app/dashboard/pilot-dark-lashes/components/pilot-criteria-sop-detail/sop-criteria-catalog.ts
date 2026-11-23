import { Award, Eye, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import type { CriterionShortName, GlossaryTermItem, SopCriterionDetail } from './pilot-criteria-sop.types';

export const SOP_CRITERIA_LIST: SopCriterionDetail[] = [
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
        detail: 'Mi khách dài 8–9mm, ôm chuẩn trục cá heo R3, thuốc số 1 ủ 15 phút, kết quả uốn cong đẹp xuất sắc.',
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
        detail: 'Sợi mi đạt độ dày chuẩn, nhưng không đạt các tiêu chí độ dài, mật độ và tình trạng sợi mi.',
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
        detail: 'Mi bị trụi trống thưa nhiều chỗ, lộ rõ các hốc trống cung mi. Kết luận: FAIL tiêu chí Mật độ mi.',
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
        detail: 'Mi ngắn 9mm nhưng gốc mi nhiều và khỏe, độ phủ kín cung mắt, khách rất thích hiệu ứng tự nhiên.',
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
      description: 'Sợi mi chưa từng qua hóa chất gần đây, không có cặn keo cũ, bờ mi sạch sẽ, giác mạc trong sáng.',
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

export const TECHNICAL_GLOSSARY: GlossaryTermItem[] = [
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

export const CRIT_NAME_LIST: CriterionShortName[] = [
  { id: 1, short: 'Độ dài' },
  { id: 2, short: 'Độ dày' },
  { id: 3, short: 'Mật độ' },
  { id: 4, short: 'Tình trạng' },
  { id: 5, short: 'Tạo form' },
];
