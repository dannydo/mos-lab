import type { FastifyInstance } from 'fastify';
import type { TelesaleTvPersonaDto } from '@mos-lab/shared';
import { type CelebrationEventType, type CelebrationQuoteOptions, formatCurrencyForSpeech } from './tv-personas.js';
import { getFallbackCelebrationQuoteWithPersona, recordSpokenQuote } from './tv-fallback-quotes.js';

export async function generateLiveCelebrationQuote(
  fastify: FastifyInstance,
  type: CelebrationEventType,
  staffName: string,
  options?: CelebrationQuoteOptions
): Promise<{ quote: string; source: 'gemini' | 'fallback'; persona: TelesaleTvPersonaDto }> {
  const fallbackResult = getFallbackCelebrationQuoteWithPersona(type, staffName, options);
  const persona = fallbackResult.persona;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    return { quote: fallbackResult.quote, source: 'fallback', persona };
  }

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

    const tipSpeech = formatCurrencyForSpeech(options?.tipAmount);
    const comboName = options?.comboPackageName || 'gói Combo làm đẹp';
    const comboPriceSpeech = options?.comboPrice ? ` trị giá ${formatCurrencyForSpeech(options.comboPrice)}` : '';
    const cvName = options?.cvStaffName || 'Chuyên Viên';

    const eventDescription =
      {
        BOOK: 'BOOK (khách hàng vừa chốt lịch hẹn mới)',
        CHECKIN: 'CHECK-IN (khách hàng vừa có mặt check-in tại salon Wings)',
        DONE: 'DONE (khách hàng đã hoàn tất dịch vụ tại salon Wings)',
        COMBO: `COMBO (${staffName} vừa chốt thành công ${comboName}${comboPriceSpeech}. BẮT BUỘC nhắc rõ tên gói ${comboName} trong câu)`,
        TIP: `TIP (${staffName} và Chuyên Viên ${cvName} được khách gửi tặng tiền tip ${tipSpeech || 'xứng đáng'}. BẮT BUỘC nhắc rõ số tiền tip ${tipSpeech} trong câu)`,
      }[type] || type;

    const edginessLevel = options?.edginessLevel || 'SUPER_SPICY';
    const edginessTone =
      edginessLevel === 'CLASSIC'
        ? 'Lịch sự, hóm hỉnh nhẹ nhàng, chuẩn mực nam thần.'
        : edginessLevel === 'PLAYFUL'
          ? 'Hài hước, vui tươi, châm chọc nhẹ, nhiều tiếng lóng văn phòng duyên dáng.'
          : 'SIÊU NHAM NHỞ, LẦY LỘI, CÀ KHỊA CỰC BỰA, XÉO XẮT HOẶC GÀO THÉT BẤT NGỜ NHƯNG KHÔNG VĂNG TỤC THÔ THIỂN, TUÂN THỦ TÔN TRỌNG TAY NGHỀ CHUYÊN VIÊN.';

    const contextNotes: string[] = [];
    if (options?.streakCount && options.streakCount >= 2) {
      contextNotes.push(
        `ĐÂY LÀ ĐƠN THỨ ${options.streakCount} LIÊN TIẾP CỦA BẠN NÀY! Hãy cà khịa về việc chốt đơn như máy chém, cướp hết chén cơm đồng nghiệp!`
      );
    }
    if (options?.isMorningFirstOrder) {
      contextNotes.push('ĐÂY LÀ ĐƠN MỞ BÁT SÁNG SỚM TINH MƠ! Hãy chúc mừng hoặc cà khịa mở hàng linh nghiệm, vía lộc!');
    }
    if (options?.isLateNightShift) {
      contextNotes.push(
        'ĐƠN SÁT GIỜ ĐÓNG CA ĐÊM! Hãy cà khịa về việc thức canh kho bạc, đam mê tiền bạc hơn giấc ngủ!'
      );
    }

    const systemPrompt = `Bạn đang nhập vai nhân cách: "${persona.name}" (${persona.badge}) tại phòng Telesales War Room chuỗi làm đẹp Wings (Wingslashes).
ĐẶC TRƯNG TÍNH CÁCH: ${persona.tagline}.
MỨC ĐỘ MẶN MÒI & NHAM NHỞ: ${edginessTone}
${contextNotes.length > 0 ? `BỐI CẢNH ĐẶC BIỆT: ${contextNotes.join(' ')}` : ''}

Nhiệm vụ: Nói duy nhất 1 câu ngắn gọn (khoảng 14-22 từ) bằng tiếng Việt dành tặng cho nhân viên Telesales tên là "${staffName}", vừa có 1 sự kiện ${eventDescription}.
QUY TẮC BẮT BUỘC:
1. Nhập vai 100% đúng phong cách ${persona.name} (Ví dụ: MC Hội Chợ thì phải gào thét cuồng nhiệt, Cụ Tổ Drama thì phải xéo xắt châm chọc chua ngoa, Thầy Bói thì phán quẻ tài lộc ma mị, Gen Z thì từ lóng hot trend TikTok, Tổng Tài thì sến rện thả thính).
2. Phải nhắc đến tên "${staffName}".
3. Tuyệt đối không dùng từ "thợ", chỉ dùng danh xưng "Chuyên Viên" hoặc "CV" khi nhắc đến kỹ thuật viên làm đẹp.
4. Nếu là sự kiện TIP, BẮT BUỘC đọc rõ số tiền tip ("${tipSpeech}").
5. Nếu là sự kiện COMBO, BẮT BUỘC đọc rõ tên gói combo ("${comboName}").
6. Ngắn gọn, súc tích (14-22 từ), chỉ 1 câu duy nhất truyền cảm hứng và gây cười to cho cả phòng.
7. Chỉ trả về đúng 1 câu thoại để đọc phát loa trực tiếp, không có dấu ngoặc kép, không markdown, không giải thích.`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Hãy phát thanh 1 câu theo đúng tính cách ${persona.name} siêu nham nhở, bất ngờ cho ${staffName} vừa nổ ${type}!`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 1.15,
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 65,
        },
      }),
      signal: AbortSignal.timeout(2500),
    });

    if (!response.ok) {
      return { quote: fallbackResult.quote, source: 'fallback', persona };
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
    };

    const parts = data.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find((p) => !p.thought && p.text) || parts[parts.length - 1];
    const rawText = textPart?.text?.trim();

    if (rawText && rawText.length > 5) {
      const cleanText = rawText.replace(/^["'“”«»\s]+|["'“”«»\s]+$/g, '').trim();
      recordSpokenQuote(cleanText);
      return { quote: cleanText, source: 'gemini', persona };
    }
  } catch (err) {
    fastify.log.warn(`Gemini live celebration quote generation failed, using fallback: ${err}`);
  }

  return { quote: fallbackResult.quote, source: 'fallback', persona };
}
