/**
 * Dữ Liệu & Quy Chuẩn Đo Khám Mi Thật (Natural Lash Assessment Standard)
 * Bản quyền nghiệp vụ: Wings Beauty Salon · Tiêu Chuẩn Nối Mi Khoa Học
 *
 * Quy tắc Vàng (Golden Rules):
 * 1. Chiều dài mi nối an toàn tối đa = Chiều dài mi thật + 2mm (tối đa +3mm với mi siêu khỏe).
 * 2. Nang mi tơ mảnh (0.05 - 0.07mm) tuyệt đối không nối sợi Classic thô dày 0.15mm.
 * 3. Khách hàng mới (New Client) bắt buộc phải đo chiều dài & độ dày mi thật trước khi nối.
 */

export interface NaturalLashLengthOption {
  id: string; // e.g. "6mm", "7mm", "8mm", "9mm", "10mm", "11mm", "12mm"
  valueMm: number;
  label: string;
  tier: 'SHORT' | 'STANDARD' | 'LONG';
  tierLabel: string;
  colorTag: string;
  safeMaxExtensionMm: number;
  recommendedLengths: string;
  advice: string;
}

export const NATURAL_LASH_LENGTH_OPTIONS: NaturalLashLengthOption[] = [
  {
    id: '6mm',
    valueMm: 6,
    label: '6 mm',
    tier: 'SHORT',
    tierLabel: 'Rất ngắn (≤ 6mm)',
    colorTag: 'bg-rose-50 text-rose-700 border-rose-200',
    safeMaxExtensionMm: 8,
    recommendedLengths: '8-9 mm',
    advice: 'Nang mi nông và ngắn. Chỉ nên nối mi ngắn nhẹ 8mm để bảo vệ chân mi, không rụng mi.',
  },
  {
    id: '7mm',
    valueMm: 7,
    label: '7 mm',
    tier: 'SHORT',
    tierLabel: 'Ngắn (7mm)',
    colorTag: 'bg-amber-50 text-amber-700 border-amber-200',
    safeMaxExtensionMm: 9,
    recommendedLengths: '8-10 mm',
    advice: 'Nền mi hơi ngắn. Khuyên nối tối đa 9-10mm, tránh dùng form quá dài gây sụp mí.',
  },
  {
    id: '8mm',
    valueMm: 8,
    label: '8 mm',
    tier: 'STANDARD',
    tierLabel: 'Tiêu chuẩn (8mm)',
    colorTag: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    safeMaxExtensionMm: 10,
    recommendedLengths: '9-11 mm',
    advice: 'Chiều dài trung bình lý tưởng của phụ nữ Việt. Nối rất đẹp dải 9-11mm tự nhiên.',
  },
  {
    id: '9mm',
    valueMm: 9,
    label: '9 mm',
    tier: 'STANDARD',
    tierLabel: 'Chuẩn đẹp (9mm)',
    colorTag: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    safeMaxExtensionMm: 11,
    recommendedLengths: '10-12 mm',
    advice: 'Sợi mi thật phát triển khỏe mạnh. Chịu lực tốt dải 10-12mm mở to tròn mắt.',
  },
  {
    id: '10mm',
    valueMm: 10,
    label: '10 mm',
    tier: 'STANDARD',
    tierLabel: 'Dài vừa (10mm)',
    colorTag: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    safeMaxExtensionMm: 12,
    recommendedLengths: '11-13 mm',
    advice: 'Nền mi dài tự nhiên. Dễ dàng nối mọi dáng mi thanh thoát, mắt ướt quyến rũ.',
  },
  {
    id: '11mm',
    valueMm: 11,
    label: '11 mm',
    tier: 'LONG',
    tierLabel: 'Dài khỏe (11mm)',
    colorTag: 'bg-blue-50 text-blue-700 border-blue-200',
    safeMaxExtensionMm: 13,
    recommendedLengths: '12-14 mm',
    advice: 'Mi thật rất dài. Có thể nối dáng Wing đuôi dài hoặc Katun Kim-K bắt mắt.',
  },
  {
    id: '12mm',
    valueMm: 12,
    label: '12 mm+',
    tier: 'LONG',
    tierLabel: 'Rất dài (≥ 12mm)',
    colorTag: 'bg-blue-50 text-blue-700 border-blue-200',
    safeMaxExtensionMm: 14,
    recommendedLengths: '12-14 mm',
    advice: 'Nền mi cực kỳ khỏe và dài dặn. Thích hợp mọi dáng mi thời thượng và cuốn hút.',
  },
];

