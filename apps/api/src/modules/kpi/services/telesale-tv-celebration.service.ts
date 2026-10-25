import { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  TelesaleTvQuoteItem,
  TelesaleTvQuotesConfig,
  TelesaleTvQuotesOverviewResponse,
  TelesaleTvQuoteEventType,
  TelesaleTvPersonaKey,
  TelesaleTvPersonaDto,
  TelesaleTvEdginessLevel,
  TelesaleTvEventLog,
  TelesaleTvJournalOverview,
  TelesaleStaffTarget,
  SafeAny,
} from '@mos-lab/shared';
import {
  parseVietnamDateToIso,
  formatVietnamTime,
  TelesaleTargetConfigService,
} from './telesale-target-config.service.js';

export class TelesaleTvCelebrationService {
  static formatCurrencyForSpeech(amount?: number | null): string {
    if (!amount || amount <= 0) return '';
    const num = Math.round(Number(amount));
    if (num >= 1_000_000) {
      const millions = Math.floor(num / 1_000_000);
      const remainder = num % 1_000_000;
      const thousands = Math.round(remainder / 1000);
      if (thousands > 0) {
        return `${millions} triệu ${thousands} nghìn đồng`;
      }
      return `${millions} triệu đồng`;
    }
    if (num >= 1000) {
      const thousands = Math.round(num / 1000);
      return `${thousands} nghìn đồng`;
    }
    return `${num} đồng`;
  }

  // 5 Distinct Personas for TV Live Celebration
  static readonly TV_CELEBRATION_PERSONAS: Record<string, TelesaleTvPersonaDto> = {
    MC_HOI_CHO: {
      key: 'MC_HOI_CHO',
      name: 'MC Hội Chợ / BLV',
      badge: '🎪 MC HỘI CHỢ GÀO THÉT',
      icon: '🎪',
      voice: 'vi-VN-NamMinhNeural',
      rate: '+15%',
      pitch: '+6Hz',
      sfxType: 'vuvuzela_cheer',
      tagline: 'Gào thét cuồng nhiệt, nhịp độ dồn dập, ăn mừng rần rần như chung kết World Cup',
    },
    DRAMA_QUEEN: {
      key: 'DRAMA_QUEEN',
      name: 'Cụ Tổ Drama',
      badge: '🎭 CỤ TỔ DRAMA XÉO XẮT',
      icon: '🎭',
      voice: 'vi-VN-HoaiMyNeural',
      rate: '+6%',
      pitch: '+14Hz',
      sfxType: 'drama_stinger',
      tagline: 'Đanh đá the thé, châm chọc sâu cay, mỉa mai lầy lội không trượt phát nào',
    },
    THAY_BOI: {
      key: 'THAY_BOI',
      name: 'Thầy Bói Phán Số',
      badge: '🔮 THẦY BÓI PHÁN SỐ',
      icon: '🔮',
      voice: 'vi-VN-NamMinhNeural',
      rate: '-8%',
      pitch: '-8Hz',
      sfxType: 'temple_bell',
      tagline: 'Trầm ma mị, bấm độn tâm linh, phán cung tài lộc nổ đùng đùng',
    },
    GEN_Z: {
      key: 'GEN_Z',
      name: 'Gen Z Chúa Tể Meme',
      badge: '📱 GEN Z CHÚA TỂ MEME',
      icon: '📱',
      voice: 'vi-VN-HoaiMyNeural',
      rate: '+10%',
      pitch: '+4Hz',
      sfxType: 'pop_ting',
      tagline: 'Tươi tắn, flex nhẹ, slay quá bà dà, 10 điểm không có nhưng, hot trend TikTok',
    },
    TONG_TAI: {
      key: 'TONG_TAI',
      name: 'Tổng Tài Sến Sẩm',
      badge: '🕶️ TỔNG TÀI SẾN SẨM',
      icon: '🕶️',
      voice: 'vi-VN-NamMinhNeural',
      rate: '+0%',
      pitch: '-4Hz',
      sfxType: 'smooth_sax',
      tagline: 'Trầm ấm quyến rũ, thả thính sến rện, con tim tan chảy',
    },
  };

  static readonly CRM_CONFIG_CELEBRATION_QUOTES_KEY = 'TELESALE_TV_CELEBRATION_QUOTES';
  private static recentQuotesHistory: string[] = [];
  private static lastChosenPersonaKey = '';
  private static cachedQuotesConfig: TelesaleTvQuotesConfig | null = null;
  private static lastQuotesCacheTime = 0;

  static getDefaultCelebrationQuotes(): TelesaleTvQuoteItem[] {
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
      THAY_BOI: [
        'Thầy nhìn vía mở hàng của [Tên] sáng rực, điềm báo ngày hôm nay cả phòng Telesales đếm tiền sái tay!',
      ],
      DRAMA_QUEEN: [
        'Sáng sớm tinh mơ người ta còn ngái ngủ mà [Tên] đã lượm đơn ngọt xớt rồi, tính làm gương mẫu cho ai coi?',
      ],
      GEN_Z: ['Mở bát sáng sớm mượt mà như bơ lạt, [Tên] mở hàng vía chuẩn không cần chỉnh!'],
      TONG_TAI: [
        'Chào buổi sáng người phụ nữ năng lượng của anh. Mở hàng xuất sắc thế này thì ngày hôm nay rực rỡ rồi!',
      ],
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

  static async getCelebrationQuotesConfig(fastify: FastifyInstance): Promise<TelesaleTvQuotesConfig> {
    const now = Date.now();
    if (this.cachedQuotesConfig && now - this.lastQuotesCacheTime < 15000) {
      return this.cachedQuotesConfig;
    }

    try {
      const existing = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: this.CRM_CONFIG_CELEBRATION_QUOTES_KEY },
      });

