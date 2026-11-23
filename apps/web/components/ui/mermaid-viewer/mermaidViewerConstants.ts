import type { StatusType } from '../StatusTag';
import type { CommentCategory, NodeComment } from './mermaidViewerTypes';

export const NODE_COMMENTS_STORAGE_KEY = 'mos_lab_node_comments_v1';
export const DEFAULT_AUTHOR_NAME = 'Phương Giao (CSKH Lead)';

export const COMMENT_CATEGORY_META: Record<
  CommentCategory,
  {
    status: StatusType;
    label: string;
    modalOptionLabel: string;
    drawerOptionLabel: string;
  }
> = {
  training: {
    status: 'processing',
    label: 'Đào Tạo',
    modalOptionLabel: '📘 Đào Tạo',
    drawerOptionLabel: '📘 Lưu ý Đào Tạo & Kịch Bản',
  },
  operations: {
    status: 'orange',
    label: 'Vận Hành',
    modalOptionLabel: '⚡ Vận Hành',
    drawerOptionLabel: '⚡ Quy tắc Vận Hành Thực Tế',
  },
  technical: {
    status: 'purple',
    label: 'Technical',
    modalOptionLabel: '⚙️ Technical',
    drawerOptionLabel: '⚙️ Cấu Hình Technical & Cronjob',
  },
};

export const getAuthorColor = (name: string): string => {
  if (!name) return 'rgb(139, 92, 246)';
  if (name.includes('Phương Giao')) return 'rgb(168, 85, 247)';
  if (name.includes('Ngọc Điệp')) return 'rgb(236, 72, 153)';
  if (name.includes('Quản lý CV') || name.includes('Trưởng KTV')) return 'rgb(245, 158, 11)';
  if (name.includes('Tech Admin')) return 'rgb(6, 182, 212)';
  return 'rgb(59, 130, 246)';
};

export const getAuthorAvatarClass = (name: string): string => {
  if (!name) return 'bg-violet-500';
  if (name.includes('Phương Giao')) return 'bg-purple-500';
  if (name.includes('Ngọc Điệp')) return 'bg-pink-500';
  if (name.includes('Quản lý CV') || name.includes('Trưởng KTV')) return 'bg-amber-500';
  if (name.includes('Tech Admin')) return 'bg-cyan-500';
  return 'bg-blue-500';
};

// Initial pre-seeded training comments for key workflow steps
export const DEFAULT_NODE_COMMENTS: Record<string, NodeComment[]> = {
  'cs-warranty:Start': [
    {
      id: 'c1',
      author: 'Phương Giao',
      role: 'CSKH Lead',
      category: 'operations',
      content:
        'Chỉ quét đơn có trạng thái order_state = Completed. Kiểm tra thời điểm actual_booking_date_start để tính hạn 72h bảo hành 3 ngày kiểu Úc.',
      createdAt: '2026-08-06 08:30',
    },
  ],
  'cs-warranty:TaskGen': [
    {
      id: 'c5',
      author: 'Ngọc Điệp',
      role: 'Telesales Leader',
      category: 'operations',
      content:
        'Hệ thống tự tạo Task Happy Call cho đội CSKH theo thuật toán phân bổ xoay vòng Round-Robin dựa trên danh sách ACTIVE_CS_STAFF_CONFIG.',
      createdAt: '2026-08-06 08:35',
    },
  ],
  'cs-warranty:Stage1': [
    {
      id: 'c2',
      author: 'Ngọc Điệp',
      role: 'Booking Leader',
      category: 'training',
      content:
        'CSKH tuyệt đối không hứa trước Fix/Adjust/Log khi gọi điện. Chỉ hỗ trợ Đặt Lịch Hẹn Đón Khách Đến Shop 0đ (Stage 1) để Quản lý CV soi mi trực tiếp.',
      createdAt: '2026-08-06 08:45',
    },
  ],
  'cs-warranty:Stage2': [
    {
      id: 'c3',
      author: 'Quản lý CV Store',
      role: 'Technical Lead',
      category: 'technical',
      content:
        'Soi mi trực tiếp dưới đèn tại tiệm. Nhập kết quả soi mi vào Sub-task (ví dụ: Chân mi bết keo ca cũ) trước khi phân công CV Senior làm mới.',
      createdAt: '2026-08-06 09:00',
    },
  ],
  'cs-warranty:MidnightCron': [
    {
      id: 'c4',
      author: 'Tech Admin',
      role: 'System Architect',
      category: 'technical',
      content:
        'Cronjob OrderRegenerationService.php chạy tự động lúc 02:00 AM, 02:10 AM, 02:20 AM ICT quét 3 ngày lùi để làm sạch và thu hồi thưởng CV/CC cũ.',
      createdAt: '2026-08-06 09:15',
    },
  ],
};