export interface NaturalLashThicknessOption {
  id: string;
  label: string;
  name: string;
  caliberMm: string;
  strength: 'WEAK' | 'MEDIUM' | 'STRONG';
  strengthLabel: string;
  colorTag: string;
  recommendedMaterial: string;
  safetyRule: string;
  forbiddenThicknesses: string[];
}

export const NATURAL_LASH_THICKNESS_OPTIONS: NaturalLashThicknessOption[] = [
  {
    id: '0.05-0.07mm',
    label: '0.05 – 0.07 mm',
    name: 'Mi tơ mảnh / Yếu',
    caliberMm: '0.05 - 0.07mm',
    strength: 'WEAK',
    strengthLabel: 'Mảnh / Yếu',
    colorTag: 'bg-rose-50 text-rose-700 border-rose-200',
    recommendedMaterial: 'New Flawless Mink (0.07mm) hoặc Ivy Light siêu nhẹ',
    safetyRule: 'Chỉ nối mi sợi siêu nhẹ 0.05mm - 0.07mm. Tuyệt đối KHÔNG nối sợi Classic thô 0.15mm vì dễ xệ nang mi.',
    forbiddenThicknesses: ['0.15 mm'],
  },
  {
    id: '0.10mm',
    label: '0.10 mm',
    name: 'Mi vừa / Tiêu chuẩn',
    caliberMm: '0.10mm',
    strength: 'MEDIUM',
    strengthLabel: 'Tiêu chuẩn',
    colorTag: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    recommendedMaterial: 'New HyperLight, Flawless Mink hoặc Classic Design',
    safetyRule: 'Độ chịu lực cân bằng lý tưởng. Nối được sợi 0.07mm, 0.10mm, hoặc Fan 2D-3D nhẹ nhàng.',
    forbiddenThicknesses: [],
  },
  {
    id: '0.12-0.15mm',
    label: '0.12 – 0.15 mm+',
    name: 'Mi to / Khỏe cứng',
    caliberMm: '0.12 - 0.15mm',
    strength: 'STRONG',
    strengthLabel: 'Khỏe / Cứng',
    colorTag: 'bg-blue-50 text-blue-700 border-blue-200',
    recommendedMaterial: 'Classic Design 0.12 - 0.15mm hoặc Volume đậm nét',
    safetyRule: 'Vỏ Keratin dày đanh, nang mi bám rất chắc. Gánh tốt mọi dòng mi, cả sợi Classic đậm 0.15mm.',
    forbiddenThicknesses: [],
  },
];

export interface NaturalLashDensityOption {
  id: string;
  label: string;
  countRange: string;
  advice: string;
}

export const NATURAL_LASH_DENSITY_OPTIONS: NaturalLashDensityOption[] = [
  {
    id: 'Thưa (< 80 sợi/mắt)',
    label: 'Thưa (< 80 sợi)',
    countRange: '< 80 sợi',
    advice: 'Khuyên tư vấn Volume 2D-3D nhẹ để dặm đầy khoảng trống mà không nặng mi.',
  },
  {
    id: 'Vừa (80 - 120 sợi/mắt)',
    label: 'Vừa (80 - 120 sợi)',
    countRange: '80 - 120 sợi',
    advice: 'Mật độ mi tiêu chuẩn cân đối. Nối tự nhiên hay quyến rũ đều rất êm đẹp.',
  },
  {
    id: 'Dày (> 120 sợi/mắt)',
    label: 'Dày rậm (> 120 sợi)',
    countRange: '> 120 sợi',
    advice: 'Nền mi tự nhiên đã rậm rạp. Chỉ cần nối sợi mảnh 0.07mm đã rất sắc nét.',
  },
];

export interface LashDirectionOption {
  id: string;
  name: string;
  desc: string;
  recommendedCurl: string;
}

export const NATURAL_LASH_DIRECTIONS: LashDirectionOption[] = [
  {
    id: 'Chúc xuống (Downwards)',
    name: 'Chúc xuống (Cụp)',
    desc: 'Mi đâm xuống che con ngươi ➔ Cần tăng độ cong CC hoặc L để nâng mở mắt.',
    recommendedCurl: 'CC',
  },
  {
    id: 'Thẳng (Straight)',
    name: 'Thẳng ngang',
    desc: 'Mi mọc thẳng góc 90° ➔ Dễ nối mọi độ cong B, C, CC.',
    recommendedCurl: 'C',
  },
  {
    id: 'Cong ngược (Curly)',
    name: 'Cong tự nhiên',
    desc: 'Mi đã có độ cong sẵn ➔ Dùng độ cong B hoặc C để không bị cong quá mức.',
    recommendedCurl: 'B',
  },
  {
    id: 'Đan chéo (Cross)',
    name: 'Đan chéo / Lộn xộn',
    desc: 'Sợi mi mọc xiên ➔ Cần tách kỹ chân keo và định hướng form thẳng đều.',
    recommendedCurl: 'C',
  },
];

