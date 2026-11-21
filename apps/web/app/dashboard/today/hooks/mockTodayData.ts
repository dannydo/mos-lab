import { BranchDetail, BookingData, ComingClientData } from './useTodayData';
import { StaffTrainingOverride, SimulatedComboSale, SimulatedProductSale } from '../context/SandboxModeContext';

export function getTrainingMockBranchesData(
  staffOverrides: Record<string, StaffTrainingOverride> = {}
): Record<string, BranchDetail> {
  const baseDethamCv = [
    {
      id: 101,
      name: 'CV Lan Anh',
      branchName: 'Đề Thám',
      doing: 'Đang làm mi Classic 60p (Bấm giờ: 35p)',
      clients: 3,
      bookedCount: 4,
      doneCount: 2,
      shift: 'sáng' as const,
      attendance: 'checked_in' as const,
      status: 'busy' as const,
    },
    {
      id: 102,
      name: 'CV Mai Phương',
      branchName: 'Đề Thám',
      doing: 'Sẵn sàng nhận khách tiếp theo',
      clients: 2,
      bookedCount: 3,
      doneCount: 2,
      shift: 'full' as const,
      attendance: 'checked_in' as const,
      status: 'available' as const,
    },
    {
      id: 103,
      name: 'CV Thu Thảo',
      branchName: 'Đề Thám',
      doing: 'Chưa check-in (Ca chiều 13:00)',
      clients: 0,
      bookedCount: 2,
      doneCount: 0,
      shift: 'chiều' as const,
      attendance: 'none' as const,
      status: 'available' as const,
    },
    {
      id: 104,
      name: 'CV Ngọc Trâm',
      branchName: 'Đề Thám',
      doing: 'Đã hoàn tất ca & check-out',
      clients: 3,
      bookedCount: 3,
      doneCount: 3,
      shift: 'sáng' as const,
      attendance: 'checked_out' as const,
      status: 'available' as const,
    },
  ];

  const baseDethamCc = [
    {
      name: 'CC Thảo My',
      doing: 'Đang tiếp đón khách tư vấn dáng mi',
      clients: 4,
      combos: 2,
      revenue: 3_750_000,
      revLe: 1_250_000,
      revCombo: 2_500_000,
      revProduct: 0,
      shift: 'full' as const,
      attendance: 'checked_in' as const,
    },
    {
      name: 'CC Diệu Nhi',
      doing: 'Chưa check-in ca chiều',
      clients: 0,
      combos: 0,
      revenue: 0,
      revLe: 0,
      revCombo: 0,
      revProduct: 0,
      shift: 'chiều' as const,
      attendance: 'none' as const,
    },
  ];

  const applyCvOverride = (cvItem: (typeof baseDethamCv)[0]) => {
    const ov = staffOverrides[cvItem.name];
    if (!ov) return cvItem;
    return {
      ...cvItem,
      attendance: ov.attendance ?? cvItem.attendance,
      status: ov.status ?? cvItem.status,
      doing: ov.doing ?? cvItem.doing,
      shift: ov.shift ?? cvItem.shift,
      clients: cvItem.clients + (ov.clientsIncrement || 0),
      doneCount: (cvItem.doneCount || 0) + (ov.doneIncrement || 0),
    };
  };

  const applyCcOverride = (ccItem: (typeof baseDethamCc)[0]) => {
    const ov = staffOverrides[ccItem.name];
    if (!ov) return ccItem;
    return {
      ...ccItem,
      attendance: ov.attendance ?? ccItem.attendance,
      doing: ov.doing ?? ccItem.doing,
      shift: ov.shift ?? ccItem.shift,
    };
  };

  return {
    detham: {
      revLe: 1_250_000,
      revCombo: 2_500_000,
      revProduct: 350_000,
      netLe: 1_157_407,
      netCombo: 2_314_815,
      netProduct: 324_074,
      cc: baseDethamCc.map(applyCcOverride),
      cv: baseDethamCv.map(applyCvOverride),
      coming: [
        {
          key: 'train-c1',
          customerId: 901,
          time: '14:00',
          customer: 'Chị Hoàng Yến (Training)',
          phone: '0901234567',
          group: 'single',
          promo: null,
          booker: 'Telesales',
          category: 'single',
          branchKey: 'detham',
          cc: 'CC Thảo My',
          cv: 'CV Mai Phương',
          service: 'Nối Mi Classic Thiết Kế (60p)',
          status: 'arrived',
          price: 450000,
        },
        {
          key: 'train-c2',
          customerId: 902,
          time: '14:30',
          customer: 'Chị Bích Ngọc (Training)',
          phone: '0912345678',
          group: 'combo_live',
          promo: null,
          booker: 'Telesales',
          category: 'combo',
          branchKey: 'detham',
          cc: 'CC Thảo My',
          cv: 'CV Lan Anh',
          service: 'Dặm Mi Volume 5D',
          status: 'serving',
          price: 0,
        },
        {
          key: 'train-c3',
          customerId: 903,
          time: '15:15',
          customer: 'Chị Phương Uyên (Training)',
          phone: '0933889900',
          group: 'single',
          promo: 'FIRST10',
          booker: 'Control CS',
          category: 'single',
          branchKey: 'detham',
          cc: 'CC Thảo My',
          cv: 'CV Thu Thảo',
          service: 'Nối Mi Thiết Kế Katun',
          status: 'confirmed',
          price: 550000,
        },
      ],
    },
    estella: {
      revLe: 850_000,
      revCombo: 2_000_000,
      revProduct: 180_000,
      netLe: 787_037,
      netCombo: 1_851_852,
      netProduct: 166_667,
      cc: [
        {
          name: 'CC Kim Ngân',
          doing: 'Đang check-in khách hẹn',
          clients: 2,
          combos: 1,
          revenue: 2_850_000,
          revLe: 850_000,
          revCombo: 2_000_000,
          revProduct: 0,
          shift: 'full' as const,
          attendance: 'checked_in' as const,
        },
      ].map(applyCcOverride),
      cv: [
        {
          id: 201,
          name: 'CV Quỳnh Như',
          branchName: 'Estella Place',
          doing: 'Đang làm mi Babydoll (Bấm giờ: 20p)',
          clients: 2,
          bookedCount: 3,
          doneCount: 1,
          shift: 'sáng' as const,
          attendance: 'checked_in' as const,
          status: 'busy' as const,
        },
        {
          id: 202,
          name: 'CV Bảo Trân',
          branchName: 'Estella Place',
          doing: 'Chưa check-in ca chiều',
          clients: 0,
          bookedCount: 2,
          doneCount: 0,
          shift: 'chiều' as const,
          attendance: 'none' as const,
          status: 'available' as const,
        },
      ].map(applyCvOverride),
      coming: [
        {
          key: 'train-c4',
          customerId: 904,
          time: '15:00',
          customer: 'Chị Thanh Hà (Training)',
          phone: '0933445566',
          group: 'combo_live',
          promo: null,
          booker: 'Telesales',
          category: 'combo',
          branchKey: 'estella',
          cc: 'CC Kim Ngân',
          cv: 'CV Quỳnh Như',
          service: 'Nối Mi Thiết Kế Baby Doll',
          status: 'serving',
          price: 0,
        },
      ],
    },
    pxl: { revLe: 0, revCombo: 0, revProduct: 0, cc: [], cv: [], coming: [] },
  };
}

