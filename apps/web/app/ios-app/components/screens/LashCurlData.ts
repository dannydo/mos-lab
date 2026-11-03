export interface Point2D {
  x: number;
  y: number;
}

export interface LashCurlDetail {
  id: string;
  code: string;
  label: string;
  degrees: number;
  angleLabel: string;
  category: 'SUBTLE' | 'DRAMATIC' | 'LIFT UP';
  categoryTitle: string;
  categorySubtitle: string;
  tag?: string;
  tagColor?: string;
  shortDesc: string;
  headline: string;
  description: string;
  suitableEyes: string;
  aestheticEffect: string;
  recommendedStyles: string;
  technicianTip: string;
  // Standardized Cubic Bezier control points in 116x76 viewBox
  p0: Point2D;
  p1: Point2D;
  p2: Point2D;
  p3: Point2D;
  // For L-curl: G1-continuous 2-segment spline (straight downward base -> rounded elbow -> lift)
  isLForm?: boolean;
  lElbow?: Point2D;
  lCtrl1?: Point2D;
  lCtrl2?: Point2D;
}

/**
 * Natural Lash (Sợi mi thật làm nền so sánh chuẩn BL Lashes)
 * Gốc mi bắt đầu từ trên trái, nghiêng xuống theo chiều mọc tự nhiên của mi mắt trên (~28°)
 * rồi thoải dần ra ngọn nhọn ở phía dưới bên phải.
 */
export const NATURAL_LASH_BEZIER: {
  p0: Point2D;
  p1: Point2D;
  p2: Point2D;
  p3: Point2D;
} = {
  p0: { x: 16, y: 44.2 },
  p1: { x: 36, y: 56.2 },
  p2: { x: 58, y: 61.2 },
  p3: { x: 84, y: 61.8 },
};

