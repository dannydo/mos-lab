import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import axios from 'axios';
import type { FastifyInstance } from 'fastify';
import type { PilotAiAnalyzeRequest, PilotAiAssessment, PilotAiSuitability, SafeAny } from '@mos-lab/shared';
import { pilotMediaDir } from './pilot.service.js';

export class PilotAiService {
  /**
   * System prompt instructing Gemini as an expert Dark Lashes assessment specialist
   */
  private static readonly SYSTEM_PROMPT = `Bạn là Master Chuyên Gia Uốn Mi Bóng Tối (Dark Lashes Master). Nhiệm vụ của bạn là hỗ trợ cô Đẫm và kỹ thuật viên phân tích điều kiện mi của khách hàng dựa trên:
1. Ảnh chụp mi phóng đại cận cảnh bằng Kính Macro 15x kẹp điện thoại (Apexel Macro 15x cự ly cố định 2cm, 1 pixel ≈ 1.8 µm, thấy rõ độ dày sợi mi và cấu trúc lớp vảy biểu bì keratin).
2. Kết quả checklist 5 tiêu chí: Độ dài mi, Độ dày sợi mi, Mật độ mi, Tình trạng sợi mi, Khả năng tạo form.
3. Ghi chú của kỹ thuật viên.

QUY TẮC PHÂN TÍCH:
- Đánh giá thẩm mỹ và kỹ thuật uốn mi. Tuyệt đối không chẩn đoán bệnh lý mắt hay y khoa.
- Xác định 1 trong 3 trạng thái Suitability:
  + "PASS": Đủ điều kiện uốn mi bóng tối an toàn. Mi khỏe, đủ dài (>=5mm), biểu bì nguyên vẹn.
  + "CAUTION": Cần cân nhắc kỹ. Mi có điểm nhạy cảm (mảnh nhẹ, mi hơi khô, ngọn yếu) -> cần giảm thời gian ủ hoặc bảo vệ ngọn.
  + "NOT_SUITABLE": Không phù hợp uốn hôm nay (mi quá ngắn <4mm, mi cháy gãy, rụng từng mảng, hoặc mới nối mi tháo bị tổn thương nặng).

ĐỊNH DẠNG TRẢ VỀ:
Bắt buộc trả về đúng cú pháp JSON thuần (không bọc trong markdown codeblock nếu có thể, hoặc bọc trong \`\`\`json):
{
  "lashProfile": {
    "summary": "Tóm tắt ngắn gọn tình trạng mi của khách (1-2 câu)",
    "estimatedThickness": "Ước tính đường kính sợi mi (VD: 0.08mm - 0.10mm · Sợi vừa)",
    "cuticleCondition": "Đánh giá lớp vảy biểu bì keratin (VD: Biểu bì nguyên bản, độ đàn hồi tốt)",
    "lengthAssessment": "Đánh giá độ dài sợi mi (VD: 7 - 9mm · Đủ chuẩn ôm trục uốn)",
    "densityAssessment": "Mật độ sợi mi (VD: Mật độ đều ~85-95 sợi/mắt)"
  },
  "suitability": "PASS" | "CAUTION" | "NOT_SUITABLE",
  "suitabilityScore": 85,
  "riskAttention": "Điểm lưu ý kỹ thuật đặc biệt cho ca làm",
  "recommendation": {
    "action": "Đề xuất hướng xử lý cho kỹ thuật viên",
    "solution1DurationMinutes": 10,
    "solution2DurationMinutes": 8,
    "recommendedRodSize": "M",
    "alternativeCare": "Giải pháp dưỡng phục hồi mi nếu NOT_SUITABLE (hoặc null nếu PASS)"
  }
}`;

