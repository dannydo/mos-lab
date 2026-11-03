/**
 * Canonical definitions and synonym normalizers for Wings Autonomous Technician tiers:
 * - Cấp 1 Lông (Chuyên Viên Tự Chủ): Hiển thị chuẩn "CV🪶", mã chuẩn "CVL"
 * - Cấp 2 Lông (Chuyên Viên Tự Chủ Cấp Cao): Hiển thị chuẩn "🪶CV🪶", mã chuẩn "CVLL"
 *
 * Tất cả các tên gọi sau đây đều được định nghĩa tương đương 100% với "CV🪶" (CVL):
 * - CV Lông, CV 1 lông, 🪶CV, CV🪶, CV L, CV 1L, CV 𝓁, CV 1𝓁, CV Lờ, CV 1 Lờ, CVL
 */

export const CV_FEATHER_1_LABEL = 'CV🪶' as const;
export const CV_FEATHER_2_LABEL = '🪶CV🪶' as const;

export const CV_FEATHER_1_CODE = 'CVL' as const;
export const CV_FEATHER_2_CODE = 'CVLL' as const;

/**
 * Danh sách chính thức các từ đồng nghĩa của cấp 1 lông (CV🪶 / CVL)
 */
export const CV_FEATHER_1_ALIASES = [
  'CV🪶',
  '🪶CV',
  'CV 🪶',
  '🪶 CV',
  'CV Lông',
  'CV lông',
  'CV 1 lông',
  'CV 1 Lông',
  'CVL',
  'CV L',
  'CV 1L',
  'CV1L',
  'CV 𝓁',
  'CV𝓁',
  'CV 1𝓁',
  'CV1𝓁',
  'CV Lờ',
  'CV lờ',
  'CV 1 Lờ',
  'CV 1 lờ',
] as const;

/**
 * Danh sách chính thức các từ đồng nghĩa của cấp 2 lông (🪶CV🪶 / CVLL)
 */
export const CV_FEATHER_2_ALIASES = [
  '🪶CV🪶',
  '🪶 CV 🪶',
  'CV🪶🪶',
  'CV 🪶🪶',
  '🪶🪶CV',
  'CV 2 Lông',
  'CV 2 lông',
  'CVLL',
  'CV LL',
  'CV 2L',
  'CV2L',
  'CV 2𝓁',
  'CV2𝓁',
  'CV 𝓁𝓁',
  'CV𝓁𝓁',
  'CV 2 Lờ',
  'CV 2 lờ',
] as const;

/**
 * Biểu thức chính quy nhận diện cấp 2 lông (🪶CV🪶 / CVLL) trong văn bản tự nhiên
 */
export const CV_FEATHER_2_PATTERN =
  /(?:🪶\s*CV\s*🪶|CV\s*🪶\s*🪶|🪶\s*🪶\s*CV|\bCV\s*2\s*(?:lông|lờ|l|𝓁)(?=\b|\s|$)|\bCV\s*(?:ll|𝓁𝓁)(?=\b|\s|$))/iu;

/**
 * Biểu thức chính quy nhận diện cấp 1 lông (CV🪶 / CVL) trong văn bản tự nhiên
 */
export const CV_FEATHER_1_PATTERN = /(?:CV\s*🪶|🪶\s*CV|\bCV\s*1?\s*(?:lông|lờ|l|𝓁)(?=\b|\s|$))/iu;

/**
 * Kiểm tra chuỗi có chứa từ đồng nghĩa của cấp 2 lông (🪶CV🪶 / CVLL) hay không
 */
export function containsCvFeather2Alias(text?: string | null): boolean {
  if (!text) return false;
  return CV_FEATHER_2_PATTERN.test(text);
}

/**
 * Kiểm tra chuỗi có chứa từ đồng nghĩa của cấp 1 lông (CV🪶 / CVL) hay không
 */
export function containsCvFeather1Alias(text?: string | null): boolean {
  if (!text) return false;
  const cleaned = text.replace(CV_FEATHER_2_PATTERN, '');
  return CV_FEATHER_1_PATTERN.test(cleaned);
}

/**
 * Chuẩn hóa mã role hoặc tên gọi bất kỳ về mã chuẩn 'CVL' (1 lông) hoặc 'CVLL' (2 lông)
 */
export function normalizeCvFeatherRole(roleOrText?: string | null): 'CVL' | 'CVLL' | null {
  if (!roleOrText) return null;
  const trimmed = roleOrText.trim();
  const upper = trimmed.toUpperCase();

  if (upper === 'CVLL' || upper === 'CV_LL' || upper === 'CV_PLUS_PLUS' || containsCvFeather2Alias(trimmed)) {
    return 'CVLL';
  }

  if (
    upper === 'CVL' ||
    upper === 'CV_L' ||
    upper === 'CV_LONG' ||
    upper === 'CV_PLUS' ||
    containsCvFeather1Alias(trimmed)
  ) {
    return 'CVL';
  }

  return null;
}

/**
 * Trả về nhãn hiển thị chuẩn mực ('CV🪶' hoặc '🪶CV🪶') từ mã role hoặc từ đồng nghĩa
 */
export function formatCvFeatherDisplay(roleOrText?: string | null): string | null {
  const normalized = normalizeCvFeatherRole(roleOrText);
  if (normalized === 'CVLL') return CV_FEATHER_2_LABEL;
  if (normalized === 'CVL') return CV_FEATHER_1_LABEL;
  return null;
}
