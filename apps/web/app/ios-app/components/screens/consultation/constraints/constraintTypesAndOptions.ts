/**
 * Các kiểu dữ liệu (Types/Interfaces) & Danh sách tùy chọn chuẩn
 * của Ma Trận Ràng Buộc Kỹ Thuật 3 Bước Chuẩn Wings Lashes
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
    name: 'Wing (Đuôi dài thanh thoát)',
    shortName: 'Wing',
    desc: 'Tăng dần chiều dài về phía đuôi mắt',
    eyeEffect: 'Kéo dài đuôi mắt sắc sảo, thanh thoát',
    image: '/lashes/designs/lash-design-wing.jpg',
  },
  {
    id: 'Kim - K',
    name: 'Kim K',
    shortName: 'Kim K',
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
  '1D',
  '2D',
  '2X',
  '3X',
  '4X',
  '5X',
  '2𝑿',
  '3𝑿',
  '4𝑿',
  '5𝑿',
  '3D',
  '4D',
  '5D',
  '3ℓ',
  '4ℓ',
  '5ℓ',
  '3𝓵',
  '4𝓵',
  '5𝓵',
  'Mi Dưới',
];

export const STANDARD_COLORS = [
  { id: 'Đen Tuyền (Jet Black)', label: 'Đen Tuyền (Jet Black)', colorCode: '#111827' },
  { id: 'Nâu Tây (Brown Choco)', label: 'Nâu Tây (Choco)', colorCode: '#78350F' },
  { id: 'Xanh Đậm (Dark Blue)', label: 'Xanh Đậm (Dark Blue)', colorCode: '#1E3A8A' },
  { id: 'Tím Than (Purple Accent)', label: 'Tím Than (Purple)', colorCode: '#581C87' },
];

export interface WingsMenuItemMeta {
  materialCode: string;
  countNum: number;
  totalFibers: number;
  durationMin: number;
  newPrice: number;
  refillPrice: number;
  badge?: 'BEST SELLER' | 'MOST POPULAR';
}

export interface LashMaterialSpec {
  id: string;
  code: string;
  name: string;
  shortLabel: string;
  badge: string;
  priceRange: string;
  summary: string;
  constraintReason: string;
  allowedDesigns: string[];
  defaultDesign: string;
  lockedDesignReasons: Record<string, string>;
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
  classPts: number;
  lashPts: number;
  designPts: number;
  fanPts: number;
  typePts: number;
  colorPts: number;
  upperSetPoints: number;
  upperSetBreakdownLabel: string;
  serviceSetsCount: 1 | 2;
  underClassPts: number;
  underTypePts: number;
  underLashPts: number;
  underSetPoints: number;
  underSetBreakdownLabel: string;
  totalPoints: number;
  summaryLabel: string;
  breakdownLabel: string;
  isRetain?: boolean;
  serviceType?: string;
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
  isUnderMinkComboDeducted?: boolean;
  underMinkPrice?: number;
  underMinkFibers?: number;
  underMinkDuration?: number;
}

export interface CustomerTypeMeta {
  symbol: string;
  label: string;
  colorClass: string;
}

export interface AutoResolvedComboServiceSpec {
  materialId: string;
  materialCode: string;
  materialShortLabel: string;
  volume: string;
  count: string;
  matchedKPrice?: number;
  style?: string;
  curl?: string;
  thickness?: string;
  length?: string;
}

export interface QuickCheckInComboPreset {
  materialSpec: LashMaterialSpec;
  materialId: string;
  materialShortLabel: string;
  volume: string;
  count: string;
  style: string;
  curl: string;
  thickness: string;
  length: string;
  color: string;
  hasUnderMink: boolean;
  underMinkServiceType: 'Normal' | 'Retain';
  underMinkCurl: string;
  underMinkThickness: string;
  underMinkLength: string;
  underMinkCount: string;
  hasUnderMinkCombo: boolean;
  underComboRemaining: number;
  underComboNormalRemaining: number;
  underComboRetainRemaining: number;
  underComboName: string;
  lastVisitDate: string | null;
  daysSinceLastVisit: number | null;
  retainDaysLimit: number;
  isWithinRetainWindow: boolean;
  expectedServiceType: 'Normal' | 'Retain';
  isAlwaysFullSet: boolean;
  remainingSessions: number;
  normalRemaining: number;
  retainRemaining: number;
  hasNormalRemaining: boolean;
  hasRetainRemaining: boolean;
}
