import type { PilotSopStepDetail } from './pilot-material-sop.types.js';

export const DARK_LASHES_SOP_7_STEPS_DETAILED: PilotSopStepDetail[] = [
  {
    stepOrder: 1,
    name: 'Kiểm tra & làm sạch mi',
    targetMinutes: 5,
    purpose:
      'Đánh giá chất mi, độ khỏe nang lông và loại bỏ 100% bã nhờn, dầu thừa, mỹ phẩm dư thừa để hoạt chất uốn thẩm thấu đồng đều tuyệt đối.',
    instructions: [
      'Chuyên Viên Kỹ Thuật soi cấu trúc sợi mi bằng kính lúp/đèn chuyên dụng, xác định độ dày và phân loại (mi mảnh, trung bình, mi sợi dày cứng).',
      'Sử dụng bọt vệ sinh mi chuyên dụng (Lash Foam Cleanser), dùng cọ lông mịn chải nhẹ nhàng theo chiều mọc của sợi mi từ gốc ra ngọn.',
      'Dùng tăm bông ẩm thấm nước muối sinh lý 0.9% rửa sạch bọt xà phòng, dùng khăn bông không bụi dặm khô ráo hoàn toàn.',
      'Dán miếng Eye Pad Gel cách chân mi dưới 0.5 - 1mm để cách ly toàn bộ mi dưới, ngăn thuốc dính vào niêm mạc.',
      'Sử dụng giấy giữ mi con dán cố định các sợi mi con mảnh khó kiểm soát.',
    ],
    materials: [
      {
        name: 'Dụng cụ vệ sinh mi',
        unit: 'bộ',
        estimatedAmount: '1 bộ',
        purposeNote: 'Cọ bọt và khay đựng dụng cụ vô trùng',
      },
      {
        name: 'Eye Pad Gel (Miếng dán mi dưới)',
        unit: 'cặp',
        estimatedAmount: '1 cặp',
        purposeNote: 'Cách ly mi dưới, bảo vệ vùng da mắt',
        isDisposable: true,
      },
      {
        name: 'Giấy giữ mi con',
        unit: 'miếng',
        estimatedAmount: '2 miếng',
        purposeNote: 'Cố định mi con khó kiểm soát',
        isDisposable: true,
      },
      {
        name: 'Nước muối sinh lý 0.9%',
        unit: 'chai',
        estimatedAmount: '5 - 10 ml',
        purposeNote: 'Lau sạch bọt vệ sinh và làm dịu mắt',
        isDisposable: true,
      },
    ],
    qualityCheckpoints: [
      'Sợi mi hoàn toàn sạch dầu nhờn, ráo nước, tơi xốp, không bết dính mỹ phẩm.',
      'Miếng dán Eye Pad Gel ôm khít mi dưới, cách bờ mi 0.5 - 1mm, không cấn vào giác mạc khi khách nhắm mắt.',
      'Đã hoàn tất phân loại chất mi để chuẩn bị căn chỉnh thời gian làm mềm ở bước tiếp theo.',
    ],
    commonErrors: [
      {
        error: 'Mi còn đọng dầu hoặc bọt tẩy trang',
        cause: 'Rửa chưa kỹ bằng nước muối sinh lý hoặc chưa lau khô ráo hoàn toàn.',
        remedy: 'Dùng tăm bông ẩm lau lại lần 2 và sấy quạt nhẹ 30 giây cho mi khô ráo tuyệt đối trước khi dán trục.',
      },
      {
        error: 'Dán Eye Pad quá sát bờ mi dưới gây cộm mắt',
        cause: 'Canh chỉnh vị trí miếng dán chưa chuẩn khi khách mở mắt.',
        remedy:
          'Tháo nhẹ miếng Eye Pad Gel, dán lùi xuống cách bờ mi dưới 1mm và yêu cầu khách nhắm mở kiểm tra độ êm.',
      },
    ],
    unverifiedNotice: 'Chờ Cô Giang Đàm xác nhận định lượng bọt chuyên dụng và quy chuẩn nồng độ khử dầu tối ưu',
  },
  {
    stepOrder: 2,
    name: 'Làm mềm',
    targetMinutes: 15,
    purpose:
      'Mở biểu bì sợi mi và phá vỡ có kiểm soát các liên kết disunfua (S-S), đưa sợi mi về trạng thái mềm dẻo để sẵn sàng uốn theo đường cong của trục silicon.',
    instructions: [
      'Chọn trục silicon nâng mi phù hợp với độ dài mi của khách (Size S cho mi ngắn 6-7mm, Size M cho mi 8-10mm, Size L cho mi dài >10mm).',
      'Cố định trục silicon sát chân mí trên bằng sáp bắt mi không cồn (Lash Balm Glue).',
      'Dùng cây chải mi kim loại gạt từng sợi mi miết thẳng 90 độ ôm khít vào bề mặt trục silicon, đảm bảo không sợi mi nào bị chéo gốc.',
      'Dùng micro-brush lấy Thuốc uốn số 1 (Perming Cream) quét đều lên 2/3 thân mi, cách chân mi 1 - 1.5mm. TUYỆT ĐỐI không quét vào ngọn mi mỏng.',
      'Phủ màng bọc nilong mỏng cố định nhiệt độ ủ. Bắt đầu bấm đồng hồ đếm ngược.',
      'Kiểm tra độ mềm sợi mi sau mỗi 3 - 5 phút bằng que gạt kiểm tra đàn hồi.',
    ],
    materials: [
      {
        name: 'Thuốc uốn số 1 (Perming Cream)',
        unit: 'ml',
        estimatedAmount: '0.5 - 0.8 ml',
        purposeNote: 'Phá vỡ liên kết disunfua làm mềm sợi mi',
      },
      {
        name: 'Miếng silicon nâng mi (Silicon Pads)',
        unit: 'cặp',
        estimatedAmount: '1 cặp',
        purposeNote: 'Tạo phom nền độ cong chuẩn',
        isDisposable: false,
      },
      {
        name: 'Sáp bắt mi không cồn (Lash Balm Glue)',
        unit: 'g',
        estimatedAmount: '0.3 - 0.5 g',
        purposeNote: 'Cố định trục và bắt dính sợi mi lên trục',
      },
      {
        name: 'Cây chải mi kim loại',
        unit: 'cây',
        estimatedAmount: '1 cây',
        purposeNote: 'Chải gạt mi thẳng góc 90 độ lên trục',
        isDisposable: false,
      },
      {
        name: 'Màng bọc ủ mi chuyên dụng',
        unit: 'miếng',
        estimatedAmount: '2 miếng',
        purposeNote: 'Giữ nhiệt và định hình trong thời gian ủ',
        isDisposable: true,
      },
    ],
    qualityCheckpoints: [
      '100% sợi mi bám dính thẳng tắp trên trục silicon, không bị chéo gốc hoặc gãy góc.',
      'Thuốc uốn số 1 phủ đều 2/3 thân mi, cách gốc 1mm, không dính vào ngọn mi và không lem vào da mí mắt.',
      'Sợi mi đạt độ mềm dẻo lý tưởng (kiểm tra thấy sợi mi uốn cong nhẹ nhàng theo que gạt không bị kháng lực bật lại).',
    ],
    commonErrors: [
      {
        error: 'Ủ quá thời gian (Over-processing) làm quéo hoặc nhũn ngọn mi',
        cause: 'Không kiểm tra độ mềm định kỳ hoặc áp dụng thời gian mi cứng cho mi mảnh.',
        remedy:
          'Lập tức gạt sạch thuốc uốn số 1 bằng tăm bông khô, thoa dung dịch cân bằng pH và serum phục hồi Keratin cấp tốc.',
      },
      {
        error: 'Sợi mi bị bung hoặc chùng khỏi trục trong lúc ủ',
        cause: 'Lượng sáp bắt mi chưa đủ hoặc thao tác miết mi chưa chặt tay.',
        remedy: 'Chải gạt và cố định lại sợi mi ngay trong 2-3 phút đầu của quá trình làm mềm.',
      },
    ],
    unverifiedNotice: 'Thông số thời gian ủ chi tiết theo từng cấp độ chất mi chờ Cô Giang Đàm xác nhận',
  },
  {
    stepOrder: 3,
    name: 'Tạo form độ cong',
    targetMinutes: 15,
    purpose:
      'Tái lập và khóa chặt các liên kết disunfua mới quanh bề mặt cong của trục silicon, định hình vĩnh viễn độ cong nảy và sóng mi hoàn hảo.',
    instructions: [
      'Gạt thật sạch lớp Thuốc uốn số 1 bằng tăm bông khô từ chân mi hướng ra ngoài ngọn mi. Đảm bảo không còn tồn dư thuốc số 1.',
      'Kiểm tra lại độ bám dính và hướng sợi mi trên trục silicon, chải miết lại các sợi mi bị xê dịch.',
      'Dùng cọ sạch thoa đều Thuốc định hình số 2 (Setting Cream) lên vị trí tương ứng vừa làm mềm.',
      'Phủ màng bọc giữ ấm và bấm giờ theo dõi thời gian định hình.',
      'Quan sát mắt khách, đảm bảo khách nhắm mắt thư giãn, không cử động mí mắt làm lệch form mi.',
    ],
    materials: [
      {
        name: 'Thuốc định hình số 2 (Setting Cream)',
        unit: 'ml',
        estimatedAmount: '0.5 - 0.8 ml',
        purposeNote: 'Tái tạo liên kết disunfua khóa độ cong',
      },
      {
        name: 'Miếng silicon nâng mi (Silicon Pads)',
        unit: 'cặp',
        estimatedAmount: '1 cặp',
        purposeNote: 'Trục định hình đang sử dụng',
      },
      {
        name: 'Cây chải mi kim loại',
        unit: 'cây',
        estimatedAmount: '1 cây',
        purposeNote: 'Căn chỉnh độ căng sợi mi',
      },
      {
        name: 'Tăm bông khô chuyên dụng',
        unit: 'cây',
        estimatedAmount: '4 - 6 cây',
        purposeNote: 'Gạt sạch thuốc số 1',
        isDisposable: true,
      },
    ],
    qualityCheckpoints: [
      'Sợi mi giữ nguyên độ căng và form cong ôm sát bề mặt trục silicon.',
      'Không xảy ra hiện tượng phản ứng chéo giữa thuốc số 1 và thuốc số 2.',
      'Thời gian định hình tuân thủ đúng tỷ lệ quy định so với thời gian làm mềm.',
    ],
    commonErrors: [
      {
        error: 'Độ cong mi nhả sóng hoặc không đều giữa 2 mắt',
        cause: 'Gạt thuốc số 1 chưa sạch hoặc thời gian thuốc số 2 không đủ so với độ dày sợi mi.',
        remedy: 'Đảm bảo lau sạch khô thuốc số 1 và căn chuẩn đồng hồ bấm giờ riêng biệt cho từng bên mắt.',
      },
    ],
    unverifiedNotice: 'Tỷ lệ thời gian chuẩn giữa thuốc số 1 và số 2 chờ Cô Giang Đàm xác nhận',
  },
  {
    stepOrder: 4,
    name: 'Cân bằng pH',
    targetMinutes: 2,
    purpose:
      'Trung hòa lượng kiềm dư thừa từ thuốc uốn, đưa nồng độ pH của sợi mi từ môi trường kiềm về ngưỡng sinh lý tự nhiên (pH 5.5 - 6.0), đóng kín lớp biểu bì mi.',
    instructions: [
      'Dùng tăm bông khô gạt sạch toàn bộ Thuốc định hình số 2 trên trục silicon.',
      'Dùng micro-brush thấm đều Dung dịch cân bằng pH chuyên sâu vuốt nhẹ nhàng từ chân đến ngọn sợi mi.',
      'Để dung dịch đệm thẩm thấu và trung hòa trong 1 - 2 phút.',
      'Dùng que thử kềm pH (nếu cần kiểm tra) để xác nhận bề mặt sợi mi đã trở về trạng thái an toàn trước khi phủ màu.',
    ],
    materials: [
      {
        name: 'Kềm PH (Kiểm tra độ pH)',
        unit: 'lần',
        estimatedAmount: '1 lần',
        purposeNote: 'Kiểm tra độ trung hòa pH trên bề mặt mi',
      },
      {
        name: 'Dung dịch cân bằng pH trung hòa',
        unit: 'ml',
        estimatedAmount: '1 - 2 ml',
        purposeNote: 'Đóng biểu bì và đưa mi về pH 5.5 - 6.0',
      },
      {
        name: 'Tăm bông micro-applicator',
        unit: 'cây',
        estimatedAmount: '2 - 4 cây',
        purposeNote: 'Thấm dung dịch cân bằng',
        isDisposable: true,
      },
    ],
    qualityCheckpoints: [
      'Bề mặt sợi mi được trung hòa hoàn toàn kiềm, lớp biểu bì se khít, sợi mi đanh chắc.',
      'Khách hàng hoàn toàn dễ chịu, không cay mắt hoặc ngứa râm ran vùng chân mí.',
    ],
    commonErrors: [
      {
        error: 'Bỏ qua bước cân bằng pH khiến màu nhuộm bước 5 loang lổ',
        cause: 'Môi trường kiềm còn sót lại làm biến tính sắc tố màu nhuộm.',
        remedy: 'Bắt buộc thực hiện đủ bước cân bằng pH tối thiểu 1-2 phút trước khi chuyển sang bước nhuộm màu.',
      },
    ],
    unverifiedNotice: 'Dung tích định mức dung dịch đệm và ngưỡng pH tối ưu chờ Cô Giang Đàm xác nhận',
  },
  {
    stepOrder: 5,
    name: 'Màu',
    targetMinutes: 15,
    purpose:
      'Nhuộm phủ sắc tố đen sâu (Deep Black Lash Tint) vào biểu bì sợi mi, tạo hiệu ứng Uốn Mi Bóng Tối đặc trưng: sợi mi đen nhánh, dày dặn, bóng bẩy từ gốc đến ngọn.',
    instructions: [
      'Pha Thuốc nhuộm mi (Lash Tint - Black) cùng dung dịch kích hoạt theo tỷ lệ chuẩn 1:1 trong chén sứ pha màu.',
      'Dùng cọ quét màu chuyên dụng thoa đều hỗn hợp từ gốc mi ra ngọn mi đang nằm trên trục silicon.',
      'Phủ kín 100% diện tích các sợi mi, đặc biệt chú ý ngọn mi nhạt màu để tạo hiệu ứng đen tuyền đồng nhất.',
      'Ủ màu trong thời gian tiêu chuẩn từ 10 - 15 phút, quan sát độ ngấm sắc tố đen bóng.',
      'Sau thời gian ủ, dùng tăm bông ẩm gạt sạch toàn bộ hỗn hợp màu trên mi.',
    ],
    materials: [
      {
        name: 'Thuốc nhuộm mi (Lash Tint) (Black)',
        unit: 'ml',
        estimatedAmount: '0.3 - 0.5 ml',
        purposeNote: 'Sắc tố đen bóng tạo chiều sâu mi bóng tối',
      },
      {
        name: 'Dung dịch kích hoạt màu (Oxidant)',
        unit: 'ml',
        estimatedAmount: '0.3 - 0.5 ml',
        purposeNote: 'Kích hoạt hạt màu bám vào biểu bì mi',
      },
      {
        name: 'Chén pha màu & cọ quét chuyên dụng',
        unit: 'bộ',
        estimatedAmount: '1 bộ',
        purposeNote: 'Pha trộn hỗn hợp màu đồng nhất',
      },
      {
        name: 'Tăm bông ẩm vệ sinh màu',
        unit: 'cây',
        estimatedAmount: '4 - 6 cây',
        purposeNote: 'Gạt sạch màu sau ủ',
        isDisposable: true,
      },
    ],
    qualityCheckpoints: [
      'Toàn bộ sợi mi đen tuyền bóng mượt, không còn đoạn mi nâu hoặc ngọn mi vàng nhạt.',
      'Không lem màu ra vùng da mi mắt hoặc mí dưới.',
      'Mắt khách hoàn toàn không bị dính màu vào niêm mạc hay kết mạc.',
    ],
    commonErrors: [
      {
        error: 'Màu nhuộm lem vào da mí mắt hoặc kết mạc gây cay xót',
        cause: 'Quét thuốc nhuộm quá sát chân da hoặc khách cử động mí mắt.',
        remedy: 'Lập tức nhỏ nước muối sinh lý rửa sạch, dùng tăm bông ẩm lau sạch vùng da bị dính màu.',
      },
    ],
    unverifiedNotice: 'Tỷ lệ pha màu kích hoạt và mã màu đen bóng tối chờ Cô Giang Đàm xác nhận',
  },
  {
    stepOrder: 6,
    name: 'Dưỡng Keratin',
    targetMinutes: 2,
    purpose:
      'Thấm sâu hoạt chất Keratin thủy phân và collagen vào lõi sợi mi, phục hồi màng bảo vệ, tăng độ dày thân mi và khóa độ bóng mượt lâu dài.',
    instructions: [
      'Sau khi lau sạch màu nhuộm, dùng micro-brush lấy Keratin dưỡng mi / Serum dưỡng bóng mi thoa đều lên toàn bộ chiều dài sợi mi.',
      'Dùng cây chải mi chải nhẹ nhàng từ gốc lên ngọn để dưỡng chất bao phủ kín từng sợi mi.',
      'Giữ nguyên lớp dưỡng trong 2 - 3 phút để dưỡng chất thẩm thấu sâu vào cấu trúc sợi mi vừa mở.',
      'Không rửa lại với nước sau khi dưỡng Keratin.',
    ],
    materials: [
      {
        name: 'Keratin dưỡng mi',
        unit: 'ml',
        estimatedAmount: '0.2 - 0.3 ml',
        purposeNote: 'Phục hồi cấu trúc lõi mi và khóa dưỡng chất',
      },
      {
        name: 'Serum dưỡng bóng mi (Glossy Serum)',
        unit: 'ml',
        estimatedAmount: '0.2 ml',
        purposeNote: 'Tạo lớp màng bóng mượt đặc trưng của mi bóng tối',
      },
      {
        name: 'Cây chải mi nhựa',
        unit: 'cây',
        estimatedAmount: '1 cây',
        purposeNote: 'Chải đều serum dưỡng lên sợi mi',
        isDisposable: true,
      },
    ],
    qualityCheckpoints: [
      'Sợi mi bóng bẩy, óng ả, đàn hồi và dẻo dai rõ rệt.',
      'Sợi mi không bị bết dính thành cụm to mà tơi đều tự nhiên.',
    ],
    commonErrors: [
      {
        error: 'Lấy quá nhiều serum làm mi bết dính vón cục',
        cause: 'Định lượng serum chưa chuẩn.',
        remedy: 'Dùng cây chải mi khô chải tơi sợi mi và dặm nhẹ tăm bông thấm bớt lượng tinh chất dư thừa.',
      },
    ],
    unverifiedNotice: 'Định mức giọt serum và thương hiệu Keratin tiêu chuẩn chờ Cô Giang Đàm xác nhận',
  },
  {
    stepOrder: 7,
    name: 'Vệ sinh & hoàn thiện',
    targetMinutes: 5,
    purpose:
      'Tháo gỡ trục silicon nhẹ nhàng, vệ sinh sạch keo dính và tàn dư thuốc, chải tơi form mi hoàn chỉnh, chụp ảnh After nghiệm thu và tư vấn khách chăm sóc tại nhà.',
    instructions: [
      'Thấm tăm bông ướt làm mềm keo bắt mi, nhẹ nhàng tách trục silicon ra khỏi mi mắt từ ngoài vào trong.',
      'Vệ sinh sạch hoàn toàn keo bắt mi và tàn dư trên da mí mắt và bờ mi.',
      'Nhẹ nhàng tháo miếng dán Eye Pad Gel dưới mi dưới, lau sạch vùng bọng mắt.',
      'Dùng cây chải mi khô chải đều từng chùm mi cong vút tơi xốp.',
      'Chụp ảnh After 3 góc độ (chính diện, nghiêng 45 độ, nhắm mắt) lưu trữ hồ sơ ca dịch vụ.',
      'Mời khách hàng soi gương kiểm tra thành phẩm, hướng dẫn kiêng nước 6-12 tiếng đầu tiên và ghi nhận CSAT.',
    ],
    materials: [
      {
        name: 'Dụng cụ vệ sinh mi',
        unit: 'bộ',
        estimatedAmount: '1 bộ',
        purposeNote: 'Khăn cotton không bụi và tăm bông mềm',
      },
      {
        name: 'Cây chải mi nhựa',
        unit: 'cây',
        estimatedAmount: '1 cây',
        purposeNote: 'Chải tơi mi hoàn thiện tặng khách mang về',
        isDisposable: true,
      },
      {
        name: 'Nước muối sinh lý / Nước lau chuyên dụng',
        unit: 'ml',
        estimatedAmount: '5 ml',
        purposeNote: 'Lau sạch keo và tàn dư quanh mắt',
      },
    ],
    qualityCheckpoints: [
      'Vùng mắt khách hoàn toàn sạch sẽ, không đỏ rát, không đọng keo dính.',
      'Form mi cong đều tơi xốp, màu đen sâu bóng bẩy đồng nhất 2 bên mắt.',
      'Khách hàng hoàn toàn hài lòng (đánh giá CSAT đạt 5/5 sao).',
      'Đã chụp ảnh After rõ nét đủ chuẩn góc chụp lưu trữ hồ sơ mOS.',
    ],
    commonErrors: [
      {
        error: 'Giật tháo trục khi keo chưa tan làm rụng sợi mi của khách',
        cause: 'Thao tác vội vàng, không thấm đủ ẩm để làm mềm lớp sáp dán.',
        remedy: 'Bắt buộc thấm tăm bông ẩm lăn nhẹ nhàng cho keo tự bong trước khi nhấc trục silicon ra.',
      },
    ],
    unverifiedNotice: 'Bộ tài liệu hướng dẫn kiêng cữ sau ca dịch vụ tại nhà chờ Cô Giang Đàm xác nhận',
  },
];
