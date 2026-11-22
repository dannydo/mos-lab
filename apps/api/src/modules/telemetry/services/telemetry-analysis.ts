import type { FrontendIssueAgAnalysis, FrontendIssueRecord } from '@mos-lab/shared';

export function generateAgAnalysis(issue: FrontendIssueRecord): FrontendIssueAgAnalysis {
  const target = (issue.target || '').toLowerCase();
  const path = issue.path || '';
  const message = issue.message || '';
  const errorName = issue.latestPayload?.error?.name || '';

  // 1. Check RAGE_CLICK
  if (issue.issueType === 'RAGE_CLICK') {
    if (
      target.includes('gọi nhỡ') ||
      target.includes('textarea') ||
      path.includes('/nyc') ||
      path.includes('/customers')
    ) {
      return {
        issueId: issue.id,
        severity: 'P1',
        category: 'Trải nghiệm Booker / Call Wrapup UX',
        title: 'Tối ưu trải nghiệm lưu nhanh cuộc gọi nhỡ và triệt tiêu Rage Click textarea',
        rootCause: `Booker thao tác kết thúc cuộc gọi nhỡ và thấy modal tự động điền "Gọi nhỡ - Không trả lời" vào ô ghi chú. Do thiếu nút bấm xác nhận 1-click hoặc phản hồi trực quan tức thì, người dùng click dồn dập vào textarea (${issue.occurrenceCount} lần) để cố gắng lưu hoặc sao chép nội dung.`,
        affectedComponents: ['CallLogModal', 'CallLogForm', 'Antd.TextArea'],
        affectedFiles: ['apps/web/components/CallLogModal.tsx', 'apps/web/context/omicall/OmiCallProvider.tsx'],
        proposedFix: [
          'Bổ sung nút bấm to rõ "⚡ Lưu Nhanh Gọi Nhỡ (1-Click)" trong CallLogModal.tsx để tự động lưu và đóng modal ngay mà không cần chạm vào ô ghi chú.',
          'Thêm tooltip thông báo và hiệu ứng highlight/lock focus nhẹ trên textarea để nhân viên không click vô thức.',
          'Tối ưu hóa thời gian hiển thị thông báo lưu thành công (<100ms) để phản hồi tức thì cho người dùng.',
        ],
        riskAssessment: 'Thấp. Chỉ tác động giao diện CallLogModal, không ảnh hưởng cấu trúc dữ liệu cuộc gọi.',
        estimatedEffort: '15 - 30 phút',
        confidenceScore: 0.98,
      };
    }

    if (target.includes('sao chép') || target.includes('copy')) {
      return {
        issueId: issue.id,
        severity: 'P2',
        category: 'Tương tác Clipboard / UI Feedback',
        title: 'Bổ sung phản hồi xúc giác (Toast / Animation) khi sao chép tin nhắn',
        rootCause: `Thao tác click sao chép tin nhắn không có thông báo toast phản hồi tức thì hoặc bị trễ do luồng render chính bận, khiến người dùng bấm liên tục ${issue.occurrenceCount} lần.`,
        affectedComponents: ['CopyButton', 'CustomerMessageList'],
        affectedFiles: ['apps/web/app/dashboard/customers/page.tsx', 'apps/web/components/ui/StatusTag.tsx'],
        proposedFix: [
          'Bổ sung toast phản hồi tức thì "Đã sao chép vào bộ nhớ tạm" trong vòng <50ms.',
          'Thêm trạng thái nút chuyển sang icon Check xanh lá trong 1.5s.',
          'Debounce click trong 800ms để ngăn chặn việc gửi nhiều sự kiện trùng lặp.',
        ],
        riskAssessment: 'Rất thấp. Hoàn toàn là cải thiện UI/UX.',
        estimatedEffort: '15 phút',
        confidenceScore: 0.95,
      };
    }

    return {
      issueId: issue.id,
      severity: 'P2',
      category: 'Giao diện / Độ trễ Phản hồi (UI Latency)',
      title: `Khắc phục hiện tượng lag và bổ sung phản hồi khi click vào ${issue.target || 'phần tử UI'}`,
      rootCause: `Thao tác click vào ${issue.target || 'phần tử giao diện'} không phản hồi lập tức do các API nền đang tải hoặc thiếu trạng thái loading indicator, khiến người dùng click dồn dập ${issue.occurrenceCount} lần.`,
      affectedComponents: ['InteractiveList', 'CardItem'],
      affectedFiles: [
        path.includes('/nyc') ? 'apps/web/app/dashboard/nyc/page.tsx' : 'apps/web/app/dashboard/customers/page.tsx',
      ],
      proposedFix: [
        'Thêm hiệu ứng hover active, spinner loading nhẹ khi người dùng tương tác.',
        'Bổ sung debounce click chống spam thao tác liên tục.',
        'Kiểm tra và ngăn chặn re-render thừa của component cha khi click.',
      ],
      riskAssessment: 'Thấp.',
      estimatedEffort: '20 phút',
      confidenceScore: 0.92,
    };
  }

  // 2. Check SLOW_INTERACTION
  if (issue.issueType === 'SLOW_INTERACTION') {
    if (target.includes('/bug-reports/mine') || message.includes('/bug-reports/mine')) {
      return {
        issueId: issue.id,
        severity: 'P1',
        category: 'Hiệu năng API / Truy vấn Nặng',
        title: 'Tối ưu hóa endpoint GET /bug-reports/mine và tinh gọn quan hệ nạp sâu',
        rootCause: `Endpoint GET /bug-reports/mine thực hiện transaction gồm 4 query lớn kèm include sâu 10 bảng quan hệ (audits, comments, attachments, jobs...) với take: 100, phản hồi chậm ${message} trên mỗi lần đổi route hoặc poll thông báo.`,
        affectedComponents: ['BugReportService.mine', 'NotificationPolling'],
        affectedFiles: [
          'apps/api/src/modules/bug-reports/bug-report.service.ts',
          'apps/api/src/modules/bug-reports/routes.ts',
        ],
        proposedFix: [
          'Rút gọn DTO cho /bug-reports/mine: chỉ select các trường cơ bản cần hiển thị trên Header/Badge, bỏ include toàn bộ audits và jobs sâu.',
          'Bổ sung composite index trên crm_bug_reports(reporter_staff_id, created_at) và crm_bug_report_notifications(recipient_staff_id, read_at).',
          'Giảm take từ 100 xuống 20 và bổ sung client-side caching 30 giây.',
        ],
        riskAssessment: 'Trung bình. Cần xác nhận các component đọc thông báo ở Header không bị thiếu trường.',
        estimatedEffort: '30 - 45 phút',
        confidenceScore: 0.98,
      };
    }

    if (target.includes('/calls/daily') || message.includes('/calls/daily')) {
      return {
        issueId: issue.id,
        severity: 'P1',
        category: 'Hiệu năng Báo cáo / OmiCall Aggregation',
        title: 'Tối ưu truy vấn báo cáo cuộc gọi ngày GET /calls/daily',
        rootCause: `Truy vấn thống kê cuộc gọi ngày quét qua toàn bộ bảng crm_call_logs chưa có composite index theo (staff_id, call_date), dẫn đến thời gian phản hồi kéo dài ${message}.`,
        affectedComponents: ['CallService.dailyStats', 'CallReportQuery'],
        affectedFiles: ['apps/api/src/modules/calls/call.service.ts', 'apps/api/prisma/crm.prisma'],
        proposedFix: [
          'Bổ sung composite index trên bảng crm_call_logs(staff_id, created_at) và crm_call_logs(call_date).',
          'Áp dụng in-memory / redis cache 30 giây cho thống kê tổng hợp của Booker/Telesales.',
          'Phân vùng query để không quét các bản ghi cũ hơn 30 ngày.',
        ],
        riskAssessment: 'Thấp.',
        estimatedEffort: '30 phút',
        confidenceScore: 0.96,
      };
    }

    if (target.includes('/staff') || message.includes('/staff')) {
      return {
        issueId: issue.id,
        severity: 'P1',
        category: 'Client Caching / Danh mục Nhân sự',
        title: 'Bổ sung client caching và ETag cho endpoint danh mục GET /staff',
        rootCause: `Endpoint GET /staff được gọi lặp đi lặp lại ở nhiều component con khi chuyển trang hoặc re-render, gây nghẽn băng thông và phản hồi chậm ${message}.`,
        affectedComponents: ['StaffService', 'useStaffList'],
        affectedFiles: ['apps/web/lib/api-client.ts', 'apps/api/src/modules/staff/routes.ts'],
        proposedFix: [
          'Bổ sung SWR / React Query cache 60s cho danh mục nhân sự phía web client.',
          'Phía backend Fastify trả về header Cache-Control: private, max-age=60 và hỗ trợ If-None-Match ETag.',
          'Ngăn chặn các component con gọi API trùng lặp trong cùng 1 view render.',
        ],
        riskAssessment: 'Rất thấp.',
        estimatedEffort: '20 phút',
        confidenceScore: 0.95,
      };
    }

    if (target.includes('/cv-realtime-status') || target.includes('/allocation')) {
      return {
        issueId: issue.id,
        severity: 'P1',
        category: 'Điều phối Ca / Realtime Status Query',
        title: `Tối ưu truy vấn điều phối và trạng thái thời gian thực ${issue.target || ''}`,
        rootCause: `Truy vấn trạng thái CV và đơn chờ quét qua nhiều bảng liên kết lớn đồng thời, phản hồi chậm ${message}.`,
        affectedComponents: ['CustomerService', 'AllocationService'],
        affectedFiles: ['apps/api/src/modules/customer/customer.service.ts'],
        proposedFix: [
          'Tối ưu câu lệnh Prisma raw SQL, chỉ lấy các ca làm việc trong ngày.',
          'Thêm composite index cho order_service theo trạng thái và thời gian bắt đầu.',
          'Tối ưu polling interval từ 3s lên 10s kèm debounce.',
        ],
        riskAssessment: 'Trung bình.',
        estimatedEffort: '35 phút',
        confidenceScore: 0.94,
      };
    }

    return {
      issueId: issue.id,
      severity: 'P1',
      category: 'Hiệu năng Tải Dữ liệu / Slow API',
      title: `Tối ưu hóa endpoint API ${issue.target || issue.path}`,
      rootCause: `API ${issue.target || issue.path} phản hồi chậm (${issue.message}), vượt ngưỡng 3000ms gây nghẽn luồng xử lý của trình duyệt và ức chế cho nhân sự vận hành.`,
      affectedComponents: ['ApiHandler', 'DatabaseQuery'],
      affectedFiles: ['apps/api/src/modules/telemetry/telemetry.service.ts'],
      proposedFix: [
        'Kiểm tra EXPLAIN ANALYZE các câu query database tương ứng.',
        'Bổ sung index thích hợp cho các trường trong mệnh đề WHERE/ORDER BY.',
        'Bổ sung HTTP caching hoặc phân trang pagination hợp lý.',
      ],
      riskAssessment: 'Thấp.',
      estimatedEffort: '30 phút',
      confidenceScore: 0.9,
    };
  }

  // 3. Check UNCAUGHT_EXCEPTION
  if (issue.issueType === 'UNCAUGHT_EXCEPTION') {
    if (message.includes('SDK not initialized') || errorName.includes('SDK not initialized')) {
      return {
        issueId: issue.id,
        severity: 'P0',
        category: 'OmiCall WebRTC Web SDK / Lifecycle Error',
        title: 'Khắc phục lỗi Uncaught Error: SDK not initialized trong core.min.js',
        rootCause: `File public/core.min.js ném ngoại lệ khi các component gọi phương thức gọi thoại/âm thanh trước khi StringeeClient.connect() hoàn tất bắt tay, lặp lại ${issue.occurrenceCount} lần.`,
        affectedComponents: ['OmiCallProvider', 'useSipConnection', 'WebRTC Bridge'],
        affectedFiles: ['apps/web/context/omicall/OmiCallProvider.tsx', 'apps/web/context/omicall/useSipConnection.ts'],
        proposedFix: [
          'Bổ sung cờ isSdkReady và bọc kiểm tra an toàn (defensive check) trước mọi cuộc gọi SDK trong OmiCallProvider.tsx.',
          'Xếp hàng (queue) các lệnh gọi thoại nếu SDK đang trong trạng thái CONNECTING thay vì gọi trực tiếp.',
          'Thêm try-catch bao bọc các sự kiện unmount dọn dẹp WebRTC.',
        ],
        riskAssessment: 'Thấp. Tăng tính ổn định cho tổng đài OmiCall.',
        estimatedEffort: '20 phút',
        confidenceScore: 0.99,
      };
    }

    if (message.includes('cleanupOmiCallMediaBridge')) {
      return {
        issueId: issue.id,
        severity: 'P0',
        category: 'Media Bridge / Re-export Error',
        title: 'Khắc phục lỗi TypeError: cleanupOmiCallMediaBridge is not a function',
        rootCause: `Hàm cleanupOmiCallMediaBridge bị undefined lúc unmount do import vòng hoặc tree-shaking sai giữa mediaBridge.ts và useSipConnection.ts.`,
        affectedComponents: ['OmiCallMediaBridge', 'OmiCallProvider'],
        affectedFiles: [
          'apps/web/context/omicall/mediaBridge.ts',
          'apps/web/context/omicall/useSipConnection.ts',
          'apps/web/context/omicall/OmiCallProvider.tsx',
        ],
        proposedFix: [
          'Import trực tiếp cleanupOmiCallMediaBridge từ ./mediaBridge.js, loại bỏ circular re-export trong useSipConnection.ts.',
          'Thêm defensive guard typeof cleanupOmiCallMediaBridge === "function" trước khi thực thi.',
        ],
        riskAssessment: 'Rất thấp.',
        estimatedEffort: '10 phút',
        confidenceScore: 0.99,
      };
    }

    return {
      issueId: issue.id,
      severity: 'P1',
      category: 'JavaScript Runtime / Ngoại lệ Chưa bắt',
      title: `Khắc phục ngoại lệ JavaScript: ${issue.message.slice(0, 80)}`,
      rootCause: `Ngoại lệ runtime ${issue.message} phát sinh tại trang ${issue.path} không được bao bọc try-catch hoặc ErrorBoundary.`,
      affectedComponents: ['RuntimeHandler', 'PageContainer'],
      affectedFiles: ['apps/web/app/layout.tsx'],
      proposedFix: [
        'Bổ sung try-catch defensive bao quanh logic phát sinh lỗi.',
        'Bổ sung fallback UI an toàn tránh sập toàn bộ trang.',
      ],
      riskAssessment: 'Thấp.',
      estimatedEffort: '20 phút',
      confidenceScore: 0.88,
    };
  }

  // 4. Check REACT_CRASH
  if (issue.issueType === 'REACT_CRASH') {
    return {
      issueId: issue.id,
      severity: 'P0',
      category: 'Next.js Dynamic Chunk / Deploy Cache Mismatch',
      title: 'Tự động phục hồi khi gặp ChunkLoadError sau khi Deploy bản mới',
      rootCause: `Người dùng chuyển trang trong khi phiên bản build mới vừa được deploy lên VPS làm thay đổi hash của chunk JS (${issue.message}).`,
      affectedComponents: ['GlobalErrorBoundary', 'RootLayout'],
      affectedFiles: ['apps/web/app/layout.tsx', 'apps/web/components/telemetry/FrontendTelemetryProvider.tsx'],
      proposedFix: [
        'Bổ sung window.addEventListener("error") bắt lỗi ChunkLoadError và tự động gọi window.location.reload() để tải bundle mới nhất.',
        'Lưu cờ sessionStorage để chống reload loop nếu mạng thực sự mất kết nối.',
      ],
      riskAssessment: 'Thấp.',
      estimatedEffort: '15 phút',
      confidenceScore: 0.97,
    };
  }

  // Default Fallback
  return {
    issueId: issue.id,
    severity: issue.issueType === 'API_FAILURE' ? 'P1' : 'P2',
    category: 'Mạng & Hạ tầng / Giao tiếp API',
    title: `Xử lý sự cố ${issue.issueType} tại ${issue.path}`,
    rootCause: `Sự cố ${issue.issueType} (${issue.message}) ghi nhận tại đường dẫn ${issue.path}.`,
    affectedComponents: ['FrontendView', 'ApiClient'],
    affectedFiles: ['apps/web/lib/api-client.ts'],
    proposedFix: [
      'Kiểm tra kết nối mạng và tính sẵn sàng của backend service.',
      'Thêm cơ chế tự động thử lại (exponential backoff retry) cho các request thất bại.',
    ],
    riskAssessment: 'Thấp.',
    estimatedEffort: '20 phút',
    confidenceScore: 0.85,
  };
}
