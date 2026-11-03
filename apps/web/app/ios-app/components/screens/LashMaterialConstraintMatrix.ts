/**
 * Ma Trận Ràng Buộc Kỹ Thuật 3 Bước Chuẩn Wings Lashes
 * Quy trình tư vấn bắt buộc:
 *   Bước 1: Chọn Chất Liệu / Dòng Mi (Material Family)
 *   Bước 2: Chọn Thiết Kế (Design) trên hạn chế của Chất Liệu
 *   Bước 3: Chọn Độ Cong (Curl), Độ Dày (Thickness), Chiều Dài (Length) & Kỹ Thuật Fan (Volume)
 *           theo đúng giới hạn của Chất Liệu đã chọn.
 *
 * Hỗ trợ chỉnh sửa trực tiếp (Live Configurator):
 *   Chất liệu -> Thiết kế cho phép -> Độ dày -> Chiều dài -> Độ cong.
 */

export interface LashDesignOption {
  id: string;
  name: string;
  shortName: string;
  desc: string;
  eyeEffect: string;
  image: string;
}

export const ALL_LASH_DESIGNS: LashDesignOption[] = [
  {
    id: 'Natural',
    name: 'Natural (Tự nhiên)',
    shortName: 'Natural',
    desc: 'Ôm đều theo dáng mắt thật, hài hòa thanh lịch',
    eyeEffect: 'Tự nhiên như mi thật mọc dài',
    image: '/lashes/designs/lash-design-natural.jpg',
  },
  {
    id: 'Doll',
    name: 'Doll (Búp bê tròn mắt)',
    shortName: 'Doll',
    desc: 'Điểm nhấn sợi dài ở chính giữa con ngươi',
    eyeEffect: 'Mở to tròn mắt long lanh',
    image: '/lashes/designs/lash-design-doll.jpg',
  },
  {
    id: 'Wing',
    name: 'Wing (Mắt mèo Sexy)',
    shortName: 'Wing',
    desc: 'Tăng dần chiều dài về phía đuôi mắt',
    eyeEffect: 'Kéo dài đuôi mắt sắc sảo, quyến rũ',
    image: '/lashes/designs/lash-design-wing.jpg',
  },
  {
    id: 'Kim - K',
    name: 'Kim - K (Sole Katun)',
    shortName: 'Kim - K',
    desc: 'Đan xen các trụ sợi dài ngắn tạo hiệu ứng tia',
    eyeEffect: 'Bắt sáng nổi bật, cá tính thời thượng',
    image: '/lashes/designs/lash-design-kimk.jpg',
  },
];

export interface LashThicknessOption {
  id: string;
  value: string;
  label: string;
  note: string;
}

export const ALL_LASH_THICKNESSES: LashThicknessOption[] = [
  { id: '0.05 mm', value: '0.05', label: '0.05 mm', note: 'Siêu mảnh / Fan 3D-5D & Ivylight' },
  { id: '0.07 mm', value: '0.07', label: '0.07 mm', note: 'Mảnh nhẹ tự nhiên' },
  { id: '0.10 mm', value: '0.10', label: '0.10 mm', note: 'Tự nhiên rõ nét (Chuẩn)' },
  { id: '0.12 mm', value: '0.12', label: '0.12 mm', note: 'Đậm chân mascara nhẹ' },
  { id: '0.15 mm', value: '0.15', label: '0.15 mm', note: 'Sợi đơn đậm sắc nét' },
];

export interface LashLengthMappingOption {
  id: string;
  label: string;
  desc: string;
  singleMmList: string[];
}

export const ALL_LENGTH_MAPPINGS: LashLengthMappingOption[] = [
  { id: '6-7 mm', label: '6 - 7 mm (Mi dưới tự nhiên)', desc: 'Đầu 6mm · Giữa & Đuôi 7mm', singleMmList: ['6', '7'] },
  { id: '7-8 mm', label: '7 - 8 mm (Mi dưới rõ nét)', desc: 'Đầu 6mm · Giữa 7mm · Đuôi 8mm', singleMmList: ['7', '8'] },
  {
    id: '8-10 mm',
    label: '8 - 10 mm (Tự nhiên ngắn)',
    desc: 'Đầu 8mm · Thân 9mm · Đuôi 10mm',
    singleMmList: ['8', '9', '10'],
  },
  {
    id: '9-11 mm',
    label: '9 - 11 mm (Hài hòa chuẩn)',
    desc: 'Đầu 9mm · Thân 10mm · Đuôi 11mm',
    singleMmList: ['9', '10', '11'],
  },
  {
    id: '10-12 mm',
    label: '10 - 12 mm (Chuẩn Vàng)',
    desc: 'Tỷ lệ phổ biến nhất tại Wings',
    singleMmList: ['10', '11', '12'],
  },
  {
    id: '11-13 mm',
    label: '11 - 13 mm (Dài thanh thoát)',
    desc: 'Đầu 10mm · Thân 11-12mm · Đuôi 13mm',
    singleMmList: ['11', '12', '13'],
  },
  {
    id: '12-14 mm',
    label: '12 - 14 mm (Nổi bật sắc sảo)',
    desc: 'Đầu 10mm · Thân 12mm · Đuôi 14mm',
    singleMmList: ['12', '13', '14'],
  },
  {
    id: '8-10-12 mm',
    label: '8 - 10 - 12 mm (So le chuẩn)',
    desc: 'Phối tầng so le 8mm · 10mm · 12mm',
    singleMmList: ['8', '10', '12'],
  },
  {
    id: '9-11-13 mm',
    label: '9 - 11 - 13 mm (Tia dài)',
    desc: 'Phối tầng so le 9mm · 11mm · 13mm',
    singleMmList: ['9', '11', '13'],
  },
  {
    id: '10-12-14 mm',
    label: '10 - 12 - 14 mm (Ấn tượng)',
    desc: 'Phối tầng so le 10mm · 12mm · 14mm',
    singleMmList: ['10', '12', '14'],
  },
];

