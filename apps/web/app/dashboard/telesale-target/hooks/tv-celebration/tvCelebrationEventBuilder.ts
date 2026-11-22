import { SafeAny, TelesaleTodayLiveEvent, TelesaleTvEventLog, TelesaleTvPersonaDto } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  ActiveCelebration,
  BOOK_QUOTES,
  CHECKIN_QUOTES,
  DONE_QUOTES,
  TvCelebrationSettings,
  attachPersonaMetadata,
  formatCurrencyForSpeech,
  formatViTime,
  getRandomQuote,
} from './tvCelebrationTypes';

type QuoteRequestPayload = Parameters<typeof apiClient.telesaleTarget.getCelebrationQuote>[0];

export function fetchQuoteWithTimeout(payload: QuoteRequestPayload) {
  return Promise.race([
    apiClient.telesaleTarget.getCelebrationQuote(payload),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
  ]);
}

export function dispatchLiveEventCelebration(params: {
  ev: TelesaleTodayLiveEvent;
  staffStreakMap: Map<string, number>;
  settings: TvCelebrationSettings;
  enqueueCelebration: (event: ActiveCelebration) => void;
  recordEventLog: (log: TelesaleTvEventLog) => void;
}) {
  const { ev, staffStreakMap, settings, enqueueCelebration, recordEventLog } = params;
  const staffName = ev.staffName || 'Bạn Telesales';
  const curStreak = (staffStreakMap.get(staffName) || 0) + 1;
  staffStreakMap.set(staffName, curStreak);
  const currentHour = new Date().getHours();
  const baseContext = {
    personaKey: settings.personaMode,
    edginessLevel: settings.edginessLevel,
    streakCount: curStreak,
    hourOfDay: currentHour,
    isMorningFirstOrder: currentHour < 10,
    isLateNightShift: currentHour >= 21,
  };

  if (ev.type === 'BOOK') {
    const defaultQuote = getRandomQuote(BOOK_QUOTES, staffName);
    const buildBook = (quoteText: string, persona?: TelesaleTvPersonaDto) =>
      enqueueCelebration(
        attachPersonaMetadata(
          {
            id: ev.id,
            kind: 'BOOK',
            staffId: ev.staffId,
            staffName,
            avatarUrl: ev.avatarUrl,
            textToSpeak: quoteText,
            badgeText: '+1 BOOK HÔM NAY',
            colorTheme: 'blue',
            changeResult: ev.changeResult,
            orderId: ev.orderId,
          },
          persona
        )
      );

    fetchQuoteWithTimeout({ type: 'BOOK', staffName, ...baseContext })
      .then((res: SafeAny) => buildBook(res?.quote?.trim() || defaultQuote, res?.persona))
      .catch(() => buildBook(defaultQuote));
    return;
  }

  if (ev.type === 'CHECKIN') {
    const defaultQuote = getRandomQuote(CHECKIN_QUOTES, staffName);
    const buildCheckin = (quoteText: string, persona?: TelesaleTvPersonaDto) =>
      enqueueCelebration(
        attachPersonaMetadata(
          {
            id: ev.id,
            kind: 'CHECKIN',
            staffId: ev.staffId,
            staffName,
            avatarUrl: ev.avatarUrl,
            textToSpeak: quoteText,
            badgeText: '+1 CHECK-IN KHÁCH LẺ',
            colorTheme: 'emerald',
            changeResult: ev.changeResult,
            orderId: ev.orderId,
          },
          persona
        )
      );

    fetchQuoteWithTimeout({ type: 'CHECKIN', staffName, ...baseContext })
      .then((res: SafeAny) => buildCheckin(res?.quote?.trim() || defaultQuote, res?.persona))
      .catch(() => buildCheckin(defaultQuote));
    return;
  }

  if (ev.type === 'DONE') {
    // Xử lý các loại vinh danh: Lời khen của khách (Ưu tiên số 1) > Combo & Tip > Combo > Tip
    const hasCombo = !!ev.hasCombo;
    const hasTip = !!ev.hasTip;
    const hasPraise = !!ev.customerPraiseNote;
    const praiseNote = ev.customerPraiseNote || '';
    const customerName = ev.customerName || 'Khách yêu';
    const cvName = ev.assignedStaffName || 'Chuyên Viên';
    const ccName = ev.checkInStaffName || staffName;

    if (hasPraise) {
      const tipSpeech = formatCurrencyForSpeech(ev.tipAmount);
      const tipText = ev.tipAmount ? ` ${ev.tipAmount.toLocaleString('vi-VN')}đ` : '';
      const badgeText = hasTip && tipSpeech ? `👑 TIP${tipText} & LỜI KHEN NGỌT NGÀO!` : '💌 LỜI KHEN TỪ KHÁCH YÊU!';
      const praiseQuote =
        hasTip && tipSpeech
          ? `Khách yêu ${customerName} vừa gửi tặng tiền tip ${tipSpeech} cùng lời khen ngọt ngào: "${praiseNote}". Chúc mừng Chuyên Viên ${cvName} và Tư Vấn ${ccName} đã tạo nên trải nghiệm tuyệt vời!`
          : `Khách yêu ${customerName} vừa gửi lời khen ngọt ngào: "${praiseNote}". Chúc mừng Chuyên Viên ${cvName} và Tư Vấn ${ccName} đã đồng hành xuất sắc!`;

      enqueueCelebration({
        id: ev.id,
        kind: 'TIP', // Chime vàng kim vui tươi
        staffId: ev.staffId,
        staffName,
        avatarUrl: ev.avatarUrl,
        textToSpeak: praiseQuote,
        badgeText,
        colorTheme: 'gold',
        changeResult: ev.changeResult,
        orderId: ev.orderId,
        hasCombo,
        comboPackageName: ev.comboPackageName,
        hasTip,
        tipAmount: ev.tipAmount,
        customerPraiseNote: praiseNote,
        customerName,
        assignedStaffName: cvName,
        checkInStaffName: ccName,
      });
      return;
    }

    if (hasCombo && hasTip) {
      const comboName = ev.comboPackageName || 'gói Combo làm đẹp';
      const priceSpeech = ev.comboPrice ? ` trị giá ${formatCurrencyForSpeech(ev.comboPrice)}` : '';
      const tipSpeech = formatCurrencyForSpeech(ev.tipAmount);
      const tipText = ev.tipAmount ? ` ${ev.tipAmount.toLocaleString('vi-VN')}đ` : '';
      const comboPriceBadge = ev.comboPrice ? ` (${ev.comboPrice.toLocaleString('vi-VN')}đ)` : '';

      const comboTipQuotes = [
        `Ủa ủa ${staffName} ơi! Vừa chốt trọn ${comboName}${priceSpeech}, lại vừa ẵm luôn tiền tip ${tipSpeech}! Em làm ăn kiểu này thì cả phòng chỉ có nước die up die down thôi!`,
        `Kỳ tích chấn động phòng Telesales! Cả ${comboName}${priceSpeech} lẫn tiền tip ${tipSpeech} đều về tay ${staffName} và Chuyên Viên ${cvName}! Em xuất sắc thế này làm anh xao xuyến, chết lên chết xuống vì nể phục!`,
        `Siêu phẩm kép hôm nay đây rồi! Khách mê ${staffName} hay mê Chuyên Viên ${cvName} mà chốt luôn ${comboName}${priceSpeech} rồi tip hẳn ${tipSpeech}! Đẳng cấp đỉnh nóc kịch trần em ơi!`,
      ];
      const defaultQuote = comboTipQuotes[Math.floor(Math.random() * comboTipQuotes.length)];

      const triggerComboTip = (quoteText: string, persona?: TelesaleTvPersonaDto) =>
        enqueueCelebration(
          attachPersonaMetadata(
            {
              id: ev.id,
              kind: 'COMBO',
              staffId: ev.staffId,
              staffName,
              avatarUrl: ev.avatarUrl,
              textToSpeak: quoteText,
              badgeText: `👑 +${comboName.toUpperCase()}${comboPriceBadge} & TIP${tipText}!`,
              colorTheme: 'purple',
              changeResult: ev.changeResult,
              orderId: ev.orderId,
              hasCombo: true,
              comboPackageName: ev.comboPackageName,
              comboPrice: ev.comboPrice,
              hasTip: true,
              tipAmount: ev.tipAmount,
              assignedStaffName: cvName,
              checkInStaffName: ccName,
            },
            persona
          )
        );

      fetchQuoteWithTimeout({
        type: 'COMBO',
        staffName,
        comboPackageName: comboName,
        comboPrice: ev.comboPrice,
        tipAmount: ev.tipAmount,
        cvStaffName: cvName,
        customerName,
        ...baseContext,
      })
        .then((res: SafeAny) => triggerComboTip(res?.quote?.trim() || defaultQuote, res?.persona))
        .catch(() => triggerComboTip(defaultQuote));
      return;
    }

    if (hasCombo) {
      const comboName = ev.comboPackageName || 'gói Combo làm đẹp';
      const priceSpeech = ev.comboPrice ? ` trị giá ${formatCurrencyForSpeech(ev.comboPrice)}` : '';
      const comboPriceBadge = ev.comboPrice ? ` (${ev.comboPrice.toLocaleString('vi-VN')}đ)` : '';

      const comboQuotes = [
        `Ủa ủa ${staffName} ơi! Khách đi làm đẹp sương sương mà em chốt luôn ${comboName}${priceSpeech}, tính làm khách mê Wings tới già luôn đúng không?`,
        `Bùng nổ rồi ${staffName} ơi! Khách tin yêu chốt ngay ${comboName}${priceSpeech}, em tư vấn đỉnh thế này thì ví khách chỉ có nước die up die down!`,
        `Siêu phẩm ${comboName}${priceSpeech} về tay ${staffName}! Em chốt đơn bén như máy chém, làm anh xao xuyến cả buổi chiều!`,
        `Đẳng cấp tư vấn khoa học của ${staffName} và Chuyên Viên ${cvName} là đây! Khách chốt trọn ${comboName}${priceSpeech} trong một nốt nhạc, quá đỗi quyến rũ em ơi!`,
      ];
      const defaultQuote = comboQuotes[Math.floor(Math.random() * comboQuotes.length)];

      const triggerCombo = (quoteText: string, persona?: TelesaleTvPersonaDto) =>
        enqueueCelebration(
          attachPersonaMetadata(
            {
              id: ev.id,
              kind: 'COMBO',
              staffId: ev.staffId,
              staffName,
              avatarUrl: ev.avatarUrl,
              textToSpeak: quoteText,
              badgeText: `✨ +CHỐT ${comboName.toUpperCase()}${comboPriceBadge}!`,
              colorTheme: 'purple',
              changeResult: ev.changeResult,
              orderId: ev.orderId,
              hasCombo: true,
              comboPackageName: ev.comboPackageName,
              comboPrice: ev.comboPrice,
              assignedStaffName: cvName,
              checkInStaffName: ccName,
            },
            persona
          )
        );

      fetchQuoteWithTimeout({
        type: 'COMBO',
        staffName,
        comboPackageName: comboName,
        comboPrice: ev.comboPrice,
        cvStaffName: cvName,
        customerName,
        ...baseContext,
      })
        .then((res: SafeAny) => triggerCombo(res?.quote?.trim() || defaultQuote, res?.persona))
        .catch(() => triggerCombo(defaultQuote));
      return;
    }

    if (hasTip) {
      const tipSpeech = formatCurrencyForSpeech(ev.tipAmount);
      const tipText = ev.tipAmount ? ` ${ev.tipAmount.toLocaleString('vi-VN')}đ` : '';

      const tipQuotes = [
        `Ting ting, khách thưởng tip ${tipSpeech} cho ${ccName} và Chuyên Viên ${cvName}! Vừa duyên dáng lại vừa ân cần, khách thương khách nhớ tip tới tấp thế này thì ai làm lại các em!`,
        `Khách mê tay nghề Chuyên Viên ${cvName} hay mê nụ cười của ${ccName} mà tip hẳn ${tipSpeech} thế này? Đẳng cấp làm cả phòng die up die down!`,
        `Một món quà tip ${tipSpeech} ngọt ngào từ khách yêu gửi tặng ${ccName} và ${cvName}! Sự chăm sóc chuẩn 5 sao làm anh chết lên chết xuống vì tự hào!`,
        `Khách gửi trọn niềm tin và tip ${tipSpeech} liền tay! Phong độ đỉnh cao của ${ccName} và ${cvName} hôm nay khiến ai cũng phải trầm trồ thán phục!`,
      ];
      const defaultQuote = tipQuotes[Math.floor(Math.random() * tipQuotes.length)];

      const triggerTip = (quoteText: string, persona?: TelesaleTvPersonaDto) =>
        enqueueCelebration(
          attachPersonaMetadata(
            {
              id: ev.id,
              kind: 'TIP',
              staffId: ev.staffId,
              staffName,
              avatarUrl: ev.avatarUrl,
              textToSpeak: quoteText,
              badgeText: `💛 +TIP KHÁCH THƯỞNG${tipText}!`,
              colorTheme: 'gold',
              changeResult: ev.changeResult,
              orderId: ev.orderId,
              hasTip: true,
              tipAmount: ev.tipAmount,
              assignedStaffName: cvName,
              checkInStaffName: ccName,
            },
            persona
          )
        );

      fetchQuoteWithTimeout({
        type: 'TIP',
        staffName: ccName,
        tipAmount: ev.tipAmount,
        cvStaffName: cvName,
        customerName,
        ...baseContext,
      })
        .then((res: SafeAny) => triggerTip(res?.quote?.trim() || defaultQuote, res?.persona))
        .catch(() => triggerTip(defaultQuote));
      return;
    }

    // Đơn thường hoàn tất: Ghi nhận êm ái vào nhật ký, không làm phiền phòng trực
    recordEventLog({
      id: ev.id,
      type: 'DONE',
      staffId: ev.staffId,
      staffName,
      avatarUrl: ev.avatarUrl,
      timestamp: ev.timestamp,
      timeFormatted: formatViTime(ev.timestamp, true),
      changeResult: ev.changeResult || 'Done (Đơn thường)',
      orderId: ev.orderId,
      eventReceived: true,
      eventReceivedAt: new Date().toISOString(),
      voiceTriggered: false,
      voiceErrorReason: 'Đơn thường hoàn tất (không combo/tip)',
      overlayTriggered: false,
      overlayErrorReason: 'Đơn thường hoàn tất (không combo/tip)',
      status: 'SUCCESS',
      errorMessage: null,
    });
  }
}