      if (existing?.value) {
        const parsed = JSON.parse(existing.value) as TelesaleTvQuotesConfig;
        if (Array.isArray(parsed?.quotes) && parsed.quotes.length > 0) {
          this.cachedQuotesConfig = parsed;
          this.lastQuotesCacheTime = now;
          return parsed;
        }
      }
    } catch (e: SafeAny) {
      fastify.log.warn(`[getCelebrationQuotesConfig] DB read warning: ${e?.message || e}`);
    }

    // Auto-seed default library
    const defaultQuotes = this.getDefaultCelebrationQuotes();
    const config: TelesaleTvQuotesConfig = {
      quotes: defaultQuotes,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    };

    try {
      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: this.CRM_CONFIG_CELEBRATION_QUOTES_KEY },
        create: {
          key: this.CRM_CONFIG_CELEBRATION_QUOTES_KEY,
          value: JSON.stringify(config),
        },
        update: {
          value: JSON.stringify(config),
        },
      });
    } catch (e: SafeAny) {
      fastify.log.error(`[getCelebrationQuotesConfig] Failed to upsert default quotes: ${e?.message || e}`);
    }

    this.cachedQuotesConfig = config;
    this.lastQuotesCacheTime = now;
    return config;
  }

  static async saveCelebrationQuotesConfig(
    fastify: FastifyInstance,
    quotes: TelesaleTvQuoteItem[],
    updatedBy = 'user'
  ): Promise<TelesaleTvQuotesConfig> {
    const config: TelesaleTvQuotesConfig = {
      quotes,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    await fastify.prisma.crm.crmConfig.upsert({
      where: { key: this.CRM_CONFIG_CELEBRATION_QUOTES_KEY },
      create: {
        key: this.CRM_CONFIG_CELEBRATION_QUOTES_KEY,
        value: JSON.stringify(config),
      },
      update: {
        value: JSON.stringify(config),
      },
    });

    this.cachedQuotesConfig = config;
    this.lastQuotesCacheTime = Date.now();
    return config;
  }

  static async resetCelebrationQuotesConfig(
    fastify: FastifyInstance,
    personaKey?: string
  ): Promise<TelesaleTvQuotesConfig> {
    const defaults = this.getDefaultCelebrationQuotes();
    let nextQuotes: TelesaleTvQuoteItem[];

    if (personaKey && personaKey !== 'RANDOM_MULTI') {
      const currentConfig = await this.getCelebrationQuotesConfig(fastify);
      const otherQuotes = currentConfig.quotes.filter((q) => q.personaKey !== personaKey);
      const defaultForPersona = defaults.filter((q) => q.personaKey === personaKey);
      nextQuotes = [...otherQuotes, ...defaultForPersona];
    } else {
      nextQuotes = defaults;
    }

    return this.saveCelebrationQuotesConfig(fastify, nextQuotes, 'reset_to_default');
  }

  static async getCelebrationQuotesOverview(fastify: FastifyInstance): Promise<TelesaleTvQuotesOverviewResponse> {
    const config = await this.getCelebrationQuotesConfig(fastify);
    const personas = Object.values(this.TV_CELEBRATION_PERSONAS);

    const byPersona: Record<string, number> = {};
    const byEvent: Record<string, number> = {};
    let activeQuotes = 0;
    let customQuotes = 0;

    for (const q of config.quotes) {
      if (q.isActive) activeQuotes++;
      if (q.isCustom) customQuotes++;
      byPersona[q.personaKey] = (byPersona[q.personaKey] || 0) + 1;
      byEvent[q.eventType] = (byEvent[q.eventType] || 0) + 1;
    }

    return {
      quotes: config.quotes,
      personas,
      stats: {
        totalQuotes: config.quotes.length,
        activeQuotes,
        customQuotes,
        byPersona,
        byEvent,
      },
    };
  }

  private static recordSpokenQuote(quote: string) {
    if (!quote) return;
    this.recentQuotesHistory.push(quote);
    if (this.recentQuotesHistory.length > 40) {
      this.recentQuotesHistory.shift();
    }
  }

  static resolveCelebrationPersona(requestedKey?: string): TelesaleTvPersonaDto {
    const personas = Object.values(this.TV_CELEBRATION_PERSONAS);
    if (requestedKey && requestedKey !== 'RANDOM_MULTI' && this.TV_CELEBRATION_PERSONAS[requestedKey]) {
      this.lastChosenPersonaKey = requestedKey;
      return this.TV_CELEBRATION_PERSONAS[requestedKey];
    }

    // Pick random persona avoiding immediate repetition if possible
    const candidates = personas.filter((p) => p.key !== this.lastChosenPersonaKey);
    const chosen = (candidates.length > 0 ? candidates : personas)[
      Math.floor(Math.random() * (candidates.length > 0 ? candidates.length : personas.length))
    ];
    this.lastChosenPersonaKey = chosen.key;
    return chosen;
  }

  static getFallbackCelebrationQuoteWithPersona(
    type: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP',
    staffName: string,
    options?: {
      tipAmount?: number;
      comboPackageName?: string;
      comboPrice?: number;
      cvStaffName?: string;
      customerName?: string;
      personaKey?: string;
      edginessLevel?: TelesaleTvEdginessLevel;
      streakCount?: number;
      hourOfDay?: number;
      isMorningFirstOrder?: boolean;
      isLateNightShift?: boolean;
    }
  ): { quote: string; persona: TelesaleTvPersonaDto } {
    const persona = this.resolveCelebrationPersona(options?.personaKey);
    const tipSpeech = this.formatCurrencyForSpeech(options?.tipAmount);
    const comboName = options?.comboPackageName || 'gói Combo làm đẹp';
    const comboPriceSpeech = options?.comboPrice ? ` trị giá ${this.formatCurrencyForSpeech(options.comboPrice)}` : '';
    const cvName = options?.cvStaffName || 'Chuyên Viên';

    // Rich Fallback Pools by Persona
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
          `Siêu phẩm triệu đô xuất hiện! [Tên] vừa lập kỷ lục chốt trọn ${comboName}${comboPriceSpeech}, cúp vàng hôm nay trao cho em chứ ai!`,
          `Khán giả ngỡ ngàng, đối thủ bật khóc! [Tên] vừa ẵm trọn ${comboName}${comboPriceSpeech} trong một nốt nhạc, quá đẳng cấp!`,
          `Bùng nổ pháo hoa chào đón gói ${comboName}${comboPriceSpeech} của [Tên]! Một cú sút sấm sét không thể cản phá!`,
        ],
        TIP: [
          `Ting ting ting! Khán đài mưa tiền thưởng, khách gửi tặng tiền tip ${tipSpeech || 'xứng đáng'} cho [Tên] và Chuyên Viên ${cvName}! Quá dữ dằn!`,
          `Tiền tip về tay như mưa rào mùa hạ! ${tipSpeech || 'Món quà ngọt ngào'} cho màn trình diễn đỉnh cao của [Tên] và Chuyên Viên ${cvName}!`,
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
          `Ủa khách đi làm đẹp sương sương mà [Tên] dụ chốt luôn ${comboName}${comboPriceSpeech}? Em không phải telesales, em là chúa tể chốt đơn!`,
          `Trời ơi ví khách vừa rớt nước mắt chia tay tiền bạc vì sự ngọt ngào của [Tên]! Xuất sắc nhưng mà mặn mòi quá nha!`,
          `Chốt ${comboName}${comboPriceSpeech} nhẹ tênh như lông hồng! [Tên] làm ăn kiểu này tính mua nhà lầu trong tháng này đúng không?`,
        ],
        TIP: [
          `Ủa khách tip ${tipSpeech || 'đậm đà'} luôn hả má? Khách mê Chuyên Viên ${cvName} hay mê cái miệng dẻo quẹo của [Tên] mà hào phóng dữ vậy?`,
          `Nhìn cái ví dày cộp tiền tip của [Tên] và Chuyên Viên ${cvName} mà con mắt bên phải giật giật, con mắt bên trái cay xè vì ghen tị!`,
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
          `Bát tự sinh tài! [Tên] vừa hóa giải túi tiền của khách, chốt trọn ${comboName}${comboPriceSpeech} đại cát đại lợi!`,
          `Thầy nhìn thấy một vầng hào quang tím rực rỡ quanh gói ${comboName}${comboPriceSpeech} mà [Tên] vừa chốt! Tiền tài cuồn cuộn đổ về!`,
        ],
        TIP: [
          `Khách phát tâm gieo duyên lộc lá ${tipSpeech || 'thịnh vượng'} cho [Tên] và Chuyên Viên ${cvName}! Lộc trời ban thì xin hoan hỉ đón nhận!`,
          `Thần Tài gõ cửa ban thưởng ${tipSpeech || 'tiền tip'}! Sự ân cần và chân thành của [Tên] quả nhiên tích đức sinh tài!`,
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
          `Chấn động mạng xã hội! [Tên] vừa chốt đứt ${comboName}${comboPriceSpeech}, đỉnh chóp thực sự không flex không được!`,
          `Bà dà [Tên] hôm nay slay dữ ta! ${comboName}${comboPriceSpeech} bay màu trong một nốt nhạc, quá đỉnh luôn má ơi!`,
        ],
        TIP: [
          `Ting ting khách thưởng nóng ${tipSpeech || 'liền tay'} cho [Tên] và Chuyên Viên ${cvName}! Tiền về tài khoản, năng lượng tràn trề quẩy banh nóc!`,
          `Khách hào sảng tip hẳn ${tipSpeech || 'đậm sâu'}! Dịch vụ đỉnh nóc thế này thì khách flex ví là đúng bài rồi!`,
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
          `Siêu phẩm ${comboName}${comboPriceSpeech} đã thuộc về em. Sự thông minh và khoa học của [Tên] làm anh mê đứ đừ!`,
          `Khách chọn gói ${comboName}${comboPriceSpeech} vì niềm tin trọn vẹn dành cho [Tên]. Đẳng cấp này chỉ có ở người phụ nữ của anh!`,
        ],
        TIP: [
          `Món quà ${tipSpeech || 'ngọt ngào'} từ khách là minh chứng cho trái tim tận tụy của [Tên] và Chuyên Viên ${cvName}. Anh rất tự hào về em!`,
          `Khách thưởng ${tipSpeech || 'xứng đáng'} cho những nỗ lực tuyệt vời của [Tên]. Em xứng đáng nhận được tất cả sự yêu thương trên đời!`,
        ],
        DONE: ['Một ca Done hoàn hảo từ A đến Z. Sự chu đáo của [Tên] hôm nay khiến anh không thể rời mắt!'],
      },
    };

    const renderQuoteTemplate = (tmpl: string): string => {
      return tmpl
        .replace(/\[Tên\]/g, staffName)
        .replace(/\[Gói Combo\]/g, comboName)
        .replace(/\[Giá Combo\]/g, comboPriceSpeech)
        .replace(/\[Tiền Tip\]/g, tipSpeech || 'xứng đáng')
        .replace(/\[Chuyên Viên\]/g, cvName)
        .replace(/\[Tên Khách\]/g, options?.customerName || 'khách');
    };

    // Contextual quotes (Streak, Morning opening, Late night shift)
    if (options?.streakCount && options.streakCount >= 2) {
      const activeStreakFromCache = this.cachedQuotesConfig?.quotes.filter(
        (q) => q.isActive && q.personaKey === persona.key && q.eventType === 'STREAK'
      );
      const streakTemplates =
        activeStreakFromCache && activeStreakFromCache.length > 0 ? activeStreakFromCache.map((q) => q.template) : null;

      const streakQuotes: Record<string, string[]> = {
        MC_HOI_CHO: [
          `Cú đúp thần thánh! [Tên] lập cú đúp chốt đơn liên hoàn cước, đối thủ chỉ biết ôm đầu ngơ ngác!`,
          `Không thể ngăn cản cỗ xe tăng [Tên]! Đơn nổ liên tọi, phong độ đỉnh nóc kịch trần rồi!`,
        ],
        DRAMA_QUEEN: [
          `Nãy giờ ăn cơm chưa [Tên] mà nuốt máy chém vô bụng hay sao nổ đơn liên tục thế? Định dẹp tiệm người ta hả?`,
          `Ủa rồi ai làm lại [Tên] nữa? Đơn nổ dồn dập thế này tính cướp hết chỉ tiêu của cả tháng luôn hay gì?`,
        ],
        GEN_Z: [`Chuỗi nổ đơn bất tận của [Tên], ai cản em lại giùm cái, slay quá mức cho phép rồi!`],
        THAY_BOI: [`Vận khí bùng nổ, chuỗi lộc liên hoàn của [Tên] đã kích hoạt Long Mạch của phòng Telesales!`],
        TONG_TAI: [
          `Liên tiếp những kỳ tích mang tên [Tên]. Em định làm anh chết lên chết xuống vì ngưỡng mộ bao nhiêu lần nữa?`,
        ],
      };
      const pStreak = streakTemplates || streakQuotes[persona.key];
      if (pStreak && pStreak.length > 0) {
        const rawQuote = pStreak[Math.floor(Math.random() * pStreak.length)];
        const quote = renderQuoteTemplate(rawQuote);
        this.recordSpokenQuote(quote);
        return { quote, persona };
      }
    }

    if (options?.isMorningFirstOrder) {
      const activeMorningFromCache = this.cachedQuotesConfig?.quotes.filter(
        (q) => q.isActive && q.personaKey === persona.key && q.eventType === 'MORNING'
      );
      const morningTemplates =
        activeMorningFromCache && activeMorningFromCache.length > 0
          ? activeMorningFromCache.map((q) => q.template)
          : null;

      const morningQuotes: Record<string, string[]> = {
        MC_HOI_CHO: ['Mở bát sáng sớm rực rỡ! [Tên] khai xuân nổ phát súng đầu tiên vang dội cả salon!'],
        THAY_BOI: [
          'Thầy nhìn vía mở hàng của [Tên] sáng rực, điềm báo ngày hôm nay cả phòng Telesales đếm tiền sái tay!',
        ],
        DRAMA_QUEEN: [
          'Sáng sớm tinh mơ người ta còn ngái ngủ mà [Tên] đã lượm đơn ngọt xớt rồi, tính làm gương mẫu cho ai coi?',
        ],
        GEN_Z: ['Mở bát sáng sớm mượt mà như bơ lạt, [Tên] mở hàng vía chuẩn không cần chỉnh!'],
        TONG_TAI: [
          'Chào buổi sáng người phụ nữ năng lượng của anh. Mở hàng xuất sắc thế này thì ngày hôm nay rực rỡ rồi!',
        ],
      };
      const pMorning = morningTemplates || morningQuotes[persona.key];
      if (pMorning && pMorning.length > 0) {
        const rawQuote = pMorning[Math.floor(Math.random() * pMorning.length)];
        const quote = renderQuoteTemplate(rawQuote);
        this.recordSpokenQuote(quote);
        return { quote, persona };
      }
    }

    const personaPool = quotesMap[persona.key] || quotesMap.MC_HOI_CHO;
    const eventPool = personaPool[type] || personaPool.BOOK;

    // Check active custom or configured quotes from DB/cache
    const activeFromCache = this.cachedQuotesConfig?.quotes.filter(
      (q) => q.isActive && q.personaKey === persona.key && q.eventType === type
    );
    const poolToUse =
      activeFromCache && activeFromCache.length > 0 ? activeFromCache.map((q) => q.template) : eventPool;

    // Filter out recently spoken quotes to avoid repetition
    const unsaidQuotes = poolToUse.filter((q) => {
      const rendered = renderQuoteTemplate(q);
      return !this.recentQuotesHistory.includes(rendered);
    });

    const candidatePool = unsaidQuotes.length > 0 ? unsaidQuotes : poolToUse;
    const template = candidatePool[Math.floor(Math.random() * candidatePool.length)] || candidatePool[0];
    const quote = renderQuoteTemplate(template);
    this.recordSpokenQuote(quote);

    return { quote, persona };
  }

  static getFallbackCelebrationQuote(
    type: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP',
    staffName: string,
    options?: {
      tipAmount?: number;
      comboPackageName?: string;
      comboPrice?: number;
      cvStaffName?: string;
      ccStaffName?: string;
      customerName?: string;
      personaKey?: string;
      edginessLevel?: TelesaleTvEdginessLevel;
      streakCount?: number;
      hourOfDay?: number;
      isMorningFirstOrder?: boolean;
      isLateNightShift?: boolean;
    }
  ): string {
    return this.getFallbackCelebrationQuoteWithPersona(type, staffName, options).quote;
  }

  static async generateLiveCelebrationQuote(
    fastify: FastifyInstance,
    type: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP',
    staffName: string,
    options?: {
      tipAmount?: number;
      comboPackageName?: string;
      comboPrice?: number;
      cvStaffName?: string;
      ccStaffName?: string;
      customerName?: string;
      personaKey?: string;
      edginessLevel?: TelesaleTvEdginessLevel;
      streakCount?: number;
      hourOfDay?: number;
      isMorningFirstOrder?: boolean;
      isLateNightShift?: boolean;
    }
  ): Promise<{ quote: string; source: 'gemini' | 'fallback'; persona: TelesaleTvPersonaDto }> {
    const fallbackResult = this.getFallbackCelebrationQuoteWithPersona(type, staffName, options);
    const persona = fallbackResult.persona;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return { quote: fallbackResult.quote, source: 'fallback', persona };
    }

    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

      const tipSpeech = this.formatCurrencyForSpeech(options?.tipAmount);
      const comboName = options?.comboPackageName || 'gói Combo làm đẹp';
      const comboPriceSpeech = options?.comboPrice
        ? ` trị giá ${this.formatCurrencyForSpeech(options.comboPrice)}`
        : '';
      const cvName = options?.cvStaffName || 'Chuyên Viên';

      const eventDescription =
        {
          BOOK: 'BOOK (khách hàng vừa chốt lịch hẹn mới)',
          CHECKIN: 'CHECK-IN (khách hàng vừa có mặt check-in tại salon Wings)',
          DONE: 'DONE (khách hàng đã hoàn tất dịch vụ tại salon Wings)',
          COMBO: `COMBO (${staffName} vừa chốt thành công ${comboName}${comboPriceSpeech}. BẮT BUỘC nhắc rõ tên gói ${comboName} trong câu)`,
          TIP: `TIP (${staffName} và Chuyên Viên ${cvName} được khách gửi tặng tiền tip ${tipSpeech || 'xứng đáng'}. BẮT BUỘC nhắc rõ số tiền tip ${tipSpeech} trong câu)`,
        }[type] || type;

      const edginessLevel = options?.edginessLevel || 'SUPER_SPICY';
      const edginessTone =
        edginessLevel === 'CLASSIC'
          ? 'Lịch sự, hóm hỉnh nhẹ nhàng, chuẩn mực nam thần.'
          : edginessLevel === 'PLAYFUL'
            ? 'Hài hước, vui tươi, châm chọc nhẹ, nhiều tiếng lóng văn phòng duyên dáng.'
            : 'SIÊU NHAM NHỞ, LẦY LỘI, CÀ KHỊA CỰC BỰA, XÉO XẮT HOẶC GÀO THÉT BẤT NGỜ NHƯNG KHÔNG VĂNG TỤC THÔ THIỂN, TUÂN THỦ TÔN TRỌNG TAY NGHỀ CHUYÊN VIÊN.';

      const contextNotes: string[] = [];
      if (options?.streakCount && options.streakCount >= 2) {
        contextNotes.push(
          `ĐÂY LÀ ĐƠN THỨ ${options.streakCount} LIÊN TIẾP CỦA BẠN NÀY! Hãy cà khịa về việc chốt đơn như máy chém, cướp hết chén cơm đồng nghiệp!`
        );
      }
      if (options?.isMorningFirstOrder) {
        contextNotes.push(
          'ĐÂY LÀ ĐƠN MỞ BÁT SÁNG SỚM TINH MƠ! Hãy chúc mừng hoặc cà khịa mở hàng linh nghiệm, vía lộc!'
        );
      }
      if (options?.isLateNightShift) {
        contextNotes.push(
          'ĐƠN SÁT GIỜ ĐÓNG CA ĐÊM! Hãy cà khịa về việc thức canh kho bạc, đam mê tiền bạc hơn giấc ngủ!'
        );
      }

      const systemPrompt = `Bạn đang nhập vai nhân cách: "${persona.name}" (${persona.badge}) tại phòng Telesales War Room chuỗi làm đẹp Wings (Wingslashes).
ĐẶC TRƯNG TÍNH CÁCH: ${persona.tagline}.
MỨC ĐỘ MẶN MÒI & NHAM NHỞ: ${edginessTone}
${contextNotes.length > 0 ? `BỐI CẢNH ĐẶC BIỆT: ${contextNotes.join(' ')}` : ''}

Nhiệm vụ: Nói duy nhất 1 câu ngắn gọn (khoảng 14-22 từ) bằng tiếng Việt dành tặng cho nhân viên Telesales tên là "${staffName}", vừa có 1 sự kiện ${eventDescription}.
QUY TẮC BẮT BUỘC:
1. Nhập vai 100% đúng phong cách ${persona.name} (Ví dụ: MC Hội Chợ thì phải gào thét cuồng nhiệt, Cụ Tổ Drama thì phải xéo xắt châm chọc chua ngoa, Thầy Bói thì phán quẻ tài lộc ma mị, Gen Z thì từ lóng hot trend TikTok, Tổng Tài thì sến rện thả thính).
2. Phải nhắc đến tên "${staffName}".
3. Tuyệt đối không dùng từ "thợ", chỉ dùng danh xưng "Chuyên Viên" hoặc "CV" khi nhắc đến kỹ thuật viên làm đẹp.
4. Nếu là sự kiện TIP, BẮT BUỘC đọc rõ số tiền tip ("${tipSpeech}").
5. Nếu là sự kiện COMBO, BẮT BUỘC đọc rõ tên gói combo ("${comboName}").
6. Ngắn gọn, súc tích (14-22 từ), chỉ 1 câu duy nhất truyền cảm hứng và gây cười to cho cả phòng.
7. Chỉ trả về đúng 1 câu thoại để đọc phát loa trực tiếp, không có dấu ngoặc kép, không markdown, không giải thích.`;

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Hãy phát thanh 1 câu theo đúng tính cách ${persona.name} siêu nham nhở, bất ngờ cho ${staffName} vừa nổ ${type}!`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 1.15,
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens: 65,
          },
        }),
        signal: AbortSignal.timeout(2500),
      });

      if (!response.ok) {
        return { quote: fallbackResult.quote, source: 'fallback', persona };
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
      };

      const parts = data.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find((p) => !p.thought && p.text) || parts[parts.length - 1];
      const rawText = textPart?.text?.trim();

      if (rawText && rawText.length > 5) {
        const cleanText = rawText.replace(/^["'“”«»\s]+|["'“”«»\s]+$/g, '').trim();
        this.recordSpokenQuote(cleanText);
        return { quote: cleanText, source: 'gemini', persona };
      }
    } catch (err) {
      fastify.log.warn(`Gemini live celebration quote generation failed, using fallback: ${err}`);
    }

    return { quote: fallbackResult.quote, source: 'fallback', persona };
  }

  static async synthesizeCelebrationAudio(
    text: string,
    voice = 'vi-VN-HoaiMyNeural',
    rate = '+0%',
    pitch = '+0Hz'
  ): Promise<Buffer> {
    const cleanText = text.replace(/[\r\n\t]+/g, ' ').trim();
    if (!cleanText) throw new Error('Text is empty');

    const cacheDir = '/tmp/telesale_audio_cache';
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    const hash = createHash('md5').update(`${cleanText}_${voice}_${rate}_${pitch}`).digest('hex');
    const cacheFile = `${cacheDir}/${hash}.mp3`;

    if (existsSync(cacheFile)) {
      const buf = readFileSync(cacheFile);
      if (buf.length > 500) {
        return buf;
      }
    }

    const pythonCandidates = [
      '/Users/dannydo/.gemini/antigravity/venv-f5tts/bin/python',
      '/usr/bin/python3',
      '/usr/local/bin/python3',
      'python3',
    ];

    let pythonBin = 'python3';
    for (const c of pythonCandidates) {
      if (existsSync(c)) {
        pythonBin = c;
        break;
      }
    }

    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tempTextFile = `${cacheDir}/tmp_in_${uniqueId}.txt`;
    const tempFile = `${cacheDir}/tmp_${uniqueId}.mp3`;
    const execFileAsync = promisify(execFile);

    try {
      // Write text to file to avoid command-line argument limits and encoding issues
      writeFileSync(tempTextFile, cleanText, 'utf8');

      const pyScript = `import sys, asyncio, edge_tts

