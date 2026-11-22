import type {
  WingsGardenIslandState,
  WingsGardenOverlayItem,
  WingsGardenWallet,
  WingsGardenWarehouseId,
} from '@mos-lab/shared';
import { createEmptyDailyProgress } from '../wings-garden-rules.service.js';

export function getTodayDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function getTimeLabel(): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function createDefaultWallet(staffId: number, staffName: string): WingsGardenWallet {
  const today = getTodayDateString();
  return {
    staffId,
    staffName,
    feathers: 34,
    cashSpentVnd: 0,
    cashOrdersCount: 0,
    wingTier: 1,
    streakDays: 7,
    servicesDoneToday: 0,
    chests: { bronze: 1, silver: 1, gold: 1 },
    chestOpenedCount: { bronze: 0, silver: 0, gold: 0 },
    perkCards: [],
    dailyProgress: createEmptyDailyProgress(today),
    pendingClaims: [],
    processedEventKeys: [],
    updatedAt: new Date().toISOString(),
  };
}

export function createDefaultIslandState(
  warehouseId: WingsGardenWarehouseId,
  actorName: string
): WingsGardenIslandState {
  const now = Date.now();
  const daysAgoIso = (days: number) => new Date(now - days * 86400000).toISOString();
  const shortName = warehouseId === 41 ? 'Estella' : 'Đề Thám';
  const defaultOwner = warehouseId === 41 ? 'Diễm Hương (CVLL)' : actorName;

  const starterItems: WingsGardenOverlayItem[] =
    warehouseId === 3
      ? [
          {
            uid: 'wg-init-1',
            scanCode: '#4421750',
            legacyWarehouseItemId: 78730,
            legacyItemId: 714,
            skuId: 'keo-den',
            name: 'Keo Đen (Wings SH)',
            category: 'GLUE',
            ownerStaffId: 1,
            ownerName: defaultOwner,
            warehouseId: 3,
            state: 'USING',
            payMethod: 'FEATHER',
            payLabel: 'Đổi 28 Lông',
            listedPriceVnd: 95000,
            costFeathers: 28,
            cashbackFeathers: 4,
            isShared: false,
            remainingPct: 35,
            openedAt: daysAgoIso(16),
            daysOffset: 0,
            freshLimitDays: 21,
            timeline: [
              { time: '07/09 · 17:36', actor: 'Wings-HQ', detail: 'Chuyển kho Đề Thám (NEW)' },
              { time: '16 ngày trước', actor: defaultOwner, detail: 'Đổi 28 Lông & quét NEW → USING' },
            ],
          },
          {
            uid: 'wg-init-2',
            scanCode: '#4431435',
            legacyItemId: 745,
            skuId: 'bot-rua-mi',
            name: 'Bọt Rửa Mi',
            category: 'HYGIENE',
            ownerStaffId: 1,
            ownerName: defaultOwner,
            warehouseId: 3,
            state: 'USING',
            payMethod: 'CASH',
            payLabel: 'Mua 21.000đ',
            listedPriceVnd: 21000,
            costFeathers: 7,
            cashbackFeathers: 1,
            isShared: false,
            remainingPct: 0,
            openedAt: daysAgoIso(19),
            daysOffset: 0,
            freshLimitDays: 60,
            timeline: [{ time: '19 ngày trước', actor: defaultOwner, detail: 'Mua giá niêm yết 21.000đ & quét USING' }],
          },
          {
            uid: 'wg-init-3',
            scanCode: '#4431292',
            legacyItemId: 741,
            skuId: 'sap-thao-mi',
            name: 'Sáp Tháo Mi',
            category: 'SOLUTION',
            ownerStaffId: 1,
            ownerName: defaultOwner,
            warehouseId: 3,
            state: 'USING',
            payMethod: 'FEATHER',
            payLabel: 'Đổi 10 Lông',
            listedPriceVnd: 30000,
            costFeathers: 10,
            cashbackFeathers: 2,
            isShared: false,
            remainingPct: 68,
            openedAt: daysAgoIso(11),
            daysOffset: 0,
            freshLimitDays: 90,
            timeline: [{ time: '11 ngày trước', actor: defaultOwner, detail: 'Đổi 10 Lông & quét USING' }],
          },
          {
            uid: 'wg-init-4',
            scanCode: '#4398979',
            skuId: 'khay-mi-lua',
            name: 'Khay Mi Lụa 0.07 / 0.10',
            category: 'LASH',
            ownerStaffId: 0,
            ownerName: 'Đồ Chung Sảnh Đề Thám',
            warehouseId: 3,
            state: 'USING',
            payMethod: 'FEATHER',
            payLabel: 'Đổi 14 Lông',
            listedPriceVnd: 45000,
            costFeathers: 14,
            cashbackFeathers: 2,
            isShared: true,
            remainingPct: 45,
            openedAt: daysAgoIso(9),
            daysOffset: 0,
            freshLimitDays: null,
            timeline: [{ time: '9 ngày trước', actor: 'Thảo Ly (FM)', detail: 'Mở Khay Chung Sảnh (NEW → USING)' }],
          },
        ]
      : [
          {
            uid: 'wg-ep-1',
            scanCode: '#4402334',
            legacyItemId: 293,
            skuId: 'keo-xanh',
            name: 'Keo Xanh (Sky Zone)',
            category: 'GLUE',
            ownerStaffId: 1,
            ownerName: defaultOwner,
            warehouseId: 41,
            state: 'USING',
            payMethod: 'CASH',
            payLabel: 'Mua 96.000đ',
            listedPriceVnd: 96000,
            costFeathers: 28,
            cashbackFeathers: 4,
            isShared: false,
            remainingPct: 58,
            openedAt: daysAgoIso(10),
            daysOffset: 0,
            freshLimitDays: 21,
            timeline: [{ time: '10 ngày trước', actor: defaultOwner, detail: 'Mua 96.000đ & quét USING tại Estella' }],
          },
          {
            uid: 'wg-ep-2',
            scanCode: '#4460096',
            legacyItemId: 284,
            skuId: 'eyepatch-gel',
            name: 'Eyepatch Gel',
            category: 'EYEPAD',
            ownerStaffId: 1,
            ownerName: defaultOwner,
            warehouseId: 41,
            state: 'USING',
            payMethod: 'FEATHER',
            payLabel: 'Đổi 8 Lông',
            listedPriceVnd: 26000,
            costFeathers: 8,
            cashbackFeathers: 1,
            isShared: false,
            remainingPct: 0,
            openedAt: daysAgoIso(14),
            daysOffset: 0,
            freshLimitDays: null,
            timeline: [{ time: '14 ngày trước', actor: defaultOwner, detail: 'Quét USING tại Estella' }],
          },
        ];

  const today = getTodayDateString();
  const timeStr = getTimeLabel();
  const dueIso = new Date(now + 4 * 60000).toISOString();

  return {
    warehouseId,
    lightHp: warehouseId === 3 ? 88 : 82,
    harvestedToday: warehouseId === 3 ? 19 : 14,
    comboCount: 0,
    emergencyOffDate: today,
    emergencyOffCountToday: 0,
    items: starterItems,
    usedHistory: [
      {
        uid: `wg-used-seed-${warehouseId}`,
        scanCode: warehouseId === 3 ? '#4461178' : '#4433045',
        skuId: warehouseId === 3 ? 'keo-den' : 'bao-rac',
        name: warehouseId === 3 ? 'Keo Đen (Wings SH)' : 'Bao Rác',
        actorName: defaultOwner,
        warehouseId,
        payMethod: 'FEATHER',
        payLabel: warehouseId === 3 ? 'Đổi 28 Lông' : 'Đổi 8 Lông',
        usedAt: `Hôm nay · ${timeStr}`,
        originSummary: `Royal Beauty → Wings-HQ → ${shortName} → USED`,
      },
    ],
    airshipOrders: [
      {
        id: `air-${warehouseId}-1`,
        requesterName: warehouseId === 3 ? 'Phương Nhi (CV)' : 'Minh Thư (CV)',
        skuId: 'bong-tam-nho',
        itemName: 'Bông Tăm Nhỏ (Micro Brush)',
        warehouseId,
        createdAt: new Date(now).toISOString(),
        dueAt: dueIso,
      },
    ],
    darkClouds: [
      {
        id: `cld-${warehouseId}-1`,
        warehouseId,
        text:
          warehouseId === 3
            ? '1 vỏ Bọt Rửa Mi (#4431435) đang chín vàng chờ quét USED'
            : '1 hộp Eyepatch Gel (#4460096) chờ quét thu hoạch vỏ USED',
        kind: 'RIPE_SHELL',
        createdAt: new Date(now).toISOString(),
      },
    ],
    ledger: [
      {
        id: `ldg-${warehouseId}-1`,
        time: timeStr,
        type: 'INIT',
        message: `Khởi tạo Thiên Đường Nối Lông · Đảo ${shortName} (Overlay Read-Only Legacy + Write mos_lab)`,
      },
    ],
    updatedAt: new Date(now).toISOString(),
  };
}