export function getTrainingMockBookings(): {
  combo: BookingData[];
  oc: BookingData[];
  other: BookingData[];
} {
  return {
    combo: [
      {
        key: 'train-b1',
        customerId: 902,
        customer: 'Chị Bích Ngọc (Training)',
        phone: '0912345678',
        group: 'combo_live',
        promo: null,
        booker: 'Telesales',
        category: 'combo',
        branchName: 'Đề Thám',
        createdTime: '13:45',
        bookingDateTime: '14:30',
        requestedCv: 'CV Lan Anh',
        status: 'serving',
      },
      {
        key: 'train-b2',
        customerId: 904,
        customer: 'Chị Thanh Hà (Training)',
        phone: '0933445566',
        group: 'combo_live',
        promo: null,
        booker: 'Telesales',
        category: 'combo',
        branchName: 'Estella Place',
        createdTime: '14:10',
        bookingDateTime: '15:00',
        requestedCv: 'CV Quỳnh Như',
        status: 'serving',
      },
    ],
    oc: [
      {
        key: 'train-b3',
        customerId: 905,
        customer: 'Chị Mỹ Linh (Training)',
        phone: '0988776655',
        group: 'combo_live',
        promo: null,
        booker: 'Control CS',
        category: 'oc',
        branchName: 'Đề Thám',
        createdTime: '12:30',
        bookingDateTime: '16:00',
        requestedCv: 'CV Mai Phương',
        status: 'confirmed',
      },
    ],
    other: [
      {
        key: 'train-b4',
        customerId: 901,
        customer: 'Chị Hoàng Yến (Training)',
        phone: '0901234567',
        group: 'single',
        promo: null,
        booker: 'Telesales',
        category: 'other',
        branchName: 'Đề Thám',
        createdTime: '13:00',
        bookingDateTime: '14:00',
        requestedCv: 'CV Mai Phương',
        status: 'arrived',
      },
      {
        key: 'train-b5',
        customerId: 903,
        customer: 'Chị Phương Uyên (Training)',
        phone: '0933889900',
        group: 'single',
        promo: 'FIRST10',
        booker: 'Control CS',
        category: 'other',
        branchName: 'Đề Thám',
        createdTime: '13:15',
        bookingDateTime: '15:15',
        requestedCv: 'CV Thu Thảo',
        status: 'confirmed',
      },
    ],
  };
}

