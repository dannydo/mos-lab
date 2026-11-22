import type { TelesaleTvPersonaKey, TelesaleTvQuoteEventType, TelesaleTvQuoteItem } from '@mos-lab/shared';

export const CRM_CONFIG_CELEBRATION_QUOTES_KEY = 'TELESALE_TV_CELEBRATION_QUOTES';

export function getDefaultCelebrationQuotes(): TelesaleTvQuoteItem[] {
  const defaultList: TelesaleTvQuoteItem[] = [];
  const now = '2026-10-24T00:00:00.000Z';

  const quotesMap: Record<string, Record<string, string[]>> = {
    MC_HOI_CHO: {
      BOOK: [
        'Vàooo! Không thể tin được, một pha chốt Book xé toang hàng phòng ngự từ [Tên]! Cả phòng vỡ òa rồi bà con ơi!',
        'Alo alo một hai ba bốn! [Tên] vừa nổ thêm một Book làm chấn động toàn bộ hội chợ Telesales! Đỉnh nóc kịch trần!',
        'Cháy quá [Tên] ơi! Em chốt đơn nhanh như chớp giật, bà con cô bác đứng xung quanh chỉ biết vỗ tay rần rần!',
        'Tin chấn động địa cầu! Một pha gài kèo lịch hẹn thần sầu của tuyển thủ [Tên], tỷ số hôm nay lại tăng lên!',
      ],
      CHECKIN: [
        'Bà con ơi dạt ra cho khách của [Tên] bước vào! Dẫn khách tới tiệm mượt mà như một đường chuyền bóng vàng!',
        'Check-in thành công rực rỡ! Khách của [Tên] đã cập bến an toàn, tiếng hò reo vang dội cả salon!',
        'Một hai ba dô! Khách của [Tên] đã ngồi vào ghế, chuẩn bị tận hưởng dịch vụ chuẩn năm sao đỉnh chóp!',
      ],
      COMBO: [
        'Siêu phẩm triệu đô xuất hiện! [Tên] vừa lập kỷ lục chốt trọn [Gói Combo] [Giá Combo], cúp vàng hôm nay trao cho em chứ ai!',
        'Khán giả ngỡ ngàng, đối thủ bật khóc! [Tên] vừa ẵm trọn [Gói Combo] [Giá Combo] trong một nốt nhạc, quá đẳng cấp!',
        'Bùng nổ pháo hoa chào đón gói [Gói Combo] [Giá Combo] của [Tên]! Một cú sút sấm sét không thể cản phá!',
      ],
      TIP: [
        'Ting ting ting! Khán đài mưa tiền thưởng, khách gửi tặng tiền tip [Tiền Tip] cho [Tên] và Chuyên Viên [Chuyên Viên]! Quá dữ dằn!',
        'Tiền tip về tay như mưa rào mùa hạ! [Tiền Tip] cho màn trình diễn đỉnh cao của [Tên] và Chuyên Viên [Chuyên Viên]!',
      ],
      DONE: [
        'Trận đấu khép lại với chiến thắng vang dội! [Tên] vừa hoàn tất thêm một ca Done mười điểm không có nhưng!',
        'Một pha cứu bàn thua trông thấy và chốt hạ ca Done xuất sắc của [Tên]! Cả phòng xin phép vỗ tay tán thưởng!',
      ],
    },
    DRAMA_QUEEN: {
      BOOK: [
        'Ủa alo [Tên]? Em tính thầu luôn cả cái Sài Gòn này hay gì mà khách vừa thở một cái là em đã chốt Book rồi?',
        'Trời đất coi kìa, người ta ngồi đợi khách mòn mỏi còn [Tên] thì nổ Book lia lịa! Định giật hết spotlight của phòng hả má?',
        'Ghê thật sự! Khách chưa kịp chuẩn bị tâm lý đã bị [Tên] dùng thuật thao túng tâm lý chốt luôn lịch hẹn! Nể em ghê á!',
        'Này [Tên], em chốt đơn bạo lực thế này thì ai làm lại em? Để cho người khác một con đường sống coi!',
      ],
      CHECKIN: [
        'Ủa khách tới rồi kìa! [Tên] cho khách uống bùa mê thuốc lú gì mà khách đội mưa phi tới đúng giờ dữ vậy trùi?',
        'Check-in cái rụp! Khách nghe lời [Tên] răm rắp như bị thôi miên, làm cả phòng nhìn mà phát thèm phát tức!',
        'Khách đã vào ghế tiệm Wings an toàn! Duyên dáng cỡ này thì khách nào thoát khỏi tay [Tên]!',
      ],
      COMBO: [
        'Ủa khách đi làm đẹp sương sương mà [Tên] dụ chốt luôn [Gói Combo] [Giá Combo]? Em không phải telesales, em là chúa tể chốt đơn!',
        'Trời ơi ví khách vừa rớt nước mắt chia tay tiền bạc vì sự ngọt ngào của [Tên]! Xuất sắc nhưng mà mặn mòi quá nha!',
        'Chốt [Gói Combo] [Giá Combo] nhẹ tênh như lông hồng! [Tên] làm ăn kiểu này tính mua nhà lầu trong tháng này đúng không?',
      ],
      TIP: [
        'Ủa khách tip [Tiền Tip] luôn hả má? Khách mê Chuyên Viên [Chuyên Viên] hay mê cái miệng dẻo quẹo của [Tên] mà hào phóng dữ vậy?',
        'Nhìn cái ví dày cộp tiền tip của [Tên] và Chuyên Viên [Chuyên Viên] mà con mắt bên phải giật giật, con mắt bên trái cay xè vì ghen tị!',
      ],
      DONE: [
        'Xong một ca Done êm ru bà rù! [Tên] chăm khách kỹ đến mức con muỗi bay qua cũng không lọt, nể phục sát đất!',
        'Khách làm xong ngắm gương cười tít mắt! [Tên] cứ lấy hết lời khen của thiên hạ thế này thì ai đọ lại!',
      ],
    },
    THAY_BOI: {
      BOOK: [
        'Quẻ này ứng rồi! Thầy vừa bấm độn thấy cung tài lộc của [Tên] phát sáng, quả nhiên nổ ngay một Book thơm phức!',
        'Thiện tai thiện tai! Vong ế đã tan, vía lộc đã tràn vào tiệm nhờ bàn tay vàng của đệ tử [Tên]!',
        'Thầy phán không sai một li! Giờ hoàng đạo vừa điểm là [Tên] lập tức kéo khách về chốt lịch rần rần!',
        'Hôm nay [Tên] được sao Bát Bạch chiếu mệnh, khách nghe giọng một phát là tự nguyện dâng lịch hẹn liền tay!',
      ],
      CHECKIN: [
        'Khách đã bước qua ngưỡng cửa thần tài! Vía may mắn của [Tên] đang độ cho cả salon hôm nay tiền vô như nước sông Đà!',
        'Đúng giờ lành tháng tốt, khách của [Tên] đã hạ cánh an toàn tại salon! Một điềm lành cho cả ngày đại thắng!',
      ],
      COMBO: [
        'Bát tự sinh tài! [Tên] vừa hóa giải túi tiền của khách, chốt trọn [Gói Combo] [Giá Combo] đại cát đại lợi!',
        'Thầy nhìn thấy một vầng hào quang tím rực rỡ quanh gói [Gói Combo] [Giá Combo] mà [Tên] vừa chốt! Tiền tài cuồn cuộn đổ về!',
      ],
      TIP: [
        'Khách phát tâm gieo duyên lộc lá [Tiền Tip] cho [Tên] và Chuyên Viên [Chuyên Viên]! Lộc trời ban thì xin hoan hỉ đón nhận!',
        'Thần Tài gõ cửa ban thưởng [Tiền Tip]! Sự ân cần và chân thành của [Tên] quả nhiên tích đức sinh tài!',
      ],
      DONE: ['Công đức viên mãn! Một ca Done tròn trịa như trăng rằm của [Tên], phước lộc tràn trề khắp chốn!'],
    },
    GEN_Z: {
      BOOK: [
        'Ủa ai bảo hôm nay trầm? Ra đây coi [Tên] flex nhẹ cái Book nè, quá dữ luôn trùi ui, slay quá má ơi!',
        'Chốt đơn hệ tâm linh không bằng [Tên] hệ thực lực! Một Book về tay, mười điểm không có nhưng!',
        'Em [Tên] vừa bật chế độ chốt đơn không lối thoát! Khách say yes trong một nốt nhạc, đỉnh nóc kịch trần luôn á!',
        'Overthinking làm chi khi chốt Book với [Tên] dễ như ăn kẹo! Keo lỳ tái châu luôn nha em gái!',
      ],
      CHECKIN: [
        'Khách yêu của [Tên] đã xuất hiện tại tiệm! Đúng là tín hiệu vũ trụ mách bảo đến tiệm Wings là đẹp liền!',
        'Check-in mượt mà như bơ lạt! [Tên] uy tín số một, khách phi tới tiệm nhanh hơn cả người yêu cũ trở mặt!',
      ],
      COMBO: [
        'Chấn động mạng xã hội! [Tên] vừa chốt đứt [Gói Combo] [Giá Combo], đỉnh chóp thực sự không flex không được!',
        'Bà dà [Tên] hôm nay slay dữ ta! [Gói Combo] [Giá Combo] bay màu trong một nốt nhạc, quá đỉnh luôn má ơi!',
      ],
      TIP: [
        'Ting ting khách thưởng nóng [Tiền Tip] cho [Tên] và Chuyên Viên [Chuyên Viên]! Tiền về tài khoản, năng lượng tràn trề quẩy banh nóc!',
        'Khách hào sảng tip hẳn [Tiền Tip]! Dịch vụ đỉnh nóc thế này thì khách flex ví là đúng bài rồi!',
      ],
      DONE: ['Done nhẹ một ca dịch vụ hoàn hảo! [Tên] gánh team còng cả lưng, mười điểm tuyệt đối!'],
    },
    TONG_TAI: {
      BOOK: [
        'Cứ mỗi lần [Tên] nổ Book là con tim anh lại đập loạn nhịp. Em tính làm anh xao xuyến đến bao giờ nữa đây?',
        'Phụ nữ quyến rũ nhất là khi chốt đơn lia lịa, và [Tên] hôm nay chính là người phụ nữ tỏa sáng nhất trong mắt anh!',
        'Cả thế giới này có thể từ chối anh, nhưng khách hàng thì tuyệt đối không thể cưỡng lại sự ngọt ngào của [Tên]!',
        'Thêm một Book hoàn hảo từ [Tên]. Em xuất sắc thế này làm anh chết lên chết xuống vì nể phục rồi đấy!',
      ],
      CHECKIN: [
        'Khách đã đến tiệm vì nụ cười của em. [Tên] ơi, sự ân cần của em chính là bảo vật quý giá nhất hôm nay!',
        'Dẫn lối cho khách nhẹ nhàng như một cơn gió thu. Phong thái của [Tên] đúng là làm say đắm lòng người!',
      ],
      COMBO: [
        'Siêu phẩm [Gói Combo] [Giá Combo] đã thuộc về em. Sự thông minh và khoa học của [Tên] làm anh mê đứ đừ!',
        'Khách chọn gói [Gói Combo] [Giá Combo] vì niềm tin trọn vẹn dành cho [Tên]. Đẳng cấp này chỉ có ở người phụ nữ của anh!',
      ],
      TIP: [
        'Món quà [Tiền Tip] từ khách là minh chứng cho trái tim tận tụy của [Tên] và Chuyên Viên [Chuyên Viên]. Anh rất tự hào về em!',
        'Khách thưởng [Tiền Tip] cho những nỗ lực tuyệt vời của [Tên]. Em xứng đáng nhận được tất cả sự yêu thương trên đời!',
      ],
      DONE: ['Một ca Done hoàn hảo từ A đến Z. Sự chu đáo của [Tên] hôm nay khiến anh không thể rời mắt!'],
    },
  };

  const streakQuotes: Record<string, string[]> = {
    MC_HOI_CHO: [
      'Cú đúp thần thánh! [Tên] lập cú đúp chốt đơn liên hoàn cước, đối thủ chỉ biết ôm đầu ngơ ngác!',
      'Không thể ngăn cản cỗ xe tăng [Tên]! Đơn nổ liên tọi, phong độ đỉnh nóc kịch trần rồi!',
    ],
    DRAMA_QUEEN: [
      'Nãy giờ ăn cơm chưa [Tên] mà nuốt máy chém vô bụng hay sao nổ đơn liên tục thế? Định dẹp tiệm người ta hả?',
      'Ủa rồi ai làm lại [Tên] nữa? Đơn nổ dồn dập thế này tính cướp hết chỉ tiêu của cả tháng luôn hay gì?',
    ],
    GEN_Z: ['Chuỗi nổ đơn bất tận của [Tên], ai cản em lại giùm cái, slay quá mức cho phép rồi!'],
    THAY_BOI: ['Vận khí bùng nổ, chuỗi lộc liên hoàn của [Tên] đã kích hoạt Long Mạch của phòng Telesales!'],
    TONG_TAI: [
      'Liên tiếp những kỳ tích mang tên [Tên]. Em định làm anh chết lên chết xuống vì ngưỡng mộ bao nhiêu lần nữa?',
    ],
  };

  const morningQuotes: Record<string, string[]> = {
    MC_HOI_CHO: ['Mở bát sáng sớm rực rỡ! [Tên] khai xuân nổ phát súng đầu tiên vang dội cả salon!'],
    THAY_BOI: ['Thầy nhìn vía mở hàng của [Tên] sáng rực, điềm báo ngày hôm nay cả phòng Telesales đếm tiền sái tay!'],
    DRAMA_QUEEN: [
      'Sáng sớm tinh mơ người ta còn ngái ngủ mà [Tên] đã lượm đơn ngọt xớt rồi, tính làm gương mẫu cho ai coi?',
    ],
    GEN_Z: ['Mở bát sáng sớm mượt mà như bơ lạt, [Tên] mở hàng vía chuẩn không cần chỉnh!'],
    TONG_TAI: ['Chào buổi sáng người phụ nữ năng lượng của anh. Mở hàng xuất sắc thế này thì ngày hôm nay rực rỡ rồi!'],
  };

  for (const [personaKey, events] of Object.entries(quotesMap)) {
    for (const [eventType, templates] of Object.entries(events)) {
      templates.forEach((tmpl, i) => {
        defaultList.push({
          id: `seed-${personaKey.toLowerCase()}-${eventType.toLowerCase()}-${i + 1}`,
          personaKey: personaKey as TelesaleTvPersonaKey,
          eventType: eventType as TelesaleTvQuoteEventType,
          template: tmpl,
          isActive: true,
          isCustom: false,
          createdAt: now,
          updatedAt: now,
        });
      });
    }
  }

  for (const [personaKey, templates] of Object.entries(streakQuotes)) {
    templates.forEach((tmpl, i) => {
      defaultList.push({
        id: `seed-${personaKey.toLowerCase()}-streak-${i + 1}`,
        personaKey: personaKey as TelesaleTvPersonaKey,
        eventType: 'STREAK',
        template: tmpl,
        isActive: true,
        isCustom: false,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  for (const [personaKey, templates] of Object.entries(morningQuotes)) {
    templates.forEach((tmpl, i) => {
      defaultList.push({
        id: `seed-${personaKey.toLowerCase()}-morning-${i + 1}`,
        personaKey: personaKey as TelesaleTvPersonaKey,
        eventType: 'MORNING',
        template: tmpl,
        isActive: true,
        isCustom: false,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  return defaultList;
}
