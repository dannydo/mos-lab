import { ActiveCelebration, getTodayDateKey } from './tvCelebrationTypes';

export function evaluateTvMilestones(params: {
  date: string;
  bookActual: number;
  doneActual: number;
  checkinActual?: number;
  isInitialized: boolean;
  announcedMilestones: Set<string>;
  enqueueCelebration: (event: ActiveCelebration) => void;
}) {
  const {
    date,
    bookActual,
    doneActual,
    checkinActual = 0,
    isInitialized,
    announcedMilestones,
    enqueueCelebration,
  } = params;

  const storageKey = `MOS_TV_ANNOUNCED_MILESTONES_${getTodayDateKey()}`;

  // Hydrate announced milestones on first run
  if (announcedMilestones.size === 0 && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const list: string[] = JSON.parse(raw);
        list.forEach((id) => announcedMilestones.add(id));
      }
    } catch {}
  }

  const saveMilestonesToStorage = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(announcedMilestones)));
      } catch {}
    }
  };

  // If system not yet initialized with live events, mark all milestones up to current actuals as seen so they are NOT announced on refresh/reconnect
  if (!isInitialized) {
    if (bookActual >= 10) announcedMilestones.add(`milestone-${date}-book-10`);
    if (bookActual >= 20) announcedMilestones.add(`milestone-${date}-book-20`);
    if (bookActual >= 25) announcedMilestones.add(`milestone-${date}-book-25`);
    if (bookActual > 25) announcedMilestones.add(`milestone-${date}-book-gt25`);
    if (checkinActual >= 18) announcedMilestones.add(`milestone-${date}-checkin-18`);
    if (checkinActual > 18) announcedMilestones.add(`milestone-${date}-checkin-gt18`);
    if (doneActual >= 18) announcedMilestones.add(`milestone-${date}-done-18`);
    saveMilestonesToStorage();
    return;
  }

  const checkAndQueue = (key: string, text: string, badge: string, colorTheme: 'amber' | 'emerald' = 'amber') => {
    const milestoneKey = `milestone-${date}-${key}`;
    if (!announcedMilestones.has(milestoneKey)) {
      announcedMilestones.add(milestoneKey);
      saveMilestonesToStorage();
      enqueueCelebration({
        id: milestoneKey,
        kind: 'MILESTONE',
        staffName: 'Toàn team Telesales & Sảnh đón',
        textToSpeak: text,
        badgeText: badge,
        colorTheme,
        changeResult: badge,
      });
    }
  };

  // Milestone rules (Specification 3 & Wings 4 Cultural Keys):
  if (bookActual >= 10) {
    checkAndQueue(
      'book-10',
      'Cả đội chú ý! 10 Book đã vào giỏ rồi! Năng lượng vui vẻ và chân thành của các em đang thắp sáng cả ngày hôm nay. Tiếp tục cùng anh tăng tốc bùng nổ nhé!',
      '🏆 CÁN MỐC 10 BOOK!',
      'amber'
    );
  }
  if (bookActual >= 20) {
    checkAndQueue(
      'book-20',
      'Xuất sắc lắm các cô gái của anh! 20 Book rồi! Tư vấn khoa học, chăm sóc ân cần, phong độ của cả đội hôm nay thực sự quá đỗi quyến rũ và không thể ngăn cản!',
      '🔥 CHẠM MỐC 20 BOOK!',
      'amber'
    );
  }
  if (bookActual >= 25) {
    checkAndQueue(
      'book-25',
      '25 Book! Một con số hoàn hảo minh chứng cho sức mạnh đồng đội và 4 giá trị văn hóa Wings. Anh rất tự hào về tinh thần chiến binh ngọt ngào của tất cả các em!',
      '👑 CÁN MỐC 25 BOOK!',
      'amber'
    );
  }
  if (bookActual > 25) {
    checkAndQueue(
      'book-gt25',
      'Kỳ tích vượt 25 Book rồi! Cả phòng Telesales hôm nay tỏa sáng rực rỡ! Bản lĩnh, khoa học và ngập tràn đam mê, các em luôn là số một trong lòng anh!',
      '🚀 VƯỢT MỐC 25 BOOK!',
      'amber'
    );
  }
  if (checkinActual >= 18) {
    checkAndQueue(
      'checkin-18',
      'Chúc mừng cả đội Telesales và Sảnh đón! 18 lượt Check-in khách lẻ đã hoàn thành trọn vẹn, đạt 100% chỉ tiêu hôm nay! Tinh thần tiếp đón nồng hậu, ân cần và chuyên nghiệp của các em đã tạo nên một ngày rực rỡ. Xin nhiệt liệt chúc mừng tất cả các thiên thần Wings!',
      '🎉 HOÀN THÀNH 18 CHECK-IN!',
      'emerald'
    );
  }
  if (checkinActual > 18) {
    checkAndQueue(
      'checkin-gt18',
      'Kỳ tích vượt 18 Check-in khách lẻ rồi! Sảnh đón và đội ngũ tư vấn hôm nay làm việc quá xuất sắc! Xin chúc mừng tất cả các thiên thần Wings!',
      '🚀 VƯỢT MỐC 18 CHECK-IN!',
      'emerald'
    );
  }
  if (doneActual >= 18) {
    checkAndQueue(
      'done-18',
      '18 Done đã hoàn thành trọn vẹn! Trái ngọt xứng đáng cho sự ân cần, chân thành và khoa học của từng cuộc gọi. Anh xin gửi ngàn lời chúc mừng đến các cô gái tuyệt vời của Wings!',
      '🎉 HOÀN THÀNH 18 DONE!',
      'amber'
    );
  }
}