export function getSalesMockBranchesData(
  simulatedCombos: SimulatedComboSale[] = [],
  simulatedProducts: SimulatedProductSale[] = []
): Record<string, BranchDetail> {
  const extraComboRev = simulatedCombos.reduce((sum, c) => sum + c.price, 0);
  const extraProductRev = simulatedProducts.reduce((sum, p) => sum + p.price, 0);

  const baseDethamLe = 2_800_000;
  const baseDethamCombo = 5_000_000 + extraComboRev;
  const baseDethamProduct = 700_000 + extraProductRev;

  return {
    detham: {
      revLe: baseDethamLe,
      revCombo: baseDethamCombo,
      revProduct: baseDethamProduct,
      netLe: Math.round(baseDethamLe / 1.08),
      netCombo: Math.round(baseDethamCombo / 1.08),
      netProduct: Math.round(baseDethamProduct / 1.08),
      cc: [
        {
          name: 'CC Thảo My',
          doing: 'Đang tư vấn chốt Combo 10 tặng 6',
          clients: 6,
          combos: 3 + simulatedCombos.length,
          revenue: baseDethamCombo + baseDethamLe,
          revLe: baseDethamLe,
          revCombo: baseDethamCombo,
          revProduct: baseDethamProduct,
          shift: 'full' as const,
          attendance: 'checked_in' as const,
        },
      ],
      cv: [
        {
          id: 101,
          name: 'CV Lan Anh',
          branchName: 'Đề Thám',
          doing: 'Đang thực hiện mi Combo VIP',
          clients: 4,
          bookedCount: 5,
          doneCount: 3,
          shift: 'sáng' as const,
          attendance: 'checked_in' as const,
          status: 'busy' as const,
        },
        {
          id: 102,
          name: 'CV Mai Phương',
          branchName: 'Đề Thám',
          doing: 'Tư vấn thêm dưỡng mi phục hồi',
          clients: 3,
          bookedCount: 4,
          doneCount: 2,
          shift: 'full' as const,
          attendance: 'checked_in' as const,
          status: 'busy' as const,
        },
      ],
      coming: [
        {
          key: 'sale-c1',
          customerId: 801,
          time: '14:15',
          customer: 'Chị Minh Anh (VIP Combo)',
          phone: '0988112233',
          group: 'combo_live',
          promo: 'COMBO10+6',
          booker: 'Telesales',
          category: 'combo',
          branchKey: 'detham',
          cc: 'CC Thảo My',
          cv: 'CV Lan Anh',
          service: 'Combo 10 Tặng 6 (Mi VIP)',
          status: 'completed',
          price: 2500000,
        },
      ],
    },
    estella: {
      revLe: 1_200_000,
      revCombo: 2_500_000,
      revProduct: 350_000,
      netLe: 1_111_111,
      netCombo: 2_314_815,
      netProduct: 324_074,
      cc: [
        {
          name: 'CC Kim Ngân',
          doing: 'Tư vấn khách hàng mới',
          clients: 3,
          combos: 1,
          revenue: 3_700_000,
          revLe: 1_200_000,
          revCombo: 2_500_000,
          revProduct: 0,
          shift: 'full' as const,
          attendance: 'checked_in' as const,
        },
      ],
      cv: [
        {
          id: 201,
          name: 'CV Quỳnh Như',
          branchName: 'Estella Place',
          doing: 'Phục vụ khách quen',
          clients: 3,
          bookedCount: 3,
          doneCount: 2,
          shift: 'sáng' as const,
          attendance: 'checked_in' as const,
          status: 'available' as const,
        },
      ],
      coming: [],
    },
    pxl: { revLe: 0, revCombo: 0, revProduct: 0, cc: [], cv: [], coming: [] },
  };
}

