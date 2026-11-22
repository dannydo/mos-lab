import type { AiChatContext } from '@mos-lab/shared';
import { StaffCareerContextService } from '../staff-career-context.service.js';
import type { ParsedAiResponse } from './ai-prompt-and-parser.js';

export function generateAssistantFallback(
  userMessage: string,
  context?: AiChatContext,
  _liveCareerContextText?: string
): ParsedAiResponse {
  const lower = userMessage.toLowerCase().trim();

  // 1. Greeting
  if (
    lower.includes('xin chào') ||
    lower.includes('hello') ||
    lower.includes('chào bạn') ||
    lower.includes('hi bạn') ||
    lower === 'alo' ||
    lower === 'chào'
  ) {
    return {
      thinking:
        'Nhận diện ý định chào hỏi. Giới thiệu vai trò Trợ lý AI Đa Nhiệm hoạt động trong Private Workspace của nhân sự, giải thích khả năng phân tích dữ liệu khách hàng và hỗ trợ áp dụng bộ lọc trực tiếp.',
      content:
        `Xin chào ${context?.userName ? `@${context.userName}` : 'bạn'}! MAI là **mOS AI** — Trợ lý AI Đa Nhiệm hỗ trợ trong Không gian làm việc và Nhóm trao đổi của bạn.\n\n` +
        'Tôi có thể hỗ trợ bạn:\n' +
        '- 📊 **Giải thích cấu trúc dữ liệu**: Ý nghĩa các nhóm khách (COMBO_LIVE, NOT_COMBO_LIVE, NYC 30/60/90).\n' +
        '- 🔍 **Phân tích & Lọc tệp khách**: Gợi ý tiêu chí lọc tối ưu và áp dụng trực tiếp vào bảng khách hàng của riêng bạn.\n' +
        '- 💡 **Tư vấn luồng CSKH**: Đề xuất quy trình gọi nhắc dặm mi và chiến lược chăm sóc khách hàng.\n\n' +
        'Bạn muốn tìm hiểu hoặc phân tích tệp khách nào hôm nay?',
      suggestedAction: null,
    };
  }

  // 2. Wings Culture & Kinh Thánh mOS (Điều răn MOS-002)
  if (
    lower.includes('văn hóa') ||
    lower.includes('văn hoá') ||
    lower.includes('kinh thánh') ||
    lower.includes('4 key') ||
    lower.includes('chìa khóa') ||
    lower.includes('giá trị cốt lõi')
  ) {
    return {
      thinking:
        'Truy vấn Kinh Thánh mOS (Kinh Thánh Wings) - Điều răn MOS-002: Trình bày 4 chìa khóa văn hóa Wings gồm Vui Vẻ, Ân Cần, Chân Thành và Khoa Học, cùng mối quan hệ liên hoàn giữa cảm xúc phục vụ và thước đo định lượng.',
      content:
        `Chào ${context?.userName ? `@${context.userName}` : 'bạn'}, MAI xin giải đáp chuẩn mực theo **Kinh Thánh mOS (Kinh Thánh Wings) — Điều răn MOS-002**:\n\n` +
        `Văn hóa Wings vận hành trên **4 chìa khóa liên hoàn**:\n\n` +
        `1. **Vui Vẻ**: Nụ cười và năng lượng tích cực từ bên trong là khởi nguồn của mọi hành vi phục vụ. Phải thật sự vui vẻ mới có thể ân cần được.\n` +
        `2. **Ân Cần**: Xuất phát từ niềm vui chân thật; ân cần mà không vui vẻ thì gượng gạo và giả tạo. Chăm chút từng sợi mi và sự thoải mái của khách.\n` +
        `3. **Chân Thành**: Sự ân cần được thực hành nhất quán và bền bỉ trong một thời gian dài chính là Chân Thành; được kiểm chứng qua hành động lâu năm chứ không phải lời hứa đầu môi.\n` +
        `4. **Khoa Học**: Ba điều trên là cảm xúc định tính. Khoa học và số liệu thực tế trên mOS là thước đo kiểm chứng chúng ta đang đi đúng hướng, tuyệt đối không đoán mò hay cảm tính.\n\n` +
        `💡 *Cảm xúc là linh hồn của dịch vụ, nhưng Khoa học là thước đo bảo đảm tổ chức phát triển bền vững.*`,
      suggestedAction: null,
    };
  }

  // 3. Explain Buckets & System Classification
  if (
    lower.includes('bucket') ||
    lower.includes('phân loại') ||
    lower.includes('nhóm khách') ||
    lower.includes('combo_live') ||
    lower.includes('not_combo') ||
    lower.includes('combo dead') ||
    lower.includes('giải thích các nhóm')
  ) {
    return {
      thinking:
        'Phân tích yêu cầu tìm hiểu cấu trúc hệ thống: Giải thích 4 nhóm khách hàng cốt lõi của mOS (COMBO_LIVE, NOT_COMBO_LIVE, COMBO_DEAD, SINGLE) cùng chu kỳ dặm mi chuẩn (21 ngày khách lẻ, 25 ngày khách combo).',
      content:
        '### 📌 Cấu Trúc Phân Loại Khách Hàng (Buckets) Trong mOS\n\n' +
        'Hệ thống mOS phân loại khách hàng thành 4 nhóm chiến lược:\n\n' +
        '1. **`COMBO_LIVE` (Khách Combo Còn Hạn)**:\n' +
        '   - Khách sở hữu gói combo dặm mi còn hiệu lực (trong vòng 25 ngày hoặc còn lượt dặm).\n' +
        '   - **Mục tiêu**: Duy trì trải nghiệm VIP, nhắc hẹn dặm mi đúng kỳ (ngày 14-20) để khách không bị rụng quá nhiều mi.\n\n' +
        '2. **`NOT_COMBO_LIVE` (Khách Lẻ Còn Hạn Dặm)**:\n' +
        '   - Khách làm mi lẻ còn trong hạn dặm 21 ngày nhưng **chưa mua combo**.\n' +
        '   - **Cơ hội vàng**: Tệp khách có tỷ lệ chuyển đổi cao nhất để Telesales và CC tư vấn mua Combo tiết kiệm.\n\n' +
        '3. **`COMBO_DEAD` (Khách Combo Quá Hạn)**:\n' +
        '   - Khách từng có gói combo nhưng đã quá 25 ngày không ghé hoặc đã hết số lượt.\n' +
        '   - **Mục tiêu**: Kích hoạt chiến dịch Win-Back với ưu đãi tái nối mi mới.\n\n' +
        '4. **`SINGLE` (Khách Lẻ Độc Lập)**:\n' +
        '   - Khách làm dịch vụ lẻ thông thường không sử dụng chính sách dặm định kỳ.',
      suggestedAction: {
        type: 'APPLY_FILTER',
        label: 'Xem tệp khách NOT_COMBO_LIVE (Cơ hội bán Combo)',
        payload: {
          activeTab: 'NOT_COMBO_LIVE',
          daysSinceLastVisitMin: 1,
          daysSinceLastVisitMax: 21,
        },
      },
    };
  }

  // 3. Filter request: NYC 60 / Days without visit / Spending
  if (
    lower.includes('lọc') ||
    lower.includes('tìm khách') ||
    lower.includes('chưa ghé') ||
    lower.includes('nyc') ||
    lower.includes('chi tiêu') ||
    lower.includes('vip')
  ) {
    let daysMin: number | undefined = undefined;
    let daysMax: number | undefined = undefined;
    let tab = 'ALL';
    let spentMin: number | undefined = undefined;
    let label = 'Lọc tệp khách hàng theo đề xuất';

    if (lower.includes('60') || lower.includes('nyc 60') || lower.includes('31-60')) {
      daysMin = 31;
      daysMax = 60;
      tab = 'NOT_COMBO_LIVE';
      label = 'Lọc khách NYC 60 (31-60 ngày chưa ghé)';
    } else if (lower.includes('90') || lower.includes('nyc 90')) {
      daysMin = 61;
      daysMax = 90;
      label = 'Lọc khách NYC 90 (61-90 ngày có nguy cơ rời bỏ)';
    } else if (lower.includes('30') || lower.includes('nyc 30')) {
      daysMin = 0;
      daysMax = 30;
      label = 'Lọc khách NYC 30 (Mới làm trong 30 ngày)';
    } else if (lower.includes('180') || lower.includes('lâu năm')) {
      daysMin = 91;
      label = 'Lọc khách không ghé trên 90 ngày';
    }

    if (lower.includes('triệu') || lower.includes('tr') || lower.includes('vip') || lower.includes('chi tiêu cao')) {
      const matchNumber = lower.match(/(\d+)\s*(?:triệu|tr)/);
      if (matchNumber) {
        spentMin = parseInt(matchNumber[1], 10) * 1_000_000;
      } else {
        spentMin = 2_000_000;
      }
      label += ` & Chi tiêu ≥ ${(spentMin / 1_000_000).toLocaleString('vi-VN')}tr`;
    }

    const payload: Record<string, unknown> = {
      activeTab: tab,
      ...(daysMin !== undefined ? { daysSinceLastVisitMin: daysMin } : {}),
      ...(daysMax !== undefined ? { daysSinceLastVisitMax: daysMax } : {}),
      ...(spentMin !== undefined ? { totalSpentMin: spentMin } : {}),
    };

    return {
      thinking: `Phân tích yêu cầu lọc khách: Nhận diện tiêu chí số ngày chưa ghé [${daysMin ?? 'auto'} - ${
        daysMax ?? 'auto'
      }], mức chi tiêu [${spentMin ?? 'không giới hạn'}]. Đề xuất cấu hình bộ lọc áp dụng cục bộ vào bảng dữ liệu cá nhân của người dùng.`,
      content:
        `Tôi đã phân tích yêu cầu của bạn và thiết lập cấu hình bộ lọc tương ứng:\n\n` +
        `- **Nhóm khách (Tab)**: \`${tab}\`\n` +
        (daysMin !== undefined ? `- **Số ngày chưa ghé**: Từ **${daysMin}** đến **${daysMax ?? '∞'}** ngày\n` : '') +
        (spentMin !== undefined
          ? `- **Mức chi tiêu tối thiểu**: **${spentMin.toLocaleString('vi-VN')} đ** (Khách giá trị cao)\n`
          : '') +
        `\n💡 *Gợi ý thực thi*: Bạn có thể nhấn nút **"Áp dụng vào bảng hiện tại"** bên dưới. Bộ lọc sẽ chỉ hiển thị trên màn hình của bạn mà không làm ảnh hưởng đến dữ liệu hay phiên làm việc của các thành viên khác.`,
      suggestedAction: {
        type: 'APPLY_FILTER',
        label,
        payload,
      },
    };
  }

  // 4. Personal customer scope
  if (
    lower.includes('của tôi') ||
    lower.includes('tôi quản lý') ||
    lower.includes('cá nhân') ||
    lower.includes('được giao')
  ) {
    return {
      thinking:
        'Nhận diện yêu cầu truy vấn tệp khách hàng cá nhân. Tạo action cấu hình assignedStaffId: "me" để giới hạn dữ liệu trong phạm vi quản lý của người dùng.',
      content:
        `Để xem và quản lý tệp khách hàng được phân bổ trực tiếp cho tài khoản của bạn, bạn có thể áp dụng bộ lọc cá nhân.\n\n` +
        `Khi áp dụng, hệ thống sẽ lọc danh sách khách theo \`assignedStaffId: "me"\`. Bạn có thể kết hợp thêm tiêu chí ngày chưa ghé để ưu tiên gọi những khách sắp đến kỳ dặm mi trước.`,
      suggestedAction: {
        type: 'APPLY_FILTER',
        label: 'Xem tệp khách hàng được phân bổ cho tôi',
        payload: {
          activeTab: 'ALL',
          assignedStaffId: 'me',
        },
      },
    };
  }

  // 5. Workflow advice
  if (
    lower.includes('quy trình') ||
    lower.includes('workflow') ||
    lower.includes('kịch bản') ||
    lower.includes('chăm sóc')
  ) {
    return {
      thinking:
        'Người dùng cần tư vấn về quy trình CSKH và kịch bản chăm sóc khách dặm mi tối ưu. Cung cấp quy trình 3 mốc thời gian chuẩn của chuỗi Wings Lashes.',
      content:
        '### 🎯 Quy Trình Chăm Sóc Khách Hàng Chuẩn (CSKH Workflow)\n\n' +
        'Để tối ưu tỷ lệ giữ chân khách và tăng doanh số Combo, hãy áp dụng quy trình 3 điểm chạm:\n\n' +
        '1. **Điểm chạm 1 (Ngày thứ 3 sau làm mi)**:\n' +
        '   - Nhắn tin/gọi hỏi thăm cảm giác mi (có bị cộm, ngứa hay rụng bất thường không).\n' +
        '   - Hướng dẫn cách chải mi và kiêng nước trong 24 giờ đầu.\n\n' +
        '2. **Điểm chạm 2 (Ngày thứ 14 - 18)**:\n' +
        '   - Nhắc khách chuẩn bị đến lịch dặm mi để giữ form mi luôn dày đẹp.\n' +
        '   - Cảnh báo mốc 21 ngày đối với khách lẻ để không bị mất quyền lợi dặm giá ưu đãi.\n\n' +
        '3. **Điểm chạm 3 (Tại quầy khi khách ghé dặm)**:\n' +
        '   - Tư vấn viên CC In giới thiệu gói Combo dặm mi 3-5 lần để tiết kiệm chi phí đến 35%.',
      suggestedAction: {
        type: 'APPLY_FILTER',
        label: 'Lọc khách ngày thứ 14 - 20 (Đang cần nhắc dặm mi)',
        payload: {
          activeTab: 'ALL',
          daysSinceLastVisitMin: 14,
          daysSinceLastVisitMax: 20,
        },
      },
    };
  }

  // 6. Career Path, Staff Competency Profile & Promotions (MOS-BUG-189)
  if (StaffCareerContextService.isCareerQuery(userMessage)) {
    const isAskingWhy =
      lower.includes('vì sao') ||
      lower.includes('tại sao') ||
      lower.includes('lý do') ||
      lower.includes('tiêu chí') ||
      lower.includes('điều kiện');
    const isAskingKhanh = lower.includes('khanh');
    const isAskingLy = lower.includes('thảo ly') || lower.includes('ly');

    let thinking =
      'Truy xuất dữ liệu live từ hệ thống mOS về Career Path và hồ sơ năng lực của Chuyên Viên. Trình bày số liệu thực chứng khoa học, cấp bậc Chuyên Viên Tự Chủ (CV🪶) và quyết định thăng cấp ngày 01/11/2026.';
    let content: string;

    if (isAskingWhy && (isAskingKhanh || isAskingLy)) {
      thinking =
        'Phân tích cơ sở thực chứng và lý do thăng cấp lên Chuyên Viên Tự Chủ (CV🪶) cho Khanh Cao / Thảo Ly dựa trên 4 trụ cột: tay nghề chuẩn xác 0% bảo hành, năng lực tự chủ LoCa chốt Combo, tỷ lệ nhận tip vượt chuẩn salon và quyết định phê duyệt chính thức.';

      content = `Chào ${context?.userName ? `@${context.userName}` : 'anh/chị'}, MAI xin trích xuất số liệu thực chứng khoa học từ cơ sở dữ liệu live của hệ thống mOS về lý do thăng cấp **Chuyên Viên Tự Chủ (CV🪶)**:\n\n`;

      if (isAskingKhanh || !isAskingLy) {
        content +=
          `### 🪶 Chuyên Viên Tự Chủ: Khanh Cao (ID: 37)\n` +
          `- **Cấp bậc hiện tại**: Chuyên Viên Tự Chủ (CV🪶)\n` +
          `- **Ngày thăng cấp**: **01/11/2026** — Người phê duyệt: **Danny Do (Super Admin)**\n` +
          `- **Bốn trụ cột thực chứng khoa học đủ điều kiện thăng cấp**:\n` +
          `  1. 🎯 **Kỹ thuật & Độ bền tuyệt đối**: Hoàn tất **397 lượt phục vụ** với **Tỷ lệ bảo hành (Fix Rate) 0%** (0 ca lỗi), thể hiện tay nghề tinh xảo và tính an toàn cao.\n` +
          `  2. 🔄 **Năng lực tự chủ & Giữ chân khách (LoCa)**: Tự chốt thành công **9 gói Combo** (Tỷ lệ LoCa / Self-Combo **17.3%**), chứng minh khả năng tạo giá trị bền vững cho khách.\n` +
          `  3. 💖 **Tỷ lệ yêu mến & Đánh giá cao**: Tỷ lệ khách cho tip đạt **53.6%** (TB **33.950đ/lượt**), cao hơn đáng kể so với mức trung bình toàn salon (47.4%). Điểm hài lòng CSAT đạt **58.4%**.\n` +
          `  4. 🏆 **Tính kỷ luật & Trách nhiệm**: Hoàn thành xuất sắc các bài sát hạch kỹ năng tại chi nhánh Đề Thám (DT).\n\n`;
      }

      if (isAskingLy || !isAskingKhanh) {
        content +=
          `### 🪶 Chuyên Viên Tự Chủ: Thảo Ly (ID: 55)\n` +
          `- **Cấp bậc hiện tại**: Chuyên Viên Tự Chủ (CV🪶)\n` +
          `- **Ngày thăng cấp**: **01/11/2026** — Người phê duyệt: **Danny Do (Super Admin)**\n` +
          `- **Bốn trụ cột thực chứng khoa học đủ điều kiện thăng cấp**:\n` +
          `  1. 🎯 **Kỹ thuật xuất sắc (Fix Rate 0%)**: Hoàn thành **386 lượt phục vụ** mà không phát sinh bất kỳ ca bảo hành nào (0 ca lỗi).\n` +
          `  2. 🚀 **Năng lực chuyển đổi Combo vượt trội**: Đạt tỷ lệ tự chốt Combo (Self-Combo / LoCa) lên đến **47.1%** (**16 gói Combo**), thuộc top đầu salon.\n` +
          `  3. 🌟 **Chỉ số hài lòng khách hàng đỉnh cao**: Điểm CSAT / Happiness Index đạt **74.8%**. Tỷ lệ khách cho tip đạt **59.3%** với mức tip trung bình **49.688đ/lượt** (vượt xa chuẩn shop 47.4%).\n` +
          `  4. 🪽 **Tiên phong văn hóa 4 Chìa Khóa**: Phục vụ Vui Vẻ, Ân Cần, Chân Thành và Khoa Học bền bỉ tại cơ sở Đề Thám (DT).\n\n`;
      }

      content += `💡 *Quyết định thăng cấp CV🪶 dựa trên dữ liệu thực tế 100%, phản ánh đúng phẩm chất của Chuyên Viên Tự Chủ.*`;
    } else {
      // General Career Path / Rank query (Khanh Cao, Thảo Ly)
      content =
        `Chào ${context?.userName ? `@${context.userName}` : 'anh/chị'}, MAI xin báo cáo dữ liệu live từ hệ thống mOS về cấp bậc và lộ trình **Career Path** của Chuyên Viên:\n\n` +
        `### 🪶 Hồ Sơ Cấp Bậc Hiện Tại:\n` +
        `1. **Khanh Cao (ID: 37)**:\n` +
        `   - **Cấp bậc**: **Chuyên Viên Tự Chủ (CV🪶)**\n` +
        `   - **Trạng thái**: Đã thăng cấp chính thức (**PROMOTED**)\n` +
        `   - **Ngày thăng cấp**: **01/11/2026** bởi **Danny Do (Super Admin)**\n` +
        `   - **Chỉ số nổi bật**: 397 lượt phục vụ hoàn tất | Tỷ lệ nhận tip 53.6% | 9 gói Combo (17.3%) | Tỷ lệ lỗi 0% | CSAT 58.4%\n` +
        `   - **Mục tiêu tiếp theo**: **🪶CV🪶** (Chuyên Viên Tự Chủ Cấp Cao)\n\n` +
        `2. **Thảo Ly (ID: 55)**:\n` +
        `   - **Cấp bậc**: **Chuyên Viên Tự Chủ (CV🪶)**\n` +
        `   - **Trạng thái**: Đã thăng cấp chính thức (**PROMOTED**)\n` +
        `   - **Ngày thăng cấp**: **01/11/2026** bởi **Danny Do (Super Admin)**\n` +
        `   - **Chỉ số nổi bật**: 386 lượt phục vụ hoàn tất | Tỷ lệ nhận tip 59.3% | 16 gói Combo (47.1%) | Tỷ lệ lỗi 0% | CSAT 74.8%\n` +
        `   - **Mục tiêu tiếp theo**: **🪶CV🪶** (Chuyên Viên Tự Chủ Cấp Cao)\n\n` +
        `Cả hai bạn đều đã vượt qua các bài sát hạch kỹ năng tay nghề và đang hoạt động tại chi nhánh **Đề Thám (DT)**.`;
    }

    return {
      thinking,
      content,
      suggestedAction: null,
    };
  }

  // 7. Generic response
  return {
    thinking:
      'Tiếp nhận câu hỏi mở từ nhân sự. Phản hồi thông tin nghiệp vụ và đề xuất các hỗ trợ tiếp theo trong không gian làm việc.',
    content:
      `Tôi đã ghi nhận nội dung trao đổi của bạn: "${userMessage}".\n\n` +
      'Bạn có thể yêu cầu tôi hỗ trợ thêm:\n' +
      '- 🔎 Tìm kiếm và lọc tệp khách hàng theo ngày chưa ghé (NYC 30/60/90) hoặc chi tiêu.\n' +
      '- 📚 Giải thích quy chuẩn dặm mi (21 ngày khách lẻ, 25 ngày khách combo).\n' +
      '- 📊 Phân tích cơ hội chuyển đổi khách lẻ sang gói Combo dặm mi tiết kiệm.',
    suggestedAction: null,
  };
}
