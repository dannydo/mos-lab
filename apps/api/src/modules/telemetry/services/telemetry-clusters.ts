import type { FrontendIssueClusterKey } from '@mos-lab/shared';

export interface ClusterMetadata {
  clusterKey: FrontendIssueClusterKey;
  title: string;
  severity: 'P0' | 'P1' | 'P2';
  description: string;
  rootCause: string;
  affectedFiles: string[];
  proposedFixSteps: string[];
}

export const CLUSTER_METADATA: Record<FrontendIssueClusterKey, ClusterMetadata> = {
  POLLING_SLOW_API: {
    clusterKey: 'POLLING_SLOW_API',
    title: 'Tối ưu hóa Database Indexing & Cache SWR cho các API Polling ngốn tài nguyên',
    severity: 'P0',
    description:
      'Các endpoint polling định kỳ (/bug-reports/mine, /calls/daily, /staff, /allocation, /cv-realtime-status) phản hồi chậm 3000ms - 9000ms, chiếm hơn 58% tổng số lượt nghẽn mạng và làm chậm toàn bộ hệ thống.',
    rootCause:
      'Thiếu composite index trên crmBugReport & order_service, payload trả về quá lớn, các component con gọi lặp đi lặp lại không có SWR cache 30s-60s.',
    affectedFiles: [
      'apps/api/src/modules/bug-report/bug-report.service.ts',
      'apps/api/src/modules/call/call.service.ts',
      'apps/api/src/modules/staff/staff.service.ts',
      'apps/web/lib/api-client.ts',
    ],
    proposedFixSteps: [
      'Thêm composite index (reporterStaffId, status, createdAt) trong schema Prisma CRM.',
      'Prune các trường relations include không cần thiết trong API GET /bug-reports/mine và GET /calls/daily.',
      'Tích hợp SWR / React Query cache 30s phía Web Client cho danh mục /staff và realtime polling.',
    ],
  },
  RAGE_CLICK_CALL_LOG: {
    clusterKey: 'RAGE_CLICK_CALL_LOG',
    title: 'Thiết kế nút Lưu Nhanh & Chống Click Liên Tục tại Modal Nhật Ký Cuộc Gọi Telesales',
    severity: 'P0',
    description:
      'Nhân viên telesales (Tâm Nguyễn, Thanh Vũ) bấm liên tiếp vào ô ghi chú "Gọi nhỡ - Không trả lời" trong CallLogModal do textarea không phản hồi tức thì.',
    rootCause:
      'Textarea trong CallLogModal không có phím tắt nhanh, nhân viên phải click nhiều lần để chọn focus hoặc submit khi mạng chậm.',
    affectedFiles: [
      'apps/web/app/dashboard/telesales/components/CallLogModal.tsx',
      'apps/web/app/dashboard/telesales/components/CallHistoryDrawer.tsx',
    ],
    proposedFixSteps: [
      'Bổ sung nút Quick Tag 1-click "Ghi nhanh: Gọi nhỡ" tự động điền và lưu ngay.',
      'Tự động auto-focus vào textarea khi mở modal.',
      'Bổ sung hiệu ứng loading spinner và debounce submit nút Lưu để chống double click.',
    ],
  },
  WEBRTC_SDK_CRASH: {
    clusterKey: 'WEBRTC_SDK_CRASH',
    title: 'Khắc phục Lỗi Khởi Tạo SDK OmiCall (core.min.js) & Import Vòng cleanupOmiCallMediaBridge',
    severity: 'P0',
    description:
      'Tổng đài OmiCall ném ngoại lệ Uncaught Error: SDK not initialized trong core.min.js và TypeError: cleanupOmiCallMediaBridge is not a function.',
    rootCause:
      'Component gọi hàm WebRTC trước khi StringeeClient hoàn tất connect, kèm theo circular re-export giữa mediaBridge.ts và useSipConnection.ts.',
    affectedFiles: [
      'apps/web/context/omicall/OmiCallProvider.tsx',
      'apps/web/context/omicall/useSipConnection.ts',
      'apps/web/context/omicall/mediaBridge.ts',
    ],
    proposedFixSteps: [
      'Bổ sung cờ isSdkReady và hàng đợi cuộc gọi trước khi StringeeClient sẵn sàng.',
      'Import trực tiếp cleanupOmiCallMediaBridge từ mediaBridge.ts, loại bỏ import vòng.',
      'Bổ sung defensive check typeof cleanupOmiCallMediaBridge === "function".',
    ],
  },
  OTHER_SLOW_INTERACTION: {
    clusterKey: 'OTHER_SLOW_INTERACTION',
    title: 'Giải Phóng Nghẽn Pool Kết Nối & Tối Ưu Hóa Phản Hồi Cho Các Trang Thứ Cấp',
    severity: 'P1',
    description:
      'Các tương tác và truy vấn thứ cấp bị trễ do hàng đợi kết nối HTTP của trình duyệt bị chiếm dụng bởi các API polling nặng.',
    rootCause:
      'Trình duyệt chỉ mở tối đa 6 kết nối HTTP đồng thời tới cùng một domain. Khi các API polling chiếm hết 6 slot, các thao tác khác của người dùng bị xếp hàng chờ (head-of-line blocking).',
    affectedFiles: ['apps/web/lib/api-client.ts', 'apps/api/src/modules/customer/customer.service.ts'],
    proposedFixSteps: [
      'Phân luồng ưu tiên cho các request tương tác người dùng so với polling ngầm.',
      'Tăng timeout hợp lý và hủy bỏ (AbortController) các request polling cũ khi có request mới.',
      'Nâng cấp HTTP/2 trên Nginx VPS để hỗ trợ multiplexing không giới hạn kết nối.',
    ],
  },
  OTHER_UI_RAGE_CLICK: {
    clusterKey: 'OTHER_UI_RAGE_CLICK',
    title: 'Tự Động Tải Lại Khi Đổi Chunk Bản Mới (ChunkLoadError) & Cải Thiện Độ Nhạy Nút Bấm UI',
    severity: 'P2',
    description:
      'Ghi nhận các lần click dồn dập rải rác và lỗi ChunkLoadError khi người dùng thao tác trong thời điểm VPS vừa deploy bản build mới.',
    rootCause:
      'Hash chunk JS cũ trên trình duyệt không còn tồn tại trên server sau khi build mới, gây sập component nếu không tự reload.',
    affectedFiles: ['apps/web/app/layout.tsx', 'apps/web/components/telemetry/FrontendTelemetryProvider.tsx'],
    proposedFixSteps: [
      'Bắt sự kiện ChunkLoadError ở window error handler và tự động reload trang 1 lần.',
      'Bổ sung active feedback (nhấp nháy / active scale) cho các nút bấm hành động.',
      'Cấu hình cache-control phù hợp cho static chunks.',
    ],
  },
};