export function getSalesMockBookings(
  simulatedCombos: SimulatedComboSale[] = [],
  simulatedProducts: SimulatedProductSale[] = []
): {
  combo: BookingData[];
  oc: BookingData[];
  other: BookingData[];
} {
  const customCombos: BookingData[] = simulatedCombos.map((item, idx) => ({
    key: `sale-sim-${item.id}-${idx}`,
    customerId: 800 + idx,
    customer: `${item.customerName} [Mô Phỏng]`,
    phone: '0988112233',
    group: 'combo_live',
    promo: 'COMBO_PROMO',
    booker: 'Telesales',
    category: 'combo',
    branchName: 'Đề Thám',
    createdTime: item.time,
    bookingDateTime: item.time,
    requestedCv: item.cvName,
    bookingNote: `Đã chốt ${item.name} (${item.price.toLocaleString('vi-VN')} đ)`,
    status: 'completed',
  }));

  const customProducts: BookingData[] = simulatedProducts.map((p, idx) => ({
    key: `sale-prod-${p.id}-${idx}`,
    customerId: 850 + idx,
    customer: `${p.customerName} [Sản Phẩm]`,
    phone: '0977223344',
    group: 'single',
    promo: null,
    booker: 'Telesales',
    category: 'other',
    branchName: 'Đề Thám',
    createdTime: p.time,
    bookingDateTime: p.time,
    bookingNote: `Mua thêm: ${p.name} (${p.price.toLocaleString('vi-VN')} đ)`,
    status: 'completed',
  }));

  return {
    combo: [
      {
        key: 'sale-b1',
        customerId: 801,
        customer: 'Chị Minh Anh (VIP Combo)',
        phone: '0988112233',
        group: 'combo_live',
        promo: 'COMBO10+6',
        booker: 'Telesales',
        category: 'combo',
        branchName: 'Đề Thám',
        createdTime: '13:30',
        bookingDateTime: '14:15',
        requestedCv: 'CV Lan Anh',
        bookingNote: 'Chốt Combo 10 tặng 6 Mi Thiết Kế VIP (2.500.000 đ)',
        status: 'completed',
      },
      ...customCombos,
    ],
    oc: [],
    other: [
      {
        key: 'sale-b2',
        customerId: 802,
        customer: 'Chị Thu Trang (Khách Lẻ)',
        phone: '0966554433',
        group: 'single',
        promo: null,
        booker: 'Telesales',
        category: 'other',
        branchName: 'Đề Thám',
        createdTime: '14:00',
        bookingDateTime: '14:45',
        requestedCv: 'CV Mai Phương',
        status: 'serving',
      },
      ...customProducts,
    ],
  };
}