export const ALL_SINGLE_LENGTHS: string[] = [
  '6 mm',
  '7 mm',
  '8 mm',
  '9 mm',
  '10 mm',
  '11 mm',
  '12 mm',
  '13 mm',
  '14 mm',
  '15 mm',
];

export const ALL_LASH_CURL_CODES: string[] = ['J', 'B', 'C', 'D', 'LJ', 'LB', 'LC'];

export const ALL_VOLUME_OPTIONS: string[] = [
  '1D (Classic)',
  '2D (Double Volume)',
  '3D (Natural Vol)',
  '4D (Glamour Vol)',
  '5D (Mega Vol)',
  '3D (Ivylight 3L)',
  '4D (Ivylight 4L)',
  '5D (Ivylight 5L)',
];

export interface LashMaterialSpec {
  id: string;
  code: string;
  name: string;
  shortLabel: string;
  badge: string;
  priceRange: string;
  summary: string;
  constraintReason: string;
  // Bước 2: Các Thiết kế được phép và lý do khóa các thiết kế còn lại
  allowedDesigns: string[];
  defaultDesign: string;
  lockedDesignReasons: Record<string, string>;
  // Bước 3: Độ cong, Độ dày, Chiều dài, Volume & Số sợi được phép
  allowedCurls: string[];
  defaultCurl: string;
  lockedCurlReason: string;
  allowedThicknesses: string[];
  defaultThickness: string;
  lockedThicknessReason: string;
  allowedLengthMappings: LashLengthMappingOption[];
  allowedSingleLengths: string[];
  defaultLength: string;
  allowedVolumes: string[];
  defaultVolume: string;
  allowedCounts: string[];
  defaultCount: string;
  allowedColors: Array<{ id: string; label: string; colorCode: string }>;
}

export const STANDARD_COLORS = [
  { id: 'Đen Tuyền (Jet Black)', label: 'Đen Tuyền (Jet Black)', colorCode: '#111827' },
  { id: 'Nâu Tây (Brown Choco)', label: 'Nâu Tây (Choco)', colorCode: '#78350F' },
  { id: 'Xanh Đậm (Dark Blue)', label: 'Xanh Đậm (Dark Blue)', colorCode: '#1E3A8A' },
  { id: 'Tím Than (Purple Accent)', label: 'Tím Than (Purple)', colorCode: '#581C87' },
];

