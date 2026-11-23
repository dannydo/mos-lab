import type { QaChecklistTemplate } from '@mos-lab/shared';

// Initial Preset Template based on CSDL Nội Bộ specification
export const CV_PERSONAL_QA_TEMPLATE: QaChecklistTemplate = {
  id: 'tpl-cv-personal-grooming-station',
  code: 'CV.Personal.Grooming.Station.check',
  branchCode: 'ALL',
  branchName: 'Tất Cả Chi Nhánh',
  title: 'Kiểm Định Tác Phong & Phòng Nối Mi Cá Nhân CV',
  description:
    'Tiêu chuẩn kiểm định định kỳ tác phong diện mạo và phòng nối mi cá nhân của Chuyên Viên (CV / CVL / CVLL). Đạt chuẩn là điều kiện tiên quyết để được nâng cấp lộ trình nghề nghiệp.',
  updatedAt: new Date().toISOString(),
  sections: [
    {
      id: 'sec-cv-grooming',
      title: '1. Tác Phong & Diện Mạo Bản Thân (Personal Grooming & Uniform)',
      description: 'Quy chuẩn hình ảnh đại diện thương hiệu 5 sao của Chuyên Viên nối mi.',
      order: 1,
      items: [
        {
          id: 'cv-gro-01',
          code: 'CV.GRO.01',
          title: 'Giày đen nữ cao tối thiểu 3cm, không hoa văn',
          standardRequirement:
            'Mang giày bít mũi màu đen, gót cao tối thiểu 3cm, bề mặt trơn sạch sẽ, tuyệt đối không mang dép lê hay giày có họa tiết hoa văn sặc sỡ.',
          weight: 3,
          requirePhotoOnFail: true,
          isCritical: true,
        },
        {
          id: 'cv-gro-02',
          code: 'CV.GRO.02',
          title: 'Búi tóc lưới đen gọn gàng',
          standardRequirement:
            'Tóc búi cao gọn gàng trong lưới bọc tóc màu đen; không để tóc con xòa trước trán hay rũ xuống mắt khách hàng trong lúc thao tác mi.',
          weight: 3,
          requirePhotoOnFail: true,
          isCritical: true,
        },
        {
          id: 'cv-gro-03',
          code: 'CV.GRO.03',
          title: 'Đồng phục phẳng phiu & Đeo thẻ tên',
          standardRequirement:
            'Mặc đúng đồng phục thương hiệu đã ủi phẳng phiu, sạch sẽ không ố màu; đeo bảng tên ngay ngắn bên ngực trái.',
          weight: 3,
          requirePhotoOnFail: true,
          isCritical: true,
        },
        {
          id: 'cv-gro-04',
          code: 'CV.GRO.04',
          title: 'Vệ sinh tay & Móng tay cắt ngắn, không sơn lòe loẹt',
          standardRequirement:
            'Móng tay cắt ngắn sát viền ngón, vệ sinh sạch sẽ; không để móng dài hay sơn màu sặc sỡ, không đính đá gây cộm cấn khi thao tác cho khách.',
          weight: 3,
          requirePhotoOnFail: true,
          isCritical: true,
        },
        {
          id: 'cv-gro-05',
          code: 'CV.GRO.05',
          title: 'Đeo khẩu trang y tế chuẩn trong suốt ca làm',
          standardRequirement:
            'Khẩu trang sạch che kín từ sống mũi đến cằm trong toàn bộ quá trình tư vấn và nối mi cho khách.',
          weight: 3,
          requirePhotoOnFail: true,
          isCritical: true,
        },
        {
          id: 'cv-gro-06',
          code: 'CV.GRO.06',
          title: 'Son môi tươi tắn, thanh lịch',
          standardRequirement:
            'Thoa son môi màu tươi tắn tự nhiên (cam đất, hồng đào, đỏ nhẹ); không để môi nhợt nhạt hoặc khô nứt nẻ.',
          weight: 2,
          requirePhotoOnFail: false,
          isCritical: false,
        },
        {
          id: 'cv-gro-07',
          code: 'CV.GRO.07',
          title: 'Kẻ chân mày tự nhiên',
          standardRequirement:
            'Chân mày được cắt tỉa gọn gàng, kẻ đường nét tự nhiên, cân đối tạo diện mạo tươi sáng, chuyên nghiệp.',
          weight: 2,
          requirePhotoOnFail: false,
          isCritical: false,
        },
        {
          id: 'cv-gro-08',
          code: 'CV.GRO.08',
          title: 'Trang điểm nhẹ nhàng, gương mặt tươi sáng',
          standardRequirement:
            'Đánh nền mỏng nhẹ tự nhiên, tươi tắn, che khuyết điểm cơ bản; không để mặt mộc bơ phờ hoặc trang điểm quá đậm lệch tone thương hiệu.',
          weight: 2,
          requirePhotoOnFail: false,
          isCritical: false,
        },
      ],
    },
    {
      id: 'sec-cv-station',
      title: '2. Phòng Nối Mi & Giường Mi 5S Cá Nhân (Personal Lash Station)',
      description: 'Không gian giường nối mi và dụng cụ cá nhân của kỹ thuật viên phải đạt chuẩn 5S vô trùng.',
      order: 2,
      items: [
        {
          id: 'cv-sta-01',
          code: 'CV.STA.01',
          title: 'Ga giường & Gối nằm phẳng thơm, không sợi tóc/bụi',
          standardRequirement:
            'Trải ga giường căng phẳng, gối đặt ngay ngắn; tuyệt đối không dính sợi tóc rụng, sợi mi thừa hay vết keo bẩn.',
          weight: 3,
          requirePhotoOnFail: true,
          isCritical: true,
        },
        {
          id: 'cv-sta-02',
          code: 'CV.STA.02',
          title: 'Đèn nối mi sạch sẽ, không dính keo hay sợi mi',
          standardRequirement:
            'Thân đèn, chụp đèn và cần gập lau sạch bụi bẩn, không dính vệt keo khô hoặc bám sợi mi thừa.',
          weight: 3,
          requirePhotoOnFail: true,
          isCritical: true,
        },
        {
          id: 'cv-sta-03',
          code: 'CV.STA.03',
          title: 'Nhíp & Dụng cụ vô trùng trong khay inox chuẩn',
          standardRequirement:
            'Nhíp nối mi được sát khuẩn cồn y tế trước ca, đặt ngay ngắn trong khay inox sạch; đầu nhíp có nắp cao su bảo vệ an toàn.',
          weight: 4,
          requirePhotoOnFail: true,
          isCritical: true,
        },
        {
          id: 'cv-sta-04',
          code: 'CV.STA.04',
          title: 'Keo mi bảo quản hũ hút ẩm & Lau sạch cổ chai',
          standardRequirement:
            'Lọ keo mi đặt trong hũ hút ẩm có hạt silica gel; cổ chai và nắp keo được lau sạch bằng khăn không xơ, không đọng keo vón cục.',
          weight: 4,
          requirePhotoOnFail: true,
          isCritical: true,
        },
        {
          id: 'cv-sta-05',
          code: 'CV.STA.05',
          title: 'Gầm giường & Kệ dép không để túi xách/đồ cá nhân',
          standardRequirement:
            'Gầm giường và kệ để dép gọn gàng, thông thoáng; đồ dùng cá nhân, điện thoại, túi xách phải cất vào tủ locker cá nhân.',
          weight: 3,
          requirePhotoOnFail: true,
          isCritical: true,
        },
        {
          id: 'cv-sta-06',
          code: 'CV.STA.06',
          title: 'Rèm che phòng buộc ngay ngắn, đúng vị trí',
          standardRequirement:
            'Rèm ngăn cách buồng nối mi được thắt dây nơ ngay ngắn, ngay hàng thẳng lối, tạo không gian lịch sự, kín đáo.',
          weight: 2,
          requirePhotoOnFail: false,
          isCritical: false,
        },
        {
          id: 'cv-sta-07',
          code: 'CV.STA.07',
          title: 'Xe đẩy trolley ngăn nắp, không rác hay khăn dơ',
          standardRequirement:
            'Tầng 1 xe đẩy chỉ để dụng cụ đang làm; các tầng dưới xếp hộp mi gọn gàng; tuyệt đối không bỏ rác, ly nước dở hay khăn ướt dơ trên xe.',
          weight: 2,
          requirePhotoOnFail: false,
          isCritical: false,
        },
      ],
    },
  ],
};