text_file = sys.argv[1]
with open(text_file, 'r', encoding='utf-8') as f:
    text = f.read().strip()
voice = sys.argv[2]
raw_rate = sys.argv[3] if len(sys.argv) > 3 else None
rate = raw_rate if raw_rate not in ('', '+0%', 'None', None) else None
out_path = sys.argv[4]

async def synthesize():
    last_err = None
    for attempt in range(2):
        try:
            comm = edge_tts.Communicate(text, voice, rate=rate) if rate else edge_tts.Communicate(text, voice)
            await asyncio.wait_for(comm.save(out_path), timeout=25.0)
            return
        except Exception as e:
            last_err = e
            await asyncio.sleep(0.4)
    if last_err:
        raise last_err

asyncio.run(synthesize())`;

      try {
        await execFileAsync(pythonBin, ['-c', pyScript, tempTextFile, voice, rate, tempFile], { timeout: 28_000 });
      } catch {
        // Fallback to default rate Communicate without custom prosody if needed
        const fallbackPy = `import sys, asyncio, edge_tts
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    text = f.read().strip()
asyncio.run(edge_tts.Communicate(text, sys.argv[2]).save(sys.argv[3]))`;
        await execFileAsync(pythonBin, ['-c', fallbackPy, tempTextFile, voice, tempFile], { timeout: 28_000 });
      }

      if (existsSync(tempFile)) {
        const audioBuf = readFileSync(tempFile);
        if (audioBuf.length > 500) {
          try {
            writeFileSync(cacheFile, audioBuf);
            unlinkSync(tempFile);
          } catch {
            // cache write failure is non-fatal
          }
          return audioBuf;
        }
      }
    } catch (err: unknown) {
      if (existsSync(tempFile)) {
        try {
          unlinkSync(tempFile);
        } catch {
          // ignore cleanup failure
        }
      }
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`Edge TTS synthesis failed: ${errMsg}`, { cause: err });
    } finally {
      if (existsSync(tempTextFile)) {
        try {
          unlinkSync(tempTextFile);
        } catch {
          // ignore cleanup failure
        }
      }
    }

    throw new Error('No audio produced by Edge TTS');
  }

  private static tvJournalExecutionStore = new Map<string, Partial<TelesaleTvEventLog>>();

  static recordTvJournalSync(records: TelesaleTvEventLog[]): { success: boolean; count: number } {
    if (!Array.isArray(records)) return { success: true, count: 0 };
    for (const rec of records) {
      if (rec && rec.id) {
        this.tvJournalExecutionStore.set(rec.id, {
          ...this.tvJournalExecutionStore.get(rec.id),
          ...rec,
        });
      }
    }
    return { success: true, count: records.length };
  }

  static async getTvJournal(fastify: FastifyInstance, dateParam?: string): Promise<TelesaleTvJournalOverview> {
    const targetDate =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : new Date().toISOString().slice(0, 10);

    const monthStr = targetDate.slice(0, 7);
    const config = await TelesaleTargetConfigService.getConfig(fastify, monthStr);
    const activeStaff = config.staffTargets;
    const candidateIds = (activeStaff as TelesaleStaffTarget[]).map((s) => s.legacyStaffId).filter((id) => id > 0);
    const candidateIdsStr = candidateIds.length > 0 ? candidateIds.join(', ') : '0';

    const staffNameMap = new Map<number, string>();
    const staffAvatarMap = new Map<number, string | null>();
    (activeStaff as TelesaleStaffTarget[]).forEach((s) => {
      staffNameMap.set(s.legacyStaffId, s.name);
      staffAvatarMap.set(s.legacyStaffId, s.avatarUrl || null);
    });

    const dayStartStr = `${targetDate} 00:00:00`;
    const dayEndStr = `${targetDate} 23:59:59`;

    const [dayBookOrders, dayDoneOrders] = await Promise.all([
      fastify.prisma.legacy
        .$queryRawUnsafe<SafeAny[]>(
          `
        SELECT 
          o.id,
          o.created_staff_id as bookerId,
          o.order_state as orderState,
          DATE_FORMAT(o.date_created, '%Y-%m-%dT%H:%i:%s+07:00') as dateCreated
        FROM \`order\` o
        WHERE o.date_created >= '${dayStartStr}' 
          AND o.date_created <= '${dayEndStr}'
          AND o.created_staff_id IN (${candidateIdsStr})
      `
        )
        .catch(() => []),
      fastify.prisma.legacy
        .$queryRawUnsafe<SafeAny[]>(
          `
        SELECT 
          o.id as id,
          o.created_staff_id as bookerId,
          o.order_state as orderState,
          o.total_price as totalPrice,
          DATE_FORMAT(o.booking_date_start, '%Y-%m-%dT%H:%i:%s+07:00') as bookingDateStart,
          DATE_FORMAT(ro.actual_booking_date_start, '%Y-%m-%dT%H:%i:%s+07:00') as actualBookingDateStart,
          DATE_FORMAT(ro.actual_booking_date_end, '%Y-%m-%dT%H:%i:%s+07:00') as actualBookingDateEnd,
          DATE_FORMAT(o.date_updated, '%Y-%m-%dT%H:%i:%s+07:00') as dateUpdated,
          DATE_FORMAT(COALESCE(ro.actual_booking_date_end, o.date_updated, ro.actual_booking_date_start, o.date_created), '%Y-%m-%dT%H:%i:%s+07:00') as doneDate
        FROM \`order\` o
        LEFT JOIN report_order ro ON ro.order_id = o.id
        WHERE o.created_staff_id IN (${candidateIdsStr})
          AND (
            (ro.actual_booking_date_start >= '${dayStartStr}' AND ro.actual_booking_date_start <= '${dayEndStr}')
            OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= '${dayStartStr}' AND o.booking_date_start <= '${dayEndStr}')
          )
          AND o.order_state = 'Completed'
      `
        )
        .catch(() => []),
    ]);

    const sortedDayBookOrders = [...dayBookOrders]
      .filter((o) => o && o.id)
      .sort(
        (a, b) =>
          new Date(parseVietnamDateToIso(a.dateCreated)).getTime() -
          new Date(parseVietnamDateToIso(b.dateCreated)).getTime()
      );

    const staffBookCountMap = new Map<number, number>();
    const bookEvents: TelesaleTvEventLog[] = sortedDayBookOrders.map((o) => {
      const bookerId = Number(o.bookerId);
      const prevCount = staffBookCountMap.get(bookerId) || 0;
      const newCount = prevCount + 1;
      staffBookCountMap.set(bookerId, newCount);

      const id = `book-${o.id}`;
      const timestamp = parseVietnamDateToIso(o.dateCreated);
      const timeFormatted = formatVietnamTime(timestamp);

      const exec = this.tvJournalExecutionStore.get(id);
      const isExecuted = Boolean(exec);
      return {
        id,
        type: 'BOOK' as const,
        staffId: bookerId,
        staffName: staffNameMap.get(bookerId) || 'Telesales',
        avatarUrl: staffAvatarMap.get(bookerId) || null,
        timestamp,
        timeFormatted,
        changeResult: `Book ${prevCount} → ${newCount}`,
        orderId: Number(o.id),
        eventReceived: exec?.eventReceived ?? false,
        eventReceivedAt: exec?.eventReceivedAt ?? (exec?.eventReceived ? timestamp : undefined),
        voiceTriggered: exec?.voiceTriggered ?? false,
        voiceErrorReason:
          exec?.voiceErrorReason ??
          (exec?.voiceTriggered
            ? null
            : isExecuted
              ? 'Không phát âm thanh'
              : 'Sự kiện trước ca trực / chưa qua TV Monitor online'),
        overlayTriggered: exec?.overlayTriggered ?? false,
        overlayErrorReason:
          exec?.overlayErrorReason ??
          (exec?.overlayTriggered
            ? null
            : isExecuted
              ? 'Không hiển thị Overlay'
              : 'Sự kiện trước ca trực / chưa qua TV Monitor online'),
        status: exec?.status ?? 'SUCCESS',
        errorMessage: exec?.errorMessage ?? (isExecuted ? null : null),
      };
    });

    const sortedDayDoneOrders = [...dayDoneOrders]
      .filter((o) => o && o.id)
      .sort((a, b) => {
        const timeA = new Date(
          parseVietnamDateToIso(a.doneDate || a.actualBookingDateEnd || a.dateUpdated || a.actualBookingDateStart || 0)
        ).getTime();
        const timeB = new Date(
          parseVietnamDateToIso(b.doneDate || b.actualBookingDateEnd || b.dateUpdated || b.actualBookingDateStart || 0)
        ).getTime();
        return timeA - timeB;
      });

    const staffDoneCountMap = new Map<number, number>();
    const doneEvents: TelesaleTvEventLog[] = sortedDayDoneOrders.map((o) => {
      const bookerId = Number(o.bookerId);
      const prevDone = staffDoneCountMap.get(bookerId) || 0;
      const newDone = prevDone + 1;
      staffDoneCountMap.set(bookerId, newDone);

      const id = `done-${o.id}`;
      const timestamp = parseVietnamDateToIso(
        o.doneDate || o.actualBookingDateEnd || o.dateUpdated || o.actualBookingDateStart || o.bookingDateStart
      );
      const timeFormatted = formatVietnamTime(timestamp);

      const exec = this.tvJournalExecutionStore.get(id);
      const isExecuted = Boolean(exec);
      return {
        id,
        type: 'DONE' as const,
        staffId: bookerId,
        staffName: staffNameMap.get(bookerId) || 'Telesales',
        avatarUrl: staffAvatarMap.get(bookerId) || null,
        timestamp,
        timeFormatted,
        changeResult: `Done ${prevDone} → ${newDone}`,
        orderId: Number(o.id),
        eventReceived: exec?.eventReceived ?? false,
        eventReceivedAt: exec?.eventReceivedAt ?? (exec?.eventReceived ? timestamp : undefined),
        voiceTriggered: exec?.voiceTriggered ?? false,
        voiceErrorReason:
          exec?.voiceErrorReason ??
          (exec?.voiceTriggered
            ? null
            : isExecuted
              ? 'Không phát âm thanh'
              : 'Sự kiện trước ca trực / chưa qua TV Monitor online'),
        overlayTriggered: exec?.overlayTriggered ?? false,
        overlayErrorReason:
          exec?.overlayErrorReason ??
          (exec?.overlayTriggered
            ? null
            : isExecuted
              ? 'Không hiển thị Overlay'
              : 'Sự kiện trước ca trực / chưa qua TV Monitor online'),
        status: exec?.status ?? 'SUCCESS',
        errorMessage: exec?.errorMessage ?? (isExecuted ? null : null),
      };
    });

    // Milestone events based on total Book and Done on that date
    const milestoneEvents: TelesaleTvEventLog[] = [];
    const totalBookOnDate = bookEvents.length;
    const totalDoneOnDate = doneEvents.length;

    const addMilestoneIfReached = (
      id: string,
      threshold: number,
      current: number,
      changeResult: string,
      targetTimestamp: string
    ) => {
      if (current >= threshold) {
        const exec = this.tvJournalExecutionStore.get(id);
        const timeFormatted = formatVietnamTime(targetTimestamp);
        const isExecuted = Boolean(exec);
        milestoneEvents.push({
          id,
          type: 'MILESTONE' as const,
          staffName: 'Toàn team Telesales',
          avatarUrl: null,
          timestamp: targetTimestamp,
          timeFormatted,
          changeResult,
          eventReceived: exec?.eventReceived ?? false,
          eventReceivedAt: exec?.eventReceivedAt ?? (exec?.eventReceived ? targetTimestamp : undefined),
          voiceTriggered: exec?.voiceTriggered ?? false,
          voiceErrorReason:
            exec?.voiceErrorReason ??
            (exec?.voiceTriggered
              ? null
              : isExecuted
                ? 'Không phát âm thanh'
                : 'Sự kiện trước ca trực / chưa qua TV Monitor online'),
          overlayTriggered: exec?.overlayTriggered ?? false,
          overlayErrorReason:
            exec?.overlayErrorReason ??
            (exec?.overlayTriggered
              ? null
              : isExecuted
                ? 'Không hiển thị Overlay'
                : 'Sự kiện trước ca trực / chưa qua TV Monitor online'),
          status: exec?.status ?? 'SUCCESS',
          errorMessage: exec?.errorMessage ?? (isExecuted ? null : null),
        });
      }
    };

    if (totalBookOnDate >= 10 && bookEvents[9]) {
      addMilestoneIfReached(
        `milestone-${targetDate}-book-10`,
        10,
        totalBookOnDate,
        'Cán mốc 10 Book',
        bookEvents[9].timestamp
      );
    }
    if (totalBookOnDate >= 20 && bookEvents[19]) {
      addMilestoneIfReached(
        `milestone-${targetDate}-book-20`,
        20,
        totalBookOnDate,
        'Chạm mốc 20 Book',
        bookEvents[19].timestamp
      );
    }
    if (totalBookOnDate >= 25 && bookEvents[24]) {
      addMilestoneIfReached(
        `milestone-${targetDate}-book-25`,
        25,
        totalBookOnDate,
        'Cán mốc 25 Book',
        bookEvents[24].timestamp
      );
    }
    if (totalBookOnDate > 25 && bookEvents[25]) {
      addMilestoneIfReached(
        `milestone-${targetDate}-book-gt25`,
        26,
        totalBookOnDate,
        'Vượt mốc 25 Book',
        bookEvents[25].timestamp
      );
    }
    if (totalDoneOnDate >= 18 && doneEvents[17]) {
      addMilestoneIfReached(
        `milestone-${targetDate}-done-18`,
        18,
        totalDoneOnDate,
        'Hoàn thành 18 Done',
        doneEvents[17].timestamp
      );
    }

    const allEvents = [...bookEvents, ...doneEvents, ...milestoneEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const voiceSuccess = allEvents.filter((e) => e.voiceTriggered).length;
    const voiceError = allEvents.filter((e) => e.eventReceived && !e.voiceTriggered).length;
    const overlaySuccess = allEvents.filter((e) => e.overlayTriggered).length;
    const overlayError = allEvents.filter((e) => e.eventReceived && !e.overlayTriggered).length;
    const latestEventTime = allEvents.length > 0 ? allEvents[0].timestamp : null;

    return {
      totalEvents: allEvents.length,
      voiceSuccess,
      voiceError,
      overlaySuccess,
      overlayError,
      latestEventTime,
      events: allEvents,
    };
  }
}