export const DEFAULT_LASH_MATERIAL_CATALOG: LashMaterialSpec[] = [
  {
    id: 'New Flawless Mink',
    code: 'FLAWLESS_MINK',
    name: 'New Flawless Mink (Tơ Lụa Độc Quyền)',
    shortLabel: 'Flawless Mink',
    badge: 'BEST SELLER · 770K+',
    priceRange: '770.000đ – 1.770.000đ',
    summary: 'Sợi tơ lụa Mink cao cấp bóng mượt, đi 1 sợi tỷ lệ vàng nhẹ êm tuyệt đối như mi thật.',
    constraintReason:
      'Flawless Mink chỉ mở 3 thiết kế (Natural, Doll, Wing), chỉ dùng 2 độ cong B & C và độ dày mảnh 0.07mm – 0.10mm.',
    allowedDesigns: ['Natural', 'Doll', 'Wing'],
    defaultDesign: 'Natural',
    lockedDesignReasons: {
      'Kim - K': 'Flawless Mink đi sợi đơn mượt đều, chuyển sang HyperLight nếu khách muốn đánh trụ Kim-K',
    },
    allowedCurls: ['B', 'C'],
    defaultCurl: 'C',
    lockedCurlReason: 'Flawless Mink chỉ sử dụng 2 độ cong chuẩn B (45°) và C (55°)',
    allowedThicknesses: ['0.07 mm', '0.10 mm'],
    defaultThickness: '0.10 mm',
    lockedThicknessReason: 'Chỉ dùng 0.07mm – 0.10mm để bảo toàn độ nhẹ không cộm của dòng Flawless',
    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((m) =>
      ['8-10 mm', '9-11 mm', '10-12 mm', '11-13 mm'].includes(m.id)
    ),
    allowedSingleLengths: ['7 mm', '8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm'],
    defaultLength: '10-12 mm',
    allowedVolumes: ['1D (Classic)'],
    defaultVolume: '1D (Classic)',
    allowedCounts: [
      '50 sợi (Mỏng)',
      '60 sợi',
      '70 sợi',
      '80 sợi',
      '90 sợi',
      '100 sợi (Chuẩn)',
      '110 sợi',
      '120 sợi',
      '130+ sợi (Dày)',
    ],
    defaultCount: '100 sợi (Chuẩn)',
    allowedColors: STANDARD_COLORS,
  },
  {
    id: 'HyperLight',
    code: 'HYPERLIGHT',
    name: 'HyperLight (Siêu Nhẹ Kháng Nước)',
    shortLabel: 'HyperLight',
    badge: 'FAN 3D-5D · 440K+',
    priceRange: '440.000đ – 1.770.000đ',
    summary: 'Sợi mi siêu mảnh kháng nước, chuyên tạo fan Volume 2D–5D bồng bềnh và sắc sảo.',
    constraintReason:
      'Mở đủ 4 thiết kế (Natural, Doll, Wing, Kim-K), chỉ sử dụng 3 độ cong B, C, D và sợi siêu mảnh 0.05mm – 0.07mm.',
    allowedDesigns: ['Natural', 'Doll', 'Wing', 'Kim - K'],
    defaultDesign: 'Doll',
    lockedDesignReasons: {},
    allowedCurls: ['B', 'C', 'D'],
    defaultCurl: 'C',
    lockedCurlReason: 'HyperLight chỉ sử dụng 3 độ cong B (45°), C (55°) và D (70°)',
    allowedThicknesses: ['0.05 mm', '0.07 mm'],
    defaultThickness: '0.05 mm',
    lockedThicknessReason: 'Fan 3D–5D bắt buộc dùng sợi 0.05mm – 0.07mm siêu mảnh để bảo vệ gốc mi thật',
    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((m) =>
      ['9-11 mm', '10-12 mm', '11-13 mm', '12-14 mm'].includes(m.id)
    ),
    allowedSingleLengths: ['8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm', '14 mm'],
    defaultLength: '10-12 mm',
    allowedVolumes: ['2D (Double Volume)', '3D (Natural Vol)', '4D (Glamour Vol)', '5D (Mega Vol)'],
    defaultVolume: '3D (Natural Vol)',
    allowedCounts: [
      '50 fan (Mỏng)',
      '60 fan',
      '70 fan',
      '80 fan',
      '90 fan',
      '100 fan (Chuẩn)',
      '110 fan',
      '120 fan',
      '130+ fan (Dày)',
    ],
    defaultCount: '100 fan (Chuẩn)',
    allowedColors: STANDARD_COLORS,
  },
  {
    id: 'Ivylight Thiết Kế',
    code: 'IVYLIGHT',
    name: 'Ivylight 3L / 4L / 5L (Cánh Tiên Nâng Mí)',
    shortLabel: 'Ivylight 3L-5L',
    badge: 'NÂNG MÍ · 770K+',
    priceRange: '770.000đ – 2.110.000đ',
    summary: 'Cấu trúc sợi dệt 3L/4L/5L chuyên biệt giúp đẩy mí sụp, tạo hiệu ứng tia cánh tiên thanh thoát.',
    constraintReason:
      'Cấu trúc sợi dệt Ivylight chỉ có duy nhất thiết kế Natural, chỉ dùng bộ 3 độ cong gốc L nâng mí (LJ, LB, LC) và sợi mảnh 0.05mm – 0.07mm.',
    allowedDesigns: ['Natural'],
    defaultDesign: 'Natural',
    lockedDesignReasons: {
      Doll: 'Ivylight 3L-5L chỉ thiết kế duy nhất theo form Natural',
      Wing: 'Ivylight 3L-5L chỉ thiết kế duy nhất theo form Natural',
      'Kim - K': 'Ivylight đã có sẵn cấu trúc tia cánh tiên 3L/4L/5L trên nền Natural',
    },
    allowedCurls: ['LJ', 'LB', 'LC'],
    defaultCurl: 'LB',
    lockedCurlReason: 'Ivylight chỉ sử dụng bộ 3 độ cong chân L nâng mí chuyên biệt: LJ, LB, LC',
    allowedThicknesses: ['0.05 mm', '0.07 mm'],
    defaultThickness: '0.05 mm',
    lockedThicknessReason: 'Sợi dệt đa tầng 3L/4L/5L bắt buộc dùng độ mảnh 0.05mm – 0.07mm',
    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((m) =>
      ['8-10-12 mm', '9-11-13 mm', '10-12-14 mm'].includes(m.id)
    ),
    allowedSingleLengths: ['8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm', '14 mm'],
    defaultLength: '8-10-12 mm',
    allowedVolumes: ['3D (Ivylight 3L)', '4D (Ivylight 4L)', '5D (Ivylight 5L)'],
    defaultVolume: '4D (Ivylight 4L)',
    allowedCounts: [
      '50 nhịp (Mỏng)',
      '60 nhịp',
      '70 nhịp',
      '80 nhịp',
      '90 nhịp',
      '100 nhịp (Chuẩn)',
      '110 nhịp',
      '120 nhịp',
      '130+ nhịp (Dày)',
    ],
    defaultCount: '100 nhịp (Chuẩn)',
    allowedColors: [STANDARD_COLORS[0], STANDARD_COLORS[1]],
  },
  {
    id: 'New Volume 2D',
    code: 'NEW_VOLUME',
    name: 'New Volume 2D (Nhung Đen Đan Đôi)',
    shortLabel: 'New Volume 2D',
    badge: '2D TỰ NHIÊN · 390K+',
    priceRange: '390.000đ – 990.000đ',
    summary: 'Sợi Nhung Đen lì đan đôi 2D giúp chân mi đen rõ nét như kẻ eyeliner nhẹ nhàng.',
    constraintReason: 'Dòng New Volume 2D mở 4 thiết kế, sử dụng 4 độ cong J, B, C, D và độ dày 0.07mm – 0.12mm.',
    allowedDesigns: ['Natural', 'Doll', 'Wing', 'Kim - K'],
    defaultDesign: 'Wing',
    lockedDesignReasons: {},
    allowedCurls: ['J', 'B', 'C', 'D'],
    defaultCurl: 'C',
    lockedCurlReason: 'New Volume 2D chỉ sử dụng 4 độ cong J, B, C, D',
    allowedThicknesses: ['0.07 mm', '0.10 mm', '0.12 mm'],
    defaultThickness: '0.10 mm',
    lockedThicknessReason: 'Kỹ thuật 2D dùng sợi 0.07mm – 0.12mm để giữ độ tơi và không quá nặng',
    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((m) =>
      ['8-10 mm', '9-11 mm', '10-12 mm', '11-13 mm'].includes(m.id)
    ),
    allowedSingleLengths: ['8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm'],
    defaultLength: '9-11 mm',
    allowedVolumes: ['2D (Double Volume)'],
    defaultVolume: '2D (Double Volume)',
    allowedCounts: [
      '50 fan (Mỏng)',
      '60 fan',
      '70 fan',
      '80 fan',
      '90 fan',
      '100 fan (Chuẩn)',
      '110 fan',
      '120 fan',
      '130+ fan (Dày)',
    ],
    defaultCount: '100 fan (Chuẩn)',
    allowedColors: STANDARD_COLORS,
  },
  {
    id: 'New Classic 1D',
    code: 'NEW_CLASSIC',
    name: 'New Classic 1D (Sợi Đơn Truyền Thống)',
    shortLabel: 'New Classic 1D',
    badge: '1D CỔ ĐIỂN · 390K+',
    priceRange: '390.000đ – 880.000đ',
    summary: 'Nối 1 sợi mi giả trên 1 sợi mi thật, tạo hiệu ứng rõ từng sợi như chuốt mascara.',
    constraintReason:
      'Đi 1 sợi đơn 1D với 3 thiết kế (Natural, Doll, Wing), 4 độ cong (J, B, C, D) và 3 độ dày 0.10mm, 0.12mm, 0.15mm.',
    allowedDesigns: ['Natural', 'Doll', 'Wing'],
    defaultDesign: 'Doll',
    lockedDesignReasons: {
      'Kim - K': 'New Classic nối 1 sợi đơn đều nhau, không chập trụ Katun Kim-K',
    },
    allowedCurls: ['J', 'B', 'C', 'D'],
    defaultCurl: 'C',
    lockedCurlReason: 'New Classic 1D chỉ sử dụng 4 độ cong J, B, C, D',
    allowedThicknesses: ['0.10 mm', '0.12 mm', '0.15 mm'],
    defaultThickness: '0.10 mm',
    lockedThicknessReason: 'Đi 1 sợi đơn (1D) chỉ dùng độ dày 0.10mm, 0.12mm hoặc 0.15mm để lên rõ dáng mi',
    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((m) =>
      ['8-10 mm', '9-11 mm', '10-12 mm', '11-13 mm'].includes(m.id)
    ),
    allowedSingleLengths: ['8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm'],
    defaultLength: '9-11 mm',
    allowedVolumes: ['1D (Classic)'],
    defaultVolume: '1D (Classic)',
    allowedCounts: [
      '50 sợi (Mỏng)',
      '60 sợi',
      '70 sợi',
      '80 sợi',
      '90 sợi',
      '100 sợi (Chuẩn)',
      '110 sợi',
      '120 sợi',
      '130+ sợi (Dày)',
    ],
    defaultCount: '100 sợi (Chuẩn)',
    allowedColors: STANDARD_COLORS,
  },
  {
    id: 'Mi Dưới (Under Mink)',
    code: 'UNDER_MINK',
    name: 'Mi Dưới (Flawless Under Mink)',
    shortLabel: 'Mi Dưới (Under)',
    badge: 'MI DƯỚI · 390K',
    priceRange: '390.000đ',
    summary: 'Sợi Mink ngắn chuyên biệt cho hàng mi dưới giúp cân đối đôi mắt to tròn hoàn hảo.',
    constraintReason:
      'Mi dưới bắt buộc chỉ dùng thiết kế Natural, chỉ dùng duy nhất độ cong B (45°), độ dày 0.10mm – 0.15mm và chiều dài 6–8mm.',
    allowedDesigns: ['Natural'],
    defaultDesign: 'Natural',
    lockedDesignReasons: {
      Doll: 'Mi dưới chỉ nối trải đều tự nhiên (Natural)',
      Wing: 'Mi dưới không nối kéo dài đuôi Wing để tránh cộm khóe mắt',
      'Kim - K': 'Mi dưới không đánh trụ Kim-K',
    },
    allowedCurls: ['B'],
    defaultCurl: 'B',
    lockedCurlReason: 'Mi dưới chỉ sử dụng duy nhất độ cong B (45°) để không móc vào mi trên khi chớp mắt',
    allowedThicknesses: ['0.10 mm', '0.12 mm', '0.15 mm'],
    defaultThickness: '0.10 mm',
    lockedThicknessReason: 'Mi dưới sử dụng sợi đơn rõ nét 0.10mm, 0.12mm, 0.15mm',
    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((m) => ['6-7 mm', '7-8 mm'].includes(m.id)),
    allowedSingleLengths: ['6 mm', '7 mm', '8 mm'],
    defaultLength: '6-7 mm',
    allowedVolumes: ['1D (Classic)'],
    defaultVolume: '1D (Classic)',
    allowedCounts: ['20 sợi (Mỏng)', '25 sợi', '30 sợi (Chuẩn)', '35 sợi', '40 sợi', '50+ sợi (Dày)'],
    defaultCount: '30 sợi (Chuẩn)',
    allowedColors: [STANDARD_COLORS[0], STANDARD_COLORS[1]],
  },
];

