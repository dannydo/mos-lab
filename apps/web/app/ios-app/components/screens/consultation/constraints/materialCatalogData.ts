import { ALL_LENGTH_MAPPINGS, STANDARD_COLORS, type LashMaterialSpec } from './constraintTypesAndOptions';

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
    allowedVolumes: ['1D'],
    defaultVolume: '1D',
    allowedCounts: ['60 sợi', '70 sợi', '90 sợi', '110 sợi', '130 sợi'],
    defaultCount: '90 sợi',
    allowedColors: STANDARD_COLORS,
  },
  {
    id: 'UltraLight',
    code: 'ULTRALIGHT',
    name: 'UltraLight (Sợi Lông Vũ Siêu Nhẹ)',
    shortLabel: 'UltraLight',
    badge: 'LÔNG VŨ · 550K+',
    priceRange: '550.000đ – 1.550.000đ',
    summary: 'Sợi mi lông vũ siêu nhẹ xốp mềm, chuyên kỹ thuật Volume 3D–5D nhẹ tênh không cộm mắt.',
    constraintReason:
      'Mở đủ 4 thiết kế (Natural, Doll, Wing, Kim-K), sử dụng 3 độ cong B, C, D và sợi siêu mảnh 0.05mm – 0.07mm.',
    allowedDesigns: ['Natural', 'Doll', 'Wing', 'Kim - K'],
    defaultDesign: 'Doll',
    lockedDesignReasons: {},
    allowedCurls: ['B', 'C', 'D'],
    defaultCurl: 'C',
    lockedCurlReason: 'UltraLight chỉ sử dụng 3 độ cong B (45°), C (55°) và D (70°)',
    allowedThicknesses: ['0.05 mm', '0.07 mm'],
    defaultThickness: '0.07 mm',
    lockedThicknessReason: 'Dòng lông vũ Volume dùng sợi 0.05mm – 0.07mm siêu nhẹ bảo vệ gốc mi thật',
    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((m) =>
      ['9-11 mm', '10-12 mm', '11-13 mm', '12-14 mm'].includes(m.id)
    ),
    allowedSingleLengths: ['8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm', '14 mm'],
    defaultLength: '10-12 mm',
    allowedVolumes: ['3D', '4D', '5D'],
    defaultVolume: '4D',
    allowedCounts: ['60 fan', '80 fan', '100 fan', '120 fan'],
    defaultCount: '80 fan',
    allowedColors: STANDARD_COLORS,
  },
  {
    id: 'HyperLight',
    code: 'HYPERLIGHT',
    name: 'HyperLight (Siêu Nhẹ Kháng Nước)',
    shortLabel: 'HyperLight',
    badge: 'MOST POPULAR · 440K+',
    priceRange: '440.000đ – 1.770.000đ',
    summary: 'Sợi mi siêu mảnh kháng nước, chuyên tạo fan Volume 2X–5X bồng bềnh và sắc sảo.',
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
    lockedThicknessReason: 'Fan 2X–5X bắt buộc dùng sợi 0.05mm – 0.07mm siêu mảnh để bảo vệ gốc mi thật',
    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((m) =>
      ['9-11 mm', '10-12 mm', '11-13 mm', '12-14 mm'].includes(m.id)
    ),
    allowedSingleLengths: ['8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm', '14 mm'],
    defaultLength: '10-12 mm',
    allowedVolumes: ['2X', '3X', '4X', '5X'],
    defaultVolume: '4X',
    allowedCounts: ['50 fan', '70 fan', '90 fan', '110 fan', '130 fan'],
    defaultCount: '70 fan',
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
    allowedVolumes: ['3ℓ', '4ℓ', '5ℓ'],
    defaultVolume: '4ℓ',
    allowedCounts: ['70 nhịp', '90 nhịp', '110 nhịp', '130 nhịp'],
    defaultCount: '90 nhịp',
    allowedColors: [STANDARD_COLORS[0], STANDARD_COLORS[1]],
  },
  {
    id: 'New Volume 2D',
    code: 'NEW_VOLUME',
    name: 'New Volume 2D (Nhung Đen Đan Đôi)',
    shortLabel: 'New Volume 2D',
    badge: '2D TỰ NHIÊN · 390K+',
    priceRange: '390.000đ – 880.000đ',
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
    allowedVolumes: ['2D'],
    defaultVolume: '2D',
    allowedCounts: ['50 fan', '60 fan', '80 fan', '100 fan', '120 fan'],
    defaultCount: '80 fan',
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
    allowedVolumes: ['1D'],
    defaultVolume: '1D',
    allowedCounts: ['60 sợi', '70 sợi', '90 sợi', '110 sợi', '130 sợi'],
    defaultCount: '90 sợi',
    allowedColors: STANDARD_COLORS,
  },
];

/**
 * Quy chuẩn Kỹ thuật Mi Dưới (Under Mink) - Option làm chung với 6 bộ mi chính
 */
export const UNDER_MINK_OPTION_SPEC: LashMaterialSpec = {
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
  allowedVolumes: ['Mi Dưới'],
  defaultVolume: 'Mi Dưới',
  allowedCounts: ['70 sợi'],
  defaultCount: '70 sợi',
  allowedColors: [STANDARD_COLORS[0], STANDARD_COLORS[1]],
};

export const LASH_MATERIAL_CATALOG: LashMaterialSpec[] = DEFAULT_LASH_MATERIAL_CATALOG;

export const MATERIAL_MATRIX_STORAGE_KEY = 'mos_lash_material_constraint_matrix_v8';
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
  if (norm.includes('ultralight') || norm.includes('ultra_light') || norm.includes('lông vũ')) {
    return list.find((m) => m.code === 'ULTRALIGHT') || list[0];
  }
  if (norm.includes('hyperlight') || norm.includes('hyper_light')) {
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