const DEMO_AVATAR_PHUONG =
  'https://lh3.googleusercontent.com/a/ACg8ocImU7oxC33vMir9F9rllmN4y1LVBkzJXB5ff9RCZyy-9brDnA=s96-c';
const DEMO_AVATAR_KIEU =
  'https://lh3.googleusercontent.com/a/ACg8ocIDkNj8m3jfUn2iO_gmhiuLwSJ3XF2Gaqvi69RiG3-My5olzA=s96-c';

export function triggerDemoCelebrationEvent(params: {
  type: 'BOOK' | 'DONE' | 'CHECKIN' | 'COMBO' | 'TIP' | 'MILESTONE' | 'CHECKIN_18';
  settings: TvCelebrationSettings;
  enqueueCelebration: (event: ActiveCelebration) => void;
}) {
  const { type, settings, enqueueCelebration } = params;
  const demoId = `demo-${Date.now()}`;

  const triggerWithQuote = (
    payload: QuoteRequestPayload,
    defaultQuote: string,
    base: Omit<ActiveCelebration, 'textToSpeak'>
  ) => {
    apiClient.telesaleTarget
      .getCelebrationQuote({
        ...payload,
        personaKey: settings.personaMode,
        edginessLevel: settings.edginessLevel,
      })
      .then((res) =>
        enqueueCelebration(
          attachPersonaMetadata({ ...base, textToSpeak: res?.quote?.trim() || defaultQuote }, res?.persona)
        )
      )
      .catch(() => enqueueCelebration({ ...base, textToSpeak: defaultQuote }));
  };

  if (type === 'BOOK') {
    const staffName = 'Bích Phượng';
    triggerWithQuote({ type: 'BOOK', staffName }, getRandomQuote(BOOK_QUOTES, staffName), {
      id: demoId,
      kind: 'BOOK',
      staffName,
      avatarUrl: DEMO_AVATAR_PHUONG,
      badgeText: '+1 BOOK (DEMO)',
      colorTheme: 'blue',
    });
  } else if (type === 'CHECKIN') {
    const staffName = 'Thuý Kiều';
    triggerWithQuote({ type: 'CHECKIN', staffName }, getRandomQuote(CHECKIN_QUOTES, staffName), {
      id: demoId,
      kind: 'CHECKIN',
      staffName,
      avatarUrl: DEMO_AVATAR_KIEU,
      badgeText: '+1 CHECK-IN (DEMO)',
      colorTheme: 'emerald',
    });
  } else if (type === 'COMBO') {
    const staffName = 'Bích Phượng';
    const comboName = 'Combo Nàng Thơ 5 Buổi';
    const comboPrice = 5900000;
    const priceSpeech = ` trị giá ${formatCurrencyForSpeech(comboPrice)}`;
    triggerWithQuote(
      { type: 'COMBO', staffName, comboPackageName: comboName, comboPrice, cvStaffName: 'Thuý Kiều' },
      `Đỉnh cao tư vấn! Chúc mừng ${staffName} vừa chốt thành công ${comboName}${priceSpeech}! Đẳng cấp và chuyên nghiệp quá em ơi!`,
      {
        id: demoId,
        kind: 'COMBO',
        staffName,
        avatarUrl: DEMO_AVATAR_PHUONG,
        badgeText: '✨ +CHỐT COMBO NÀNG THƠ (5.900.000đ)! (DEMO)',
        colorTheme: 'purple',
        hasCombo: true,
        comboPackageName: comboName,
        comboPrice,
      }
    );
  } else if (type === 'TIP') {
    const cvName = 'Thuý Kiều';
    const ccName = 'Bích Phượng';
    const tipAmount = 100000;
    const tipSpeech = formatCurrencyForSpeech(tipAmount);
    triggerWithQuote(
      { type: 'TIP', staffName: cvName, tipAmount, cvStaffName: cvName, ccStaffName: ccName },
      `Khách yêu vừa gửi tặng tiền tip ${tipSpeech}! Chúc mừng Chuyên Viên ${cvName} và Tư Vấn ${ccName} đã mang lại sự hài lòng tuyệt đối!`,
      {
        id: demoId,
        kind: 'TIP',
        staffName: cvName,
        avatarUrl: DEMO_AVATAR_KIEU,
        badgeText: '💛 +TIP KHÁCH THƯỞNG 100.000đ! (DEMO)',
        colorTheme: 'gold',
        hasTip: true,
        tipAmount,
        assignedStaffName: cvName,
        checkInStaffName: ccName,
      }
    );
  } else if (type === 'DONE') {
    const staffName = 'Thuý Kiều';
    triggerWithQuote({ type: 'DONE', staffName }, getRandomQuote(DONE_QUOTES, staffName), {
      id: demoId,
      kind: 'DONE',
      staffName,
      avatarUrl: DEMO_AVATAR_KIEU,
      badgeText: '+1 DONE (DEMO)',
      colorTheme: 'emerald',
    });
  } else if (type === 'CHECKIN_18') {
    enqueueCelebration({
      id: demoId,
      kind: 'MILESTONE',
      staffName: 'Toàn team Telesales & Sảnh đón',
      textToSpeak:
        'Chúc mừng cả đội Telesales và Sảnh đón! 18 lượt Check-in khách lẻ đã hoàn thành trọn vẹn, đạt 100% chỉ tiêu hôm nay! Tinh thần tiếp đón nồng hậu, ân cần và chuyên nghiệp của các em đã tạo nên một ngày rực rỡ. Xin nhiệt liệt chúc mừng tất cả các thiên thần Wings!',
      badgeText: '🎉 HOÀN THÀNH 18 CHECK-IN! (DEMO)',
      colorTheme: 'emerald',
      changeResult: '18/18 In · 100% ĐẠT',
    });
  } else {
    enqueueCelebration({
      id: demoId,
      kind: 'MILESTONE',
      textToSpeak:
        '25 Book! Một con số hoàn hảo minh chứng cho sức mạnh đồng đội và 4 giá trị văn hóa Wings. Anh rất tự hào về tinh thần chiến binh ngọt ngào của tất cả các em!',
      badgeText: '👑 CÁN MỐC 25 BOOK! (DEMO)',
      colorTheme: 'amber',
    });
  }
}