export const LASH_MATERIAL_CATALOG: LashMaterialSpec[] = DEFAULT_LASH_MATERIAL_CATALOG;

export const MATERIAL_MATRIX_STORAGE_KEY = 'mos_lash_material_constraint_matrix_v4';
export const MATERIAL_MATRIX_UPDATED_EVENT = 'mos-lash-material-catalog-updated';

/**
 * Load material constraint catalog from localStorage (if customized by Danny) or fall back to DEFAULT_LASH_MATERIAL_CATALOG
 */
export function loadMaterialCatalog(): LashMaterialSpec[] {
  if (typeof window === 'undefined') {
    return DEFAULT_LASH_MATERIAL_CATALOG;
  }
  try {
    const raw = window.localStorage.getItem(MATERIAL_MATRIX_STORAGE_KEY);
    if (!raw) return DEFAULT_LASH_MATERIAL_CATALOG;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore parse error
  }
  return DEFAULT_LASH_MATERIAL_CATALOG;
}

/**
 * Save customized material constraint catalog and notify all active screens immediately
 */
export function saveMaterialCatalog(catalog: LashMaterialSpec[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MATERIAL_MATRIX_STORAGE_KEY, JSON.stringify(catalog));
    window.dispatchEvent(new CustomEvent(MATERIAL_MATRIX_UPDATED_EVENT, { detail: catalog }));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Reset material constraint catalog back to Wings canonical defaults
 */
export function resetMaterialCatalogToDefault(): LashMaterialSpec[] {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(MATERIAL_MATRIX_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(MATERIAL_MATRIX_UPDATED_EVENT, { detail: DEFAULT_LASH_MATERIAL_CATALOG }));
    } catch {
      // ignore
    }
  }
  return DEFAULT_LASH_MATERIAL_CATALOG;
}