export interface EyeShapeOption {
  id: string;
  name: string;
  desc: string;
  image: string;
  keyFeature: string;
  lashAdvice: string;
  recommendedDesign: string;
  recommendedCurl: string;
}

export const NATURAL_EYE_SHAPES: EyeShapeOption[] = [
  {
    id: 'Mí lót / Sụp mí (Hooded)',
    name: 'Mí lót / Sụp mí (Hooded)',
    desc: 'Vạt da mí trên chùng đè che lấp nếp mí, giấu nếp mí vào trong khi nhìn thẳng.',
    keyFeature: 'Nếp mí bị vạt da trên chùng đè che khuất (lót vào trong), chân mi bị đè ép chúc xuống',
    lashAdvice: 'Cần độ cong nâng mạnh (CC hoặc L chân phẳng) để đẩy ngọn mi vươn qua vạt da đè, không bị che mất mi.',
    recommendedDesign: 'Wing',
    recommendedCurl: 'CC',
    image: '/lashes/eyes/eye-shape-hooded.jpg',
  },
  {
    id: 'Một mí (Monolid)',
    name: 'Mắt một mí (Monolid)',
    desc: 'Bầu mắt phẳng mịn liền mạch từ chân mày xuống mi, hoàn toàn không có nếp gấp mí đôi.',
    keyFeature: 'Bầu mắt phẳng mịn liền mạch, HOÀN TOÀN KHÔNG CÓ nếp mí đôi, khóe trong có nếp quạt',
    lashAdvice: 'Khuyên dùng độ cong L chân phẳng (Flat Base) hoặc Wing để mở to góc mắt mà không bị da phẳng đè mi.',
    recommendedDesign: 'Wing',
    recommendedCurl: 'L',
    image: '/lashes/eyes/eye-shape-monolid.jpg',
  },
  {
    id: 'Tròn (Round)',
    name: 'Mắt tròn (Round)',
    desc: 'Độ mở mắt theo chiều dọc rất lớn, viền mí cong cao hình vòm tròn.',
    keyFeature: 'Mắt to tròn, lộ tròng trắng phía dưới con ngươi',
    lashAdvice: 'Hợp dáng Doll búp bê để mắt long lanh hoặc dáng Wing kéo dài đuôi.',
    recommendedDesign: 'Doll',
    recommendedCurl: 'C',
    image: '/lashes/eyes/eye-shape-round.jpg',
  },
  {
    id: 'Hạnh nhân (Almond)',
    name: 'Mắt hạnh nhân (Almond)',
    desc: 'Dáng mắt tỷ lệ vàng kinh điển, con ngươi chạm khít cả 2 bờ viền mí.',
    keyFeature: 'Tỷ lệ vàng, khóe trong nhọn nhẹ, đuôi mắt xếch duyên dáng',
    lashAdvice: 'Hợp hoàn hảo mọi dáng mi Natural, Doll, Wing, Kim-K.',
    recommendedDesign: 'Natural',
    recommendedCurl: 'C',
    image: '/lashes/eyes/eye-shape-almond.jpg',
  },
  {
    id: 'Mắt sâu (Deep Set)',
    name: 'Mắt sâu (Deep Set)',
    desc: 'Gờ xương mày nhô cao, nhãn cầu thụt sâu vào trong hốc mắt tạo khoảng trũng và bóng đổ tự nhiên.',
    keyFeature: 'Hốc mắt trũng sâu dưới gờ xương mày nhô cao, nhãn cầu lùi sâu vào trong tạo bóng đổ',
    lashAdvice:
      'Nối dài hơn bình thường +1 đến 2mm để ngọn mi vươn ra khỏi hốc xương mày; tránh độ cong quá gắt chạm vào xương.',
    recommendedDesign: 'Natural',
    recommendedCurl: 'CC',
    image: '/lashes/eyes/eye-shape-deepset.jpg',
  },
];

export interface LashHealthConditionOption {
  id: string;
  name: string;
  note: string;
  isVirgin: boolean;
}

