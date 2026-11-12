import { LashHistoryItem } from '../../../state/mockData';

export function getStaffInitials(name?: string): string {
  const cleaned = String(name || '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^\p{L}\s]/gu, '')
    .trim();
  if (!cleaned) return 'WL';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[parts.length - 2][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export function getFallbackLashHistory(assignedStaff: string): LashHistoryItem[] {
  return [
    {
      orderId: 338846,
      date: '19/10/2026',
      serviceName: 'New Flawless Mink 880',
      staffName: assignedStaff,
      rating: 5.0,
      review: 'Khách khen nối rất êm, mi giữ form bền đẹp.',
      bookingNote: '19/10 c book Thảo Ly',
      photos: [
        {
          type: 'before' as const,
          label: '1. Before · Mắt mộc',
          url: 'https://cdn.wingslashes.com/uploads/order/service-progress/645/original/1401645.jpg',
        },
        {
          type: 'cleaned' as const,
          label: '2. Vệ sinh · Nhắm mắt',
          url: 'https://cdn.wingslashes.com/uploads/order/service-progress/646/original/1401646.jpg',
        },
        {
          type: 'after' as const,
          label: '3. After · Hoàn thiện',
          url: 'https://cdn.wingslashes.com/uploads/order/service-progress/685/original/1401685.jpg',
        },
      ],
      staffMembers: {
        bookedBy: {
          name: 'Tâm Nguyễn',
          role: 'Booker',
          avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/408/thumbnail/50408.png',
        },
        checkInBy: {
          name: assignedStaff,
          role: 'CVL',
          tier: 'CVL',
          avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png',
        },
        lashedBy: {
          name: assignedStaff,
          role: 'CVL',
          tier: 'CVL',
          avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png',
        },
        checkOutBy: {
          name: assignedStaff,
          role: 'CVL',
          tier: 'CVL',
          avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png',
        },
      },
      attributes: {
        style: 'Natural',
        curl: 'C',
        length: '10-12 mm',
        thickness: '0.10 mm',
        fanCount: '70 sợi',
        material: 'Mink Silk',
        eyeShape: 'Mí lót / Sụp mí',
        notes: 'Mi khách cong nhẹ tự nhiên, chân mi cách bờ 1mm chuẩn kỹ thuật.',
      },
    },
    {
      orderId: 338845,
      date: '02/10/2026',
      serviceName: 'Dặm New Flawless',
      staffName: assignedStaff,
      rating: 5.0,
      review: 'Dáng tự nhiên hài hòa khuôn mặt.',
      bookingNote: 'Khách quen Thảo Ly',
      photos: [
        {
          type: 'before' as const,
          label: '1. Before · Mắt mộc',
          url: 'https://cdn.wingslashes.com/uploads/order/service-progress/683/original/1401683.jpg',
        },
        {
          type: 'cleaned' as const,
          label: '2. Vệ sinh · Nhắm mắt',
          url: 'https://cdn.wingslashes.com/uploads/order/service-progress/695/original/1401695.jpg',
        },
        {
          type: 'after' as const,
          label: '3. After · Hoàn thiện',
          url: 'https://cdn.wingslashes.com/uploads/order/service-progress/732/original/1401732.jpg',
        },
      ],
      staffMembers: {
        bookedBy: {
          name: 'Tâm Nguyễn',
          role: 'Booker',
          avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/408/thumbnail/50408.png',
        },
        checkInBy: {
          name: assignedStaff,
          role: 'CVL',
          tier: 'CVL',
          avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png',
        },
        lashedBy: {
          name: assignedStaff,
          role: 'CVL',
          tier: 'CVL',
          avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/889/thumbnail/47889.png',
        },
        checkOutBy: {
          name: 'Diễm Hương',
          role: 'CC',
          tier: 'CC',
          avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/407/thumbnail/39407.png',
        },
      },
      attributes: {
        style: 'Natural',
        curl: 'C',
        length: '10-12 mm',
        thickness: '0.10 mm',
        fanCount: '70 sợi',
        material: 'Mink Silk',
        eyeShape: 'Mí lót / Sụp mí',
        notes: 'Dặm lại những sợi rụng, giữ nguyên form cũ.',
      },
    },
  ];
}