export const LASH_CURL_LIST: LashCurlDetail[] = [
  {
    id: 'J',
    code: 'J',
    label: 'J Curl (30°)',
    degrees: 30,
    angleLabel: '30°',
    category: 'SUBTLE',
    categoryTitle: 'SUBTLE · TỰ NHIÊN',
    categorySubtitle: 'For Straight-Angle Natural Lash (Mi thật mọc thẳng)',
    shortDesc: 'Thẳng nhẹ tự nhiên',
    headline: 'Độ Cong J Curl (30°) · Nhẹ Nhàng Tự Nhiên',
    description:
      'Chân mi ôm sát theo độ dốc của sợi mi thật, phần thân và ngọn nâng nhẹ 30° tạo hiệu ứng dài mi mộc tự nhiên.',
    suitableEyes: 'Mắt mí to rõ, mi mọc thẳng hoặc hơi cong nhẹ, khách thích vẻ đẹp tự nhiên như mi thật.',
    aestheticEffect: 'Kéo dài đuôi mắt thanh tú, giữ nét chân thật tuyệt đối.',
    recommendedStyles: 'Natural (Tự nhiên), Classic 1D, Mi Dưới (Lashes Under).',
    technicianTip: 'Không dùng cho mắt có mi mọc chúc sâu vì độ nâng nhẹ chưa đủ mở tầm nhìn.',
    p0: { x: 16, y: 43.2 },
    p1: { x: 36, y: 58.0 },
    p2: { x: 64, y: 60.0 },
    p3: { x: 94, y: 41.0 },
    isLForm: false,
  },
  {
    id: 'B',
    code: 'B',
    label: 'B Curl (45°)',
    degrees: 45,
    angleLabel: '45°',
    category: 'SUBTLE',
    categoryTitle: 'SUBTLE · TỰ NHIÊN',
    categorySubtitle: 'For Straight-Angle Natural Lash (Mi thật mọc thẳng)',
    shortDesc: 'Cong tự nhiên vừa',
    headline: 'Độ Cong B Curl (45°) · Cong Dịu Dàng Á Đông',
    description:
      'Bám dọc theo gốc mi thật rồi uốn võng mềm mại lên góc 45°, thanh thoát hơn J Curl nhưng vẫn cực kỳ tự nhiên.',
    suitableEyes: 'Mắt tròn, mắt hạnh nhân, khách công sở cần hàng mi cong nhẹ nhàng lịch sự.',
    aestheticEffect: 'Mở rộng đôi mắt nhẹ nhàng, tạo ánh nhìn tươi tắn rạng rỡ không cần bấm mi.',
    recommendedStyles: 'Natural, New Flawless Mink mỏng nhẹ (0.07mm).',
    technicianTip: 'Diện tích tiếp xúc keo ở gốc mi dài giúp độ bền giữ mi rất cao.',
    p0: { x: 16, y: 43.2 },
    p1: { x: 36, y: 58.5 },
    p2: { x: 66, y: 58.0 },
    p3: { x: 90, y: 25.0 },
    isLForm: false,
  },
  {
    id: 'C',
    code: 'C',
    label: 'C Curl (55°)',
    degrees: 55,
    angleLabel: '55°',
    category: 'DRAMATIC',
    categoryTitle: 'DRAMATIC · NỔI BẬT',
    categorySubtitle: 'For Straight & Downwards Natural Lash (Mi ngang & chúc)',
    tag: 'Kinh Điển',
    tagColor: '#3B82F6',
    shortDesc: 'Cong thanh thoát',
    headline: 'Độ Cong C Curl (55°) · Tiêu Chuẩn Vàng Kinh Điển',
    description:
      'Độ cong chữ C tròn đều vươn cao khỏi nền mi thật, tạo hiệu ứng như vừa bấm mi và chuốt mascara hoàn hảo.',
    suitableEyes: 'Phù hợp hầu hết mọi dáng mắt, đặc biệt mắt có mi mọc ngang hoặc hơi chúc nhẹ.',
    aestheticEffect: 'Mở to mắt rõ rệt, tạo hiệu ứng mắt búp bê long lanh cuốn hút.',
    recommendedStyles: 'New Flawless (Độc quyền Wings), Classic, Doll, Kim - K.',
    technicianTip: 'Độ cong quốc dân dễ phối với mọi độ dày từ 0.05 đến 0.12mm.',
    p0: { x: 16, y: 43.2 },
    p1: { x: 37, y: 59.5 },
    p2: { x: 72, y: 56.0 },
    p3: { x: 81, y: 14.0 },
    isLForm: false,
  },
  {
    id: 'D',
    code: 'D',
    label: 'D Curl (70°)',
    degrees: 70,
    angleLabel: '70°',
    category: 'DRAMATIC',
    categoryTitle: 'DRAMATIC · NỔI BẬT',
    categorySubtitle: 'For Straight & Downwards Natural Lash (Mi ngang & chúc)',
    tag: 'Ấn Tượng',
    tagColor: '#EF4444',
    shortDesc: 'Cong nhiều nổi bật',
    headline: 'Độ Cong D Curl (70°) · Vòm Cong Búp Bê Nổi Bật',
    description:
      'Độ uốn vòm tròn sâu nhất (tương đương D/U Curl trên bảng chuẩn), ngọn mi uốn vòng ngược nhẹ về phía mí mắt.',
    suitableEyes: 'Khách mắt sâu, mí to, mi mọc chúc nhiều hoặc khách chuộng phong cách sắc sảo.',
    aestheticEffect: 'Mắt mở to tròn cực đại như búp bê, hàng mi vút cong nổi bật.',
    recommendedStyles: 'Doll (Búp bê tròn mắt), New Volume 2D, HyperLight, New Classic 1D.',
    technicianTip: 'Kiểm tra khoảng cách mí mắt trên để ngọn mi uốn cong không chạm bầu mắt khi mở to.',
    p0: { x: 16, y: 43.2 },
    p1: { x: 39, y: 61.5 },
    p2: { x: 83, y: 49.0 },
    p3: { x: 63, y: 11.0 },
    isLForm: false,
  },
  {
    id: 'LJ',
    code: 'LJ',
    label: 'LJ Curl (55° Lift)',
    degrees: 55,
    angleLabel: '55° L-J',
    category: 'LIFT UP',
    categoryTitle: 'LIFT UP · IVYLIGHT NÂNG MÍ',
    categorySubtitle: 'For Hooded Eyelids, Deep Set Or Droopy Eyes (Gốc L + Ngọn J)',
    tag: 'IVYLIGHT',
    tagColor: '#10B981',
    shortDesc: 'Gốc L · Ngọn J tự nhiên',
    headline: 'Độ Cong LJ Curl (55° Lift) · Gốc Nâng Mí + Ngọn Tự Nhiên',
    description:
      'Chân mi chữ L phẳng ôm sát gốc mi thật 2-3mm giúp đẩy mí lót, kết hợp phần thân và ngọn cong nhẹ tự nhiên theo dáng J.',
    suitableEyes: 'Khách mắt một mí hoặc mí lót nhẹ thích vẻ đẹp thanh thoát tự nhiên của dòng Ivylight 3L-5L.',
    aestheticEffect: 'Nâng mí nhẹ nhàng, kéo dài tia cánh tiên tự nhiên không bị quá cong.',
    recommendedStyles: 'Ivylight 3L / 4L / 5L — Thiết kế Natural.',
    technicianTip: 'Chân L bám keo chắc chắn trên sợi mi thật mọc ngang hoặc hơi chúc.',
    p0: { x: 16, y: 43.2 },
    p1: { x: 30, y: 50.0 },
    p2: { x: 43, y: 56.0 },
    p3: { x: 90, y: 26.0 },
    isLForm: true,
    lElbow: { x: 40, y: 54.4 },
    lCtrl1: { x: 47, y: 57.5 },
    lCtrl2: { x: 66, y: 48.0 },
  },
  {
    id: 'LB',
    code: 'LB',
    label: 'LB Curl (70° Lift)',
    degrees: 70,
    angleLabel: '70° L-B',
    category: 'LIFT UP',
    categoryTitle: 'LIFT UP · IVYLIGHT NÂNG MÍ',
    categorySubtitle: 'For Hooded Eyelids, Deep Set Or Droopy Eyes (Gốc L + Ngọn B)',
    tag: 'HOT IVYLIGHT',
    tagColor: '#FFB400',
    shortDesc: 'Gốc L · Ngọn B vừa vặn',
    headline: 'Độ Cong LB Curl (70° Lift) · Chuẩn Vàng Nâng Mí Ivylight',
    description:
      'Chân mi chữ L phẳng nâng vượt nếp mí sụp, phần ngọn uốn cong độ B hài hòa giúp mở to đôi mắt tươi tắn.',
    suitableEyes: 'Khách mắt mí sụp, mí lót hoặc mắt sâu chọn dòng Ivylight 3L/4L/5L.',
    aestheticEffect: 'Đẩy nâng mí rõ rệt, các tia cánh tiên vươn đều thanh lịch.',
    recommendedStyles: 'Ivylight 3L / 4L / 5L — Thiết kế Natural.',
    technicianTip: 'Độ cong LB được chọn nhiều nhất cho dòng Ivylight tại Wings Lashes.',
    p0: { x: 16, y: 43.2 },
    p1: { x: 30, y: 50.0 },
    p2: { x: 43, y: 56.0 },
    p3: { x: 78, y: 15.5 },
    isLForm: true,
    lElbow: { x: 40, y: 54.4 },
    lCtrl1: { x: 47, y: 57.5 },
    lCtrl2: { x: 59, y: 44.5 },
  },
  {
    id: 'LC',
    code: 'LC',
    label: 'LC Curl (85° Lift)',
    degrees: 85,
    angleLabel: '85° L-C',
    category: 'LIFT UP',
    categoryTitle: 'LIFT UP · IVYLIGHT NÂNG MÍ',
    categorySubtitle: 'For Hooded Eyelids, Deep Set Or Droopy Eyes (Gốc L + Ngọn C)',
    tag: 'NÂNG MÍ SÂU',
    tagColor: '#10B981',
    shortDesc: 'Gốc L · Ngọn C cuốn hút',
    headline: 'Độ Cong LC Curl (85° Lift) · Cứu Tinh Mí Sụp Dày & Mắt Một Mí',
    description:
      'Chân mi phẳng ôm thẳng theo chiều dốc của sợi mi thật rồi bẻ góc nâng cao kết hợp vòm cong C cuốn hút vượt qua nếp mí sụp dày.',
    suitableEyes: 'Khách mắt một mí, mí sụp nhiều hoặc mí lót dày mỡ cần độ nâng tối đa.',
    aestheticEffect: 'Đẩy nâng mí mắt vượt trội, giúp ngọn mi vươn lộ rõ sắc sảo.',
    recommendedStyles: 'Ivylight 3L / 4L / 5L — Thiết kế Natural.',
    technicianTip: 'Chân mi phẳng tiếp xúc tối đa với mi thật giúp độ bền vượt trội 5-7 tuần.',
    p0: { x: 16, y: 43.2 },
    p1: { x: 30, y: 50.0 },
    p2: { x: 43, y: 56.0 },
    p3: { x: 66, y: 12.0 },
    isLForm: true,
    lElbow: { x: 40, y: 54.4 },
    lCtrl1: { x: 48, y: 57.5 },
    lCtrl2: { x: 66, y: 41.0 },
  },
];