/**
 * Helper: Resolve material spec from serviceName or material ID against a given catalog
 */
export function resolveMaterialSpec(
  materialOrServiceName?: string,
  catalog: LashMaterialSpec[] = DEFAULT_LASH_MATERIAL_CATALOG
): LashMaterialSpec {
  const list = catalog.length > 0 ? catalog : DEFAULT_LASH_MATERIAL_CATALOG;
  const exact = list.find(
    (m) =>
      m.id.toLowerCase() === (materialOrServiceName || '').trim().toLowerCase() ||
      m.code.toLowerCase() === (materialOrServiceName || '').trim().toLowerCase()
  );
  if (exact) return exact;

  const norm = (materialOrServiceName || '').toLowerCase();
  if (norm.includes('under') || norm.includes('mi dưới')) {
    return list.find((m) => m.code === 'UNDER_MINK') || list[0];
  }
  if (norm.includes('ivylight') || norm.includes('ivy light')) {
    return list.find((m) => m.code === 'IVYLIGHT') || list[0];
  }
  if (norm.includes('hyperlight') || norm.includes('hyper_light') || norm.includes('ultralight')) {
    return list.find((m) => m.code === 'HYPERLIGHT') || list[0];
  }
  if (norm.includes('volume') || norm.includes('2d')) {
    return list.find((m) => m.code === 'NEW_VOLUME') || list[0];
  }
  if (norm.includes('classic')) {
    return list.find((m) => m.code === 'NEW_CLASSIC') || list[0];
  }
  return list[0];
}

/**
 * Ensure all selected downstream specs are valid for the given Material.
 * If any downstream parameter is outside the material's allowed list, snap it to the material's default.
 */
export function sanitizeSelectionForMaterial(
  material: LashMaterialSpec,
  current: {
    design: string;
    curl: string;
    thickness: string;
    length: string;
    volume: string;
    count: string;
    color: string;
  }
): {
  design: string;
  curl: string;
  thickness: string;
  length: string;
  volume: string;
  count: string;
  color: string;
  autoAdjustedFields: string[];
} {
  const autoAdjustedFields: string[] = [];

  const design = material.allowedDesigns.includes(current.design)
    ? current.design
    : (() => {
        autoAdjustedFields.push(`Thiết kế → ${material.defaultDesign || material.allowedDesigns[0]}`);
        return material.defaultDesign || material.allowedDesigns[0] || 'Natural';
      })();

  const curl = material.allowedCurls.includes(current.curl)
    ? current.curl
    : (() => {
        const nextCurl = material.defaultCurl || material.allowedCurls[0] || 'C';
        autoAdjustedFields.push(`Độ cong → ${nextCurl}`);
        return nextCurl;
      })();

  const thickness = material.allowedThicknesses.includes(current.thickness)
    ? current.thickness
    : (() => {
        const nextThick = material.defaultThickness || material.allowedThicknesses[0] || '0.10 mm';
        autoAdjustedFields.push(`Độ dày → ${nextThick}`);
        return nextThick;
      })();

  const validLengths = [...material.allowedLengthMappings.map((m) => m.id), ...material.allowedSingleLengths];
  const length = validLengths.includes(current.length)
    ? current.length
    : (() => {
        const nextLen =
          material.defaultLength ||
          material.allowedLengthMappings[0]?.id ||
          material.allowedSingleLengths[0] ||
          '10-12 mm';
        autoAdjustedFields.push(`Chiều dài → ${nextLen}`);
        return nextLen;
      })();

  const volume = material.allowedVolumes.includes(current.volume)
    ? current.volume
    : (() => {
        const nextVol = material.defaultVolume || material.allowedVolumes[0] || '1D (Classic)';
        autoAdjustedFields.push(`Kỹ thuật → ${nextVol}`);
        return nextVol;
      })();

  const count = material.allowedCounts.includes(current.count)
    ? current.count
    : material.defaultCount || material.allowedCounts[0] || '';

  const validColors = material.allowedColors.map((c) => c.id);
  const color = validColors.includes(current.color)
    ? current.color
    : material.allowedColors[0]?.id || STANDARD_COLORS[0].id;

  return {
    design,
    curl,
    thickness,
    length,
    volume,
    count,
    color,
    autoAdjustedFields,
  };
}

// ============================================================================
// MA TRẬN MAPPING GIÁ TIỀN & ĐIỂM THƯỞNG VÒNG XOAY CHUYÊN VIÊN (CV ROTATION)
// Chuẩn Điều răn CV-001, CV-002 & Danh mục Dịch Vụ Wings Lashes
// ============================================================================

