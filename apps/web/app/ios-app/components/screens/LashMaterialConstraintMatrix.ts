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
      'Kim - K': 'Flawless Mink đi sợi đơn mượt đều, chuyển sang Hyperlight nếu khách muốn đánh trụ Kim-K',
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
    allowedCounts: ['60 - 70 sợi/mắt (Tự nhiên)', '90 - 110 sợi/mắt (Chuẩn)', '130+ sợi/mắt (Đầy đặn)'],
    defaultCount: '90 - 110 sợi/mắt (Chuẩn)',
    allowedColors: STANDARD_COLORS,
  },
  {
    id: 'Hyperlight Cashmere',
    code: 'HYPERLIGHT',
    name: 'Hyperlight / Ultralight (Cashmere Siêu Nhẹ)',
    shortLabel: 'Hyperlight Cashmere',
    badge: 'FAN 3D-5D · 440K+',
    priceRange: '440.000đ – 1.770.000đ',
    summary: 'Sợi lông thỏ Cashmere siêu mảnh kháng nước, chuyên tạo fan Volume 2D–5D bồng bềnh và sắc sảo.',
    constraintReason:
      'Mở đủ 4 thiết kế (Natural, Doll, Wing, Kim-K), chỉ sử dụng 3 độ cong B, C, D và sợi siêu mảnh 0.05mm – 0.07mm.',
    allowedDesigns: ['Natural', 'Doll', 'Wing', 'Kim - K'],
    defaultDesign: 'Doll',
    lockedDesignReasons: {},
    allowedCurls: ['B', 'C', 'D'],
    defaultCurl: 'C',
    lockedCurlReason: 'Hyperlight Cashmere chỉ sử dụng 3 độ cong B (45°), C (55°) và D (70°)',
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
    allowedCounts: ['70 - 90 fan/mắt', '110 fan/mắt (Chuẩn)', '130 fan/mắt (Đậm sắc sảo)'],
    defaultCount: '110 fan/mắt (Chuẩn)',
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
    allowedCounts: ['70 - 90 nhịp/mắt', '110 nhịp/mắt (Chuẩn)', '130 nhịp/mắt (Đầy đặn)'],
    defaultCount: '110 nhịp/mắt (Chuẩn)',
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
    allowedCounts: ['60 - 80 fan/mắt', '100 fan/mắt (Chuẩn)', '120 fan/mắt'],
    defaultCount: '100 fan/mắt (Chuẩn)',
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
    allowedCounts: ['60 - 80 sợi/mắt', '100 sợi/mắt (Chuẩn)', '120 sợi/mắt'],
    defaultCount: '100 sợi/mắt (Chuẩn)',
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
    allowedCounts: ['20 - 30 sợi/mắt', '30 - 40 sợi/mắt (Chuẩn)'],
    defaultCount: '30 - 40 sợi/mắt (Chuẩn)',
    allowedColors: [STANDARD_COLORS[0], STANDARD_COLORS[1]],
  },
];

export const LASH_MATERIAL_CATALOG: LashMaterialSpec[] = DEFAULT_LASH_MATERIAL_CATALOG;

export const MATERIAL_MATRIX_STORAGE_KEY = 'mos_lash_material_constraint_matrix_v3';
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
  if (norm.includes('hyperlight') || norm.includes('ultralight') || norm.includes('cashmere')) {
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