  /**
   * Resolve image bytes to base64 string
   */
  private static async resolveImageBase64(
    photoUrl?: string,
    photoBase64?: string
  ): Promise<{ base64: string; mimeType: string } | null> {
    if (photoBase64) {
      const match = photoBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], base64: match[2] };
      }
      return { mimeType: 'image/jpeg', base64: photoBase64 };
    }

    if (!photoUrl) return null;

    if (photoUrl.startsWith('data:')) {
      const match = photoUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], base64: match[2] };
      }
    }

    if (photoUrl.includes('/api/pilot/media/')) {
      try {
        const filename = basename(photoUrl.split('?')[0]);
        const filePath = join(pilotMediaDir(), filename);
        const buffer = await readFile(filePath);
        let mimeType = 'image/jpeg';
        if (filename.endsWith('.png')) mimeType = 'image/png';
        else if (filename.endsWith('.webp')) mimeType = 'image/webp';
        return { base64: buffer.toString('base64'), mimeType };
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Main AI assessment entrypoint
   */
  static async analyzeLash(fastify: FastifyInstance, input: PilotAiAnalyzeRequest): Promise<PilotAiAssessment> {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const imageData = await this.resolveImageBase64(input.photoUrl, input.photoBase64);

    if (geminiApiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

        const parts: SafeAny[] = [];

        if (imageData) {
          parts.push({
            inlineData: {
              mimeType: imageData.mimeType,
              data: imageData.base64,
            },
          });
        }

        const criteriaSummary =
          Array.isArray(input.criteriaSnapshot) && input.criteriaSnapshot.length > 0
            ? input.criteriaSnapshot
                .map((c) => `- ${c.name}: ${c.passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}${c.note ? ` (${c.note})` : ''}`)
                .join('\n')
            : 'Chưa có ghi chú checklist.';

        const promptText = `Hãy phân tích tình trạng mi uốn bóng tối của khách hàng:
- Phương pháp chụp: ${input.captureMethod === 'STANDARD' ? 'Camera thông thường' : 'Kính Macro 15x kẹp điện thoại (cự ly 2cm)'}
- Kết quả kiểm tra checklist:
${criteriaSummary}
- Ghi chú thêm của kỹ thuật viên: ${input.technicianNotes || 'Không có'}

Hãy trả về phân tích theo đúng cấu trúc JSON yêu cầu.`;

        parts.push({ text: promptText });

        const payload = {
          systemInstruction: {
            parts: [{ text: this.SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: 'user',
              parts,
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        };

        const response = await axios.post(geminiUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 25000,
        });

        const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = this.parseGeminiJson(rawText);
          if (parsed) {
            return {
              ...parsed,
              analyzedAt: new Date().toISOString(),
              photoUrl: input.photoUrl ?? null,
              method: input.captureMethod || 'MACRO_15X',
              modelUsed: 'gemini-2.5-flash',
            };
          }
        }
      } catch (err: SafeAny) {
        fastify?.log?.warn?.(
          `[PilotAiService] Gemini API call failed, using heuristic engine fallback: ${err?.message || err}`
        );
      }
    }

    // Heuristic Fallback Engine
    return this.generateHeuristicAssessment(input);
  }

  /**
   * Safely parse JSON from Gemini response
   */
  private static parseGeminiJson(rawText: string): PilotAiAssessment | null {
    try {
      let clean = rawText.trim();
      if (clean.startsWith('```json')) {
        clean = clean
          .replace(/^```json/, '')
          .replace(/```$/, '')
          .trim();
      } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const json = JSON.parse(clean);
      if (!json.lashProfile || !json.suitability || !json.recommendation) {
        return null;
      }

      const suitability: PilotAiSuitability = ['PASS', 'CAUTION', 'NOT_SUITABLE'].includes(json.suitability)
        ? json.suitability
        : 'PASS';

      return {
        lashProfile: {
          summary: String(json.lashProfile.summary || 'Tình trạng mi ổn định.'),
          estimatedThickness: json.lashProfile.estimatedThickness
            ? String(json.lashProfile.estimatedThickness)
            : undefined,
          cuticleCondition: json.lashProfile.cuticleCondition ? String(json.lashProfile.cuticleCondition) : undefined,
          lengthAssessment: json.lashProfile.lengthAssessment ? String(json.lashProfile.lengthAssessment) : undefined,
          densityAssessment: json.lashProfile.densityAssessment
            ? String(json.lashProfile.densityAssessment)
            : undefined,
        },
        suitability,
        suitabilityScore:
          typeof json.suitabilityScore === 'number'
            ? json.suitabilityScore
            : suitability === 'PASS'
              ? 90
              : suitability === 'CAUTION'
                ? 65
                : 30,
        riskAttention: String(json.riskAttention || 'Theo dõi sát quá trình ủ thuốc.'),
        recommendation: {
          action: String(json.recommendation.action || 'Thực hiện theo quy trình SOP.'),
          solution1DurationMinutes:
            typeof json.recommendation.solution1DurationMinutes === 'number'
              ? json.recommendation.solution1DurationMinutes
              : 10,
          solution2DurationMinutes:
            typeof json.recommendation.solution2DurationMinutes === 'number'
              ? json.recommendation.solution2DurationMinutes
              : 8,
          recommendedRodSize: json.recommendation.recommendedRodSize
            ? String(json.recommendation.recommendedRodSize)
            : 'M',
          alternativeCare: json.recommendation.alternativeCare ? String(json.recommendation.alternativeCare) : null,
        },
        analyzedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Intelligent heuristic analysis engine based on checklist evaluation & expert rules
   */
  private static generateHeuristicAssessment(input: PilotAiAnalyzeRequest): PilotAiAssessment {
    const criteria = Array.isArray(input.criteriaSnapshot) ? input.criteriaSnapshot : [];
    const failedCriteria = criteria.filter((c) => !c.passed);
    const hasNote = !!input.technicianNotes?.trim();

    const isLengthFailed = failedCriteria.some((c) => c.name.toLowerCase().includes('độ dài'));
    const isConditionFailed = failedCriteria.some((c) => c.name.toLowerCase().includes('tình trạng'));
    const isThicknessFailed = failedCriteria.some((c) => c.name.toLowerCase().includes('độ dày'));
    const isDensityFailed = failedCriteria.some((c) => c.name.toLowerCase().includes('mật độ'));
    const isFormFailed = failedCriteria.some((c) => c.name.toLowerCase().includes('tạo form'));

    let suitability: PilotAiSuitability = 'PASS';
    let score = 92;
    let summary = 'Sợi mi nguyên bản khỏe mạnh, độ bóng keratin tự nhiên đạt chuẩn uốn mi bóng tối.';
    let estimatedThickness = '0.08mm - 0.10mm (Sợi vừa, biểu bì nguyên bản)';
    let cuticleCondition = 'Lớp vảy biểu bì keratin xếp đều, chưa từng tổn thương hóa chất';
    let lengthAssessment = '7 - 9mm (Đủ chuẩn ôm trục uốn)';
    let densityAssessment = 'Mật độ trung bình khá (~85-95 sợi/mắt)';
    let riskAttention = 'Sợi mi khỏe có độ đàn hồi tốt. Cần chải căng 90 độ sát chân trục silicon và cách chân mi 1mm.';
    let action = 'Đủ điều kiện uốn mi bóng tối. Tiến hành chụp ảnh Before và bắt đầu quy trình SOP 7 bước.';
    let solution1Minutes: number | null = 10;
    let solution2Minutes: number | null = 8;
    let rodSize: string | null = 'M';
    let alternativeCare: string | null = null;

    if (isLengthFailed || isConditionFailed || failedCriteria.length >= 3) {
      suitability = 'NOT_SUITABLE';
      score = 30;
      summary = isLengthFailed
        ? 'Sợi mi tự nhiên quá ngắn (dưới 4mm) hoặc bị gãy rụng do từng nối mi, không đủ độ bám ôm trục uốn.'
        : 'Cấu trúc keratin sợi mi bị tổn thương nặng hoặc cháy ngọn, không chịu được hóa chất làm mềm.';
      estimatedThickness = '< 0.05mm hoặc mi chẻ ngọn đứt đoạn';
      cuticleCondition = 'Lớp biểu bì keratin xơ xác, bề mặt sợi mi xù vảy do hóa chất cũ';
      lengthAssessment = isLengthFailed ? '< 4mm (Không đạt chuẩn ôm trục)' : '5 - 6mm (Chẻ ngọn đứt quãng)';
      densityAssessment = 'Thưa mỏng, có khoảng trống giữa các nang mi';
      riskAttention =
        'CẢNH BÁO NGUY HIỂM: Tuyệt đối không uốn thuốc số 1 vì nguy cơ quéo ngọn mi hoặc đứt gãy chân mi.';
      action =
        'Xác nhận Không Đủ Điều Kiện (NOT SUITABLE). Hướng dẫn khách phục hồi dưỡng mi và chuyển sang Check-out.';
      solution1Minutes = null;
      solution2Minutes = null;
      rodSize = null;
      alternativeCare =
        'Tư vấn liệu trình dưỡng phục hồi Keratin / Serum nuôi dưỡng mi trong 2 - 3 tuần. Hẹn khách quay lại kiểm tra khi mi con mọc dày và đạt độ dài tối thiểu 5mm.';
    } else if (isThicknessFailed || isFormFailed || isDensityFailed || failedCriteria.length > 0) {
      suitability = 'CAUTION';
      score = 68;
      if (isThicknessFailed) {
        summary = 'Sợi mi mảnh nhẹ, biểu bì keratin nhạy cảm với thời gian ủ thuốc làm mềm.';
        estimatedThickness = '0.05mm - 0.07mm (Sợi mảnh, nhạy cảm)';
        cuticleCondition = 'Lớp biểu bì mỏng, hấp thu thuốc nhanh hơn bình thường';
        lengthAssessment = '6 - 8mm (Đạt chuẩn)';
        riskAttention =
          'Sợi mi mảnh có tốc độ mở biểu bì rất nhanh. Phải kiểm tra sợi mi ở phút thứ 6-7 để tránh thừa thời gian.';
        action =
          'Tiến hành theo phác đồ mi nhạy cảm: phủ serum bảo vệ ngọn mi trước khi vào thuốc 1 và rút ngắn thời gian ủ.';
        solution1Minutes = 8;
        solution2Minutes = 7;
        rodSize = 'S';
      } else {
        summary = 'Mi có hướng mọc đan chéo hoặc mật độ thưa, cần kỹ thuật định hình mi cẩn thận trên trục.';
        estimatedThickness = '0.08mm - 0.09mm (Trung bình)';
        cuticleCondition = 'Khá ổn định, bề mặt sợi mi mịn';
        lengthAssessment = '7 - 8mm (Đạt chuẩn)';
        riskAttention =
          'Cần vuốt tách từng sợi mi thẳng hàng trên trục uốn trước khi vào thuốc 2 để tránh xô lệch form.';
        action = 'Đủ điều kiện có lưu ý kỹ thuật. Dùng keo định vị mi cẩn thận và chọn trục size vừa.';
        solution1Minutes = 9;
        solution2Minutes = 8;
        rodSize = 'M';
      }
      alternativeCare = 'Hướng dẫn khách thoa serum dưỡng bóng mi sau khi hoàn tất dịch vụ.';
    }

    if (hasNote && suitability === 'PASS') {
      riskAttention += ` Ghi chú CV: "${input.technicianNotes}".`;
    }

    return {
      lashProfile: {
        summary,
        estimatedThickness,
        cuticleCondition,
        lengthAssessment,
        densityAssessment,
      },
      suitability,
      suitabilityScore: score,
      riskAttention,
      recommendation: {
        action,
        solution1DurationMinutes: solution1Minutes,
        solution2DurationMinutes: solution2Minutes,
        recommendedRodSize: rodSize,
        alternativeCare,
      },
      analyzedAt: new Date().toISOString(),
      photoUrl: input.photoUrl ?? null,
      method: input.captureMethod || 'MACRO_15X',
      modelUsed: 'heuristic-rules-engine',
    };
  }
}