export interface LashRotationPointsBreakdown {
  skuName: string;
  skuPrice: number;
  upgradePrice: number;
  originalPrice: number;
  vatRate: number;
  vatAmount: number;
  totalPriceWithVat: number;
  upgradeVat: number;
  upgradePriceWithVat: number;
  lashPts: number;
  designPts: number;
  fanPts: number;
  typePts: number;
  totalPoints: number;
  summaryLabel: string;
  breakdownLabel: string;
  isRetain?: boolean;
  serviceType?: string;
}

/**
 * Tra cứu mã SKU Wings và Giá niêm yết chuẩn theo [Chất Liệu + Số Lượng Sợi/Kỹ Thuật Fan]
 */
export function resolveLashSkuPricing(
  materialId: string,
  countStr?: string,
  volumeStr?: string,
  serviceType?: string
): { skuName: string; price: number; lashPts: number; fanPts: number; isRetain: boolean } {
  const mid = String(materialId || '').toLowerCase();
  const c = String(countStr || '').toLowerCase();
  const v = String(volumeStr || '').toLowerCase();
  const isRetain =
    String(serviceType || '')
      .toLowerCase()
      .includes('retain') ||
    String(serviceType || '')
      .toLowerCase()
      .includes('dặm');

  // 1. New Flawless Mink
  if (mid.includes('flawless') || mid.includes('mink')) {
    let fanPts = 0;
    if (v.includes('2d')) fanPts = 1;
    else if (v.includes('3d')) fanPts = 3;

    if (isRetain) {
      const lashPts = 20;
      if (c.includes('50'))
        return { skuName: 'Dặm Flawless Mink 350K (50 sợi)', price: 350000, lashPts: 18, fanPts, isRetain };
      if (c.includes('60') || c.includes('70'))
        return { skuName: 'Dặm Flawless Mink 390K (Chuẩn dặm)', price: 390000, lashPts: 20, fanPts, isRetain };
      if (c.includes('80'))
        return { skuName: 'Dặm Flawless Mink 450K (80 sợi)', price: 450000, lashPts: 21, fanPts, isRetain };
      if (c.includes('90') || c.includes('100') || c.includes('chuẩn'))
        return { skuName: 'Dặm Flawless Mink 490K (100 sợi)', price: 490000, lashPts: 22, fanPts, isRetain };
      if (c.includes('110') || c.includes('120'))
        return { skuName: 'Dặm Flawless Mink 590K (120 sợi)', price: 590000, lashPts: 24, fanPts, isRetain };
      return { skuName: 'Dặm Flawless Mink 690K (130+ sợi)', price: 690000, lashPts: 26, fanPts, isRetain };
    } else {
      const lashPts = 32;
      if (c.includes('50'))
        return { skuName: 'New Flawless Mink 660K (50 sợi)', price: 660000, lashPts: 25, fanPts, isRetain };
      if (c.includes('60') || c.includes('70'))
        return { skuName: 'New Flawless Mink 770K (Tự nhiên)', price: 770000, lashPts: 28, fanPts, isRetain };
      if (c.includes('80'))
        return { skuName: 'New Flawless Mink 880K (80 sợi)', price: 880000, lashPts: 30, fanPts, isRetain };
      if (c.includes('110') || c.includes('120'))
        return { skuName: 'New Flawless Mink 1110K (Dày vừa)', price: 1110000, lashPts: 34, fanPts, isRetain };
      if (c.includes('130') || c.includes('đầy đặn') || c.includes('dày'))
        return { skuName: 'New Flawless Mink 1440K (Đầy đặn)', price: 1440000, lashPts: 36, fanPts, isRetain };
      return { skuName: 'New Flawless Mink 990K (Chuẩn)', price: 990000, lashPts: 32, fanPts, isRetain };
    }
  }

  // 2. Ivylight 3L / 4L / 5L
  if (mid.includes('ivylight')) {
    if (isRetain) {
      if (v.includes('5l') || v.includes('5d') || c.includes('130') || c.includes('120')) {
        return { skuName: 'Dặm Ivylight 5L 790K', price: 790000, lashPts: 24, fanPts: 5, isRetain };
      }
      if (v.includes('4l') || v.includes('4d') || c.includes('100') || c.includes('110')) {
        return { skuName: 'Dặm Ivylight 4L 680K', price: 680000, lashPts: 22, fanPts: 4, isRetain };
      }
      return { skuName: 'Dặm Ivylight 3L 550K (Chuẩn dặm)', price: 550000, lashPts: 20, fanPts: 3, isRetain };
    } else {
      if (v.includes('5l') || v.includes('5d') || c.includes('130') || c.includes('120')) {
        return { skuName: 'Ivylight 5L 1440K', price: 1440000, lashPts: 30, fanPts: 5, isRetain };
      }
      if (v.includes('4l') || v.includes('4d') || c.includes('100') || c.includes('110')) {
        return { skuName: 'Ivylight 4L 1220K', price: 1220000, lashPts: 27, fanPts: 4, isRetain };
      }
      return { skuName: 'Ivylight 3L 990K (Chuẩn)', price: 990000, lashPts: 25, fanPts: 3, isRetain };
    }
  }

  // 3. HyperLight (Siêu Nhẹ Kháng Nước)
  if (mid.includes('hyperlight') || mid.includes('hyper_light') || mid.includes('ultralight')) {
    let fanPts = 3;
    if (v.includes('2d')) fanPts = 1;
    else if (v.includes('4d')) fanPts = 4;
    else if (v.includes('5d')) fanPts = 5;

    if (isRetain) {
      const lashPts = 18;
      if (c.includes('50'))
        return { skuName: 'Dặm HyperLight 280K (50 fan)', price: 280000, lashPts: 15, fanPts, isRetain };
      if (c.includes('60') || c.includes('70'))
        return { skuName: 'Dặm HyperLight 350K (Chuẩn dặm)', price: 350000, lashPts: 17, fanPts, isRetain };
      if (c.includes('80'))
        return { skuName: 'Dặm HyperLight 390K (80 fan)', price: 390000, lashPts: 18, fanPts, isRetain };
      if (c.includes('90') || c.includes('100') || c.includes('chuẩn'))
        return { skuName: 'Dặm HyperLight 450K (100 fan)', price: 450000, lashPts: 19, fanPts, isRetain };
      if (c.includes('110') || c.includes('120'))
        return { skuName: 'Dặm HyperLight 550K (120 fan)', price: 550000, lashPts: 21, fanPts, isRetain };
      return { skuName: 'Dặm HyperLight 660K (130+ fan)', price: 660000, lashPts: 23, fanPts, isRetain };
    } else {
      const lashPts = 23;
      if (c.includes('50'))
        return { skuName: 'New HyperLight 440K (50 fan)', price: 440000, lashPts: 18, fanPts, isRetain };
      if (c.includes('60'))
        return { skuName: 'New HyperLight 550K (60 fan)', price: 550000, lashPts: 20, fanPts, isRetain };
      if (c.includes('70') || c.includes('80'))
        return { skuName: 'New HyperLight 660K (Nhẹ nhàng)', price: 660000, lashPts: 21, fanPts, isRetain };
      if (c.includes('110') || c.includes('120'))
        return { skuName: 'New HyperLight 1110K (Dày vừa)', price: 1110000, lashPts: 25, fanPts, isRetain };
      if (c.includes('130') || c.includes('đầy đặn') || c.includes('dày'))
        return { skuName: 'New HyperLight 1440K (Đầy đặn)', price: 1440000, lashPts: 27, fanPts, isRetain };
      return { skuName: 'New HyperLight 880K (Chuẩn)', price: 880000, lashPts: 23, fanPts, isRetain };
    }
  }

  // 4. New Volume 2D
  if (mid.includes('volume') || mid.includes('2d')) {
    const fanPts = 1;
    if (isRetain) {
      if (c.includes('50'))
        return { skuName: 'Dặm New Volume 2D 220K (50 fan)', price: 220000, lashPts: 12, fanPts, isRetain };
      if (c.includes('60') || c.includes('70'))
        return { skuName: 'Dặm New Volume 2D 260K (Chuẩn dặm)', price: 260000, lashPts: 14, fanPts, isRetain };
      if (c.includes('80'))
        return { skuName: 'Dặm New Volume 2D 300K (80 fan)', price: 300000, lashPts: 15, fanPts, isRetain };
      if (c.includes('90') || c.includes('100') || c.includes('chuẩn'))
        return { skuName: 'Dặm New Volume 2D 350K (100 fan)', price: 350000, lashPts: 16, fanPts, isRetain };
      if (c.includes('110') || c.includes('120'))
        return { skuName: 'Dặm New Volume 2D 420K (120 fan)', price: 420000, lashPts: 18, fanPts, isRetain };
      return { skuName: 'Dặm New Volume 2D 490K (130+ fan)', price: 490000, lashPts: 20, fanPts, isRetain };
    } else {
      if (c.includes('50'))
        return { skuName: 'New Volume 2D 390K (Tự nhiên)', price: 390000, lashPts: 16, fanPts, isRetain };
      if (c.includes('60') || c.includes('70'))
        return { skuName: 'New Volume 2D 490K (70 fan)', price: 490000, lashPts: 18, fanPts, isRetain };
      if (c.includes('80'))
        return { skuName: 'New Volume 2D 550K (80 fan)', price: 550000, lashPts: 19, fanPts, isRetain };
      if (c.includes('110') || c.includes('120'))
        return { skuName: 'New Volume 2D 690K (120 fan)', price: 690000, lashPts: 22, fanPts, isRetain };
      if (c.includes('130') || c.includes('đầy đặn') || c.includes('dày'))
        return { skuName: 'New Volume 2D 880K (Đầy đặn)', price: 880000, lashPts: 24, fanPts, isRetain };
      return { skuName: 'New Volume 2D 590K (Chuẩn)', price: 590000, lashPts: 20, fanPts, isRetain };
    }
  }

  // 5. Mi Dưới Under
  if (mid.includes('dưới') || mid.includes('under')) {
    if (isRetain) {
      if (c.includes('20') || c.includes('25'))
        return { skuName: 'Dặm Mi Dưới 150K', price: 150000, lashPts: 8, fanPts: 0, isRetain };
      if (c.includes('50')) return { skuName: 'Dặm Mi Dưới 280K', price: 280000, lashPts: 12, fanPts: 0, isRetain };
      return { skuName: 'Dặm Mi Dưới 220K (Chuẩn dặm)', price: 220000, lashPts: 10, fanPts: 0, isRetain };
    } else {
      if (c.includes('20') || c.includes('25'))
        return { skuName: 'Mi Dưới 250K', price: 250000, lashPts: 12, fanPts: 0, isRetain };
      if (c.includes('50')) return { skuName: 'Mi Dưới 450K (Dày)', price: 450000, lashPts: 16, fanPts: 0, isRetain };
      return { skuName: 'Mi Dưới 390K (Chuẩn)', price: 390000, lashPts: 15, fanPts: 0, isRetain };
    }
  }

  // 6. Classic 1D / Mặc định
  const fanPts = 0;
  if (isRetain) {
    if (c.includes('50'))
      return { skuName: 'Dặm New Classic 1D 190K (50 sợi)', price: 190000, lashPts: 10, fanPts, isRetain };
    if (c.includes('60') || c.includes('70'))
      return { skuName: 'Dặm New Classic 1D 230K (Chuẩn dặm)', price: 230000, lashPts: 12, fanPts, isRetain };
    if (c.includes('80'))
      return { skuName: 'Dặm New Classic 1D 260K (80 sợi)', price: 260000, lashPts: 13, fanPts, isRetain };
    if (c.includes('90') || c.includes('100') || c.includes('chuẩn'))
      return { skuName: 'Dặm New Classic 1D 300K (100 sợi)', price: 300000, lashPts: 14, fanPts, isRetain };
    if (c.includes('110') || c.includes('120'))
      return { skuName: 'Dặm New Classic 1D 360K (120 sợi)', price: 360000, lashPts: 15, fanPts, isRetain };
    return { skuName: 'Dặm New Classic 1D 440K (130+ sợi)', price: 440000, lashPts: 16, fanPts, isRetain };
  } else {
    if (c.includes('50'))
      return { skuName: 'New Classic 1D 390K (50 sợi)', price: 390000, lashPts: 14, fanPts, isRetain };
    if (c.includes('60') || c.includes('70'))
      return { skuName: 'New Classic 1D 450K (70 sợi)', price: 450000, lashPts: 15, fanPts, isRetain };
    if (c.includes('80'))
      return { skuName: 'New Classic 1D 490K (80 sợi)', price: 490000, lashPts: 16, fanPts, isRetain };
    if (c.includes('110') || c.includes('120'))
      return { skuName: 'New Classic 1D 660K (120 sợi)', price: 660000, lashPts: 18, fanPts, isRetain };
    if (c.includes('130') || c.includes('đầy đặn') || c.includes('dày'))
      return { skuName: 'New Classic 1D 770K (Đầy đặn)', price: 770000, lashPts: 19, fanPts, isRetain };
    return { skuName: 'New Classic 1D 550K (Chuẩn)', price: 550000, lashPts: 17, fanPts, isRetain };
  }
}