export function classifyIssueIntoCluster(issue: {
  id?: number;
  issueType: string;
  path: string;
  target?: string | null;
  message: string;
}): FrontendIssueClusterKey {
  const target = (issue.target || '').toLowerCase();
  const message = (issue.message || '').toLowerCase();
  const path = (issue.path || '').toLowerCase();

  // 1. WebRTC & SDK Crash (P0)
  if (
    message.includes('sdk not initialized') ||
    message.includes('cleanupomicallmediabridge') ||
    message.includes('stringee') ||
    (issue.issueType === 'UNCAUGHT_EXCEPTION' && (target.includes('omicall') || message.includes('omicall')))
  ) {
    return 'WEBRTC_SDK_CRASH';
  }

  // 2. Call Log Rage Click (P0)
  if (
    issue.issueType === 'RAGE_CLICK' &&
    (target.includes('textarea') ||
      target.includes('gọi nhỡ') ||
      target.includes('call') ||
      path.includes('/telesales') ||
      path.includes('/calls'))
  ) {
    return 'RAGE_CLICK_CALL_LOG';
  }

  // 3. Polling Heavy Slow API (P0)
  if (
    target.includes('/bug-reports/mine') ||
    target.includes('/calls/daily') ||
    target.includes('/staff') ||
    target.includes('/cv-realtime-status') ||
    target.includes('/allocation') ||
    message.includes('/bug-reports/mine') ||
    message.includes('/calls/daily') ||
    message.includes('/staff') ||
    message.includes('/cv-realtime-status') ||
    message.includes('/allocation')
  ) {
    return 'POLLING_SLOW_API';
  }

  // 4. Other Slow Interaction (P1)
  if (issue.issueType === 'SLOW_INTERACTION' || issue.issueType === 'API_FAILURE') {
    return 'OTHER_SLOW_INTERACTION';
  }

  // 5. Remaining UI rage clicks, React crashes, blocked submits (P2)
  return 'OTHER_UI_RAGE_CLICK';
}