export const NATURAL_LASH_HEALTH_CONDITIONS: LashHealthConditionOption[] = [
  {
    id: 'Khách mới lần đầu nối mi (Virgin Lashes)',
    name: 'Khách mới lần đầu nối mi',
    note: 'Nang mi nguyên bản. Cần test keo siêu êm dịu, tư vấn form nhẹ êm thoải mái.',
    isVirgin: true,
  },
  {
    id: 'Mi khỏe (Healthy)',
    name: 'Mi nguyên bản khỏe mạnh',
    note: 'Nang lông chắc khỏe, thân mi bóng mượt. Gánh được mọi dòng mi an toàn.',
    isVirgin: false,
  },
  {
    id: 'Mi thưa/khuyết (Gappy)',
    name: 'Mi thưa / Có khoảng trống',
    note: 'Khuyên dùng Fan 2D-3D siêu nhẹ để che lấp khoảng thưa mà không nặng mắt.',
    isVirgin: false,
  },
  {
    id: 'Mi yếu/gãy rụng sau nối sai nơi khác (Damaged)',
    name: 'Mi yếu / Hư tổn do nối sai',
    note: 'Chỉ nối 0.05mm siêu nhẹ kết hợp phác đồ dưỡng serum Yeppeum phục hồi nang mi.',
    isVirgin: false,
  },
];

/**
 * Tính toán khuyến nghị khoa học Wings dựa trên kết quả khám mi thật
 */
export function computeLashRecommendation(params: {
  lengthMm: number;
  thicknessId: string;
  directionId: string;
  eyeShapeId: string;
  healthId: string;
  isNewClient: boolean;
}) {
  const { lengthMm, thicknessId, directionId, eyeShapeId, healthId, isNewClient } = params;

  // 1. Chiều dài an toàn tối đa: Length + 2mm (với mi khỏe dài có thể +3mm)
  const maxSafeMm = lengthMm <= 6 ? lengthMm + 2 : lengthMm + 2;
  const safeRangeLabel = `${lengthMm + 1} – ${maxSafeMm} mm`;

  // 2. Độ dày an toàn
  let recommendedThickness = '0.07 mm';
  if (thicknessId.includes('0.12') || thicknessId.includes('0.15')) {
    recommendedThickness = '0.10 mm';
  } else if (thicknessId.includes('0.10')) {
    recommendedThickness = '0.07 mm';
  } else {
    recommendedThickness = '0.07 mm';
  }

  // 3. Độ cong tối ưu
  let recommendedCurl = 'C';
  if (directionId.includes('Chúc') || eyeShapeId.includes('Sụp') || eyeShapeId.includes('Mí lót')) {
    recommendedCurl = 'CC';
  } else if (eyeShapeId.includes('Một mí')) {
    recommendedCurl = 'L';
  } else if (directionId.includes('Cong')) {
    recommendedCurl = 'B';
  }

  // 4. Thiết kế dáng mi
  let recommendedDesign = 'Natural';
  if (eyeShapeId.includes('Mí lót') || eyeShapeId.includes('Một mí')) {
    recommendedDesign = 'Wing';
  } else if (eyeShapeId.includes('Tròn')) {
    recommendedDesign = 'Doll';
  }

  // 5. Dòng mi phù hợp
  let recommendedMaterial = 'New Flawless Mink';
  let recommendedMaterialId = 'flawless-mink';
  if (healthId.includes('yếu') || thicknessId.includes('0.05')) {
    recommendedMaterial = 'New Flawless Mink (0.07mm Siêu Nhẹ)';
    recommendedMaterialId = 'flawless-mink';
  } else if (thicknessId.includes('0.12')) {
    recommendedMaterial = 'Classic Design (Bền Đẹp)';
    recommendedMaterialId = 'classic-design';
  } else {
    recommendedMaterial = 'New Flawless Mink';
    recommendedMaterialId = 'flawless-mink';
  }

  // Summary câu tư vấn mẫu cho Chuyên Viên nói với khách
  const consultationScript = isNewClient
    ? `Dạ chị ơi, em đã đo mi thật của mình: mi dài ${lengthMm}mm, sợi ${thicknessId.split(' ')[0]} mảnh nhẹ. Vì là lần đầu nối tại Wings, em khuyên chị nối dòng ${recommendedMaterial} dài ${safeRangeLabel}, cong ${recommendedCurl}. Dáng này sẽ mở to mắt mà mi thật của chị vẫn êm ru, hoàn toàn không sợ rụng mi ạ!`
    : `Dạ em kiểm tra mi thật của chị hôm nay đạt ${lengthMm}mm, sợi rất đều. Em nối cho chị dáng ${recommendedDesign} cong ${recommendedCurl} độ dài ${safeRangeLabel} là đúng chuẩn tỷ lệ vàng và bảo vệ nang mi tối đa ạ!`;

  return {
    maxSafeMm,
    safeRangeLabel,
    recommendedThickness,
    recommendedCurl,
    recommendedDesign,
    recommendedMaterial,
    recommendedMaterialId,
    consultationScript,
  };
}