/**
 * Tính điểm Thiết kế Dáng mi
 */
export function getLashDesignPoints(designId?: string): number {
  const d = String(designId || '').toLowerCase();
  if (d.includes('kim') || d.includes('katun')) return 7; // Kim-K / Sole Katun: +7 pts
  if (d.includes('doll') || d.includes('búp bê')) return 6; // Doll: +6 pts
  if (d.includes('wing') || d.includes('mèo') || d.includes('sexy')) return 6; // Wing: +6 pts
  return 0; // Natural: 0 pts
}

/**
 * Tính toàn bộ thông số Vòng xoay CV & Giá tiền mi nối
 * - Không phân biệt khách mới/cũ theo chỉ đạo Danny
 * - Áp dụng thuế suất VAT 8% chuẩn Wings
 */
export function calculateLashPricingAndCvPoints(params: {
  materialId: string;
  countStr?: string;
  volumeStr?: string;
  designId?: string;
  originalBookedPrice?: number;
  serviceType?: string; // "Normal" | "Retain" | "Fix" | "Adjust"
}): LashRotationPointsBreakdown {
  const { materialId, countStr, volumeStr, designId, originalBookedPrice = 550000, serviceType = 'Normal' } = params;

  // 1. SKU & Giá niêm yết
  const skuInfo = resolveLashSkuPricing(materialId, countStr, volumeStr, serviceType);
  const skuPrice = skuInfo.price;
  const originalPrice = originalBookedPrice;
  const upgradePrice = Math.max(0, skuPrice - originalPrice);

  // Thuế VAT 8% (Chuẩn Wings Lashes & mos-lab)
  const vatRate = 0.08;
  const vatAmount = Math.round(skuPrice * vatRate);
  const totalPriceWithVat = skuPrice + vatAmount;
  const upgradeVat = Math.round(upgradePrice * vatRate);
  const upgradePriceWithVat = upgradePrice + upgradeVat;

  // 2. Điểm Vòng Xoay CV (Chỉ tính theo kỹ thuật & chất liệu ca làm - Không phân biệt khách mới/cũ)
  const lashPts = skuInfo.lashPts;
  const designPts = getLashDesignPoints(designId);
  const fanPts = skuInfo.fanPts;

  const isRetain = skuInfo.isRetain;
  let typePts = isRetain ? 4 : 7; // Normal: +7 pts, Retain: +4 pts
  const st = String(serviceType).toLowerCase();
  if (st.includes('fix') || st.includes('adjust')) {
    typePts = 15; // FAL 15 chuối
  }

  const totalPoints = Math.round((lashPts + designPts + fanPts + typePts) * 10) / 10;

  const breakdownLabel = `+${lashPts}p Chất liệu · +${designPts}p Dáng · +${fanPts}p Fan · +${typePts}p ${isRetain ? 'Ca dặm' : 'Ca mới'}`;
  const summaryLabel = `💎 +${totalPoints} pts Vòng Xoay CV`;

  return {
    skuName: skuInfo.skuName,
    skuPrice,
    upgradePrice,
    originalPrice,
    vatRate,
    vatAmount,
    totalPriceWithVat,
    upgradeVat,
    upgradePriceWithVat,
    lashPts,
    designPts,
    fanPts,
    typePts,
    totalPoints,
    summaryLabel,
    breakdownLabel,
    isRetain,
    serviceType: isRetain ? 'Retain' : 'Normal',
  };
}
