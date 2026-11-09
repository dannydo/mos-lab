/**
 * Ma Trận Ràng Buộc Kỹ Thuật 3 Bước Chuẩn Wings Lashes
 * Quy trình tư vấn bắt buộc:
 *   Bước 1: Chọn Chất Liệu / Dòng Mi (Material Family)
 *   Bước 2: Chọn Thiết Kế (Design) trên hạn chế của Chất Liệu
 *   Bước 3: Chọn Độ Cong (Curl), Độ Dày (Thickness), Chiều Dài (Length) & Kỹ Thuật Fan (Volume)
 *           theo đúng giới hạn của Chất Liệu đã chọn.
 *
 * Hỗ trợ chỉnh sửa trực tiếp (Live Configurator):
 *   Chất liệu -> Thiết kế cho phép -> Độ dày -> Chiều dài -> Độ cong.
 */

export interface LashDesignOption {
  id: string;
  name: string;
  shortName: string;
  desc: string;
  eyeEffect: string;
  image: string;
}

export const ALL_LASH_DESIGNS: LashDesignOption[] = [
  {
    id: 'Natural',
    name: 'Natural (Tự nhiên)',
    shortName: 'Natural',
    desc: 'Ôm đều theo dáng mắt thật, hài hòa thanh lịch',
    eyeEffect: 'Tự nhiên như mi thật mọc dài',
    image: '/lashes/designs/lash-design-natural.jpg',
  },
  {
    id: 'Doll',
    name: 'Doll (Búp bê tròn mắt)',
    shortName: 'Doll',
    desc: 'Điểm nhấn sợi dài ở chính giữa con ngươi',
    eyeEffect: 'Mở to tròn mắt long lanh',
    image: '/lashes/designs/lash-design-doll.jpg',
  },
  {
    id: 'Wing',
    name: 'Wing (Đuôi dài thanh thoát)',
    shortName: 'Wing',
    desc: 'Tăng dần chiều dài về phía đuôi mắt',
    eyeEffect: 'Kéo dài đuôi mắt sắc sảo, thanh thoát',
    image: '/lashes/designs/lash-design-wing.jpg',
  },
  {
    id: 'Kim - K',
    name: 'Kim K',
    shortName: 'Kim K',
    desc: 'Đan xen các trụ sợi dài ngắn tạo hiệu ứng tia',
    eyeEffect: 'Bắt sáng nổi bật, cá tính thời thượng',
    image: '/lashes/designs/lash-design-kimk.jpg',
  },
];

export interface LashThicknessOption {
  id: string;
  value: string;
  label: string;
  note: string;
}

export const ALL_LASH_THICKNESSES: LashThicknessOption[] = [
  { id: '0.05 mm', value: '0.05', label: '0.05 mm', note: 'Siêu mảnh / Fan 3D-5D & Ivylight' },
  { id: '0.07 mm', value: '0.07', label: '0.07 mm', note: 'Mảnh nhẹ tự nhiên' },
  { id: '0.10 mm', value: '0.10', label: '0.10 mm', note: 'Tự nhiên rõ nét (Chuẩn)' },
  { id: '0.12 mm', value: '0.12', label: '0.12 mm', note: 'Đậm chân mascara nhẹ' },
  { id: '0.15 mm', value: '0.15', label: '0.15 mm', note: 'Sợi đơn đậm sắc nét' },
];

export interface LashLengthMappingOption {
  id: string;
  label: string;
  desc: string;
  singleMmList: string[];
}

export const ALL_LENGTH_MAPPINGS: LashLengthMappingOption[] = [
  { id: '6-7 mm', label: '6 - 7 mm (Mi dưới tự nhiên)', desc: 'Đầu 6mm · Giữa & Đuôi 7mm', singleMmList: ['6', '7'] },
  { id: '7-8 mm', label: '7 - 8 mm (Mi dưới rõ nét)', desc: 'Đầu 6mm · Giữa 7mm · Đuôi 8mm', singleMmList: ['7', '8'] },
  {
    id: '8-10 mm',
    label: '8 - 10 mm (Tự nhiên ngắn)',
    desc: 'Đầu 8mm · Thân 9mm · Đuôi 10mm',
    singleMmList: ['8', '9', '10'],
  },
  {
    id: '9-11 mm',
    label: '9 - 11 mm (Hài hòa chuẩn)',
    desc: 'Đầu 9mm · Thân 10mm · Đuôi 11mm',
    singleMmList: ['9', '10', '11'],
  },
  {
    id: '10-12 mm',
    label: '10 - 12 mm (Chuẩn Vàng)',
    desc: 'Tỷ lệ phổ biến nhất tại Wings',
    singleMmList: ['10', '11', '12'],
  },
  {
    id: '11-13 mm',
    label: '11 - 13 mm (Dài thanh thoát)',
    desc: 'Đầu 10mm · Thân 11-12mm · Đuôi 13mm',
    singleMmList: ['11', '12', '13'],
  },
  {
    id: '12-14 mm',
    label: '12 - 14 mm (Nổi bật sắc sảo)',
    desc: 'Đầu 10mm · Thân 12mm · Đuôi 14mm',
    singleMmList: ['12', '13', '14'],
  },
  {
    id: '8-10-12 mm',
    label: '8 - 10 - 12 mm (So le chuẩn)',
    desc: 'Phối tầng so le 8mm · 10mm · 12mm',
    singleMmList: ['8', '10', '12'],
  },
  {
    id: '9-11-13 mm',
    label: '9 - 11 - 13 mm (Tia dài)',
    desc: 'Phối tầng so le 9mm · 11mm · 13mm',
    singleMmList: ['9', '11', '13'],
  },
  {
    id: '10-12-14 mm',
    label: '10 - 12 - 14 mm (Ấn tượng)',
    desc: 'Phối tầng so le 10mm · 12mm · 14mm',
    singleMmList: ['10', '12', '14'],
  },
];

export const ALL_SINGLE_LENGTHS: string[] = [
  '6 mm',
  '7 mm',
  '8 mm',
  '9 mm',
  '10 mm',
  '11 mm',
  '12 mm',
  '13 mm',
  '14 mm',
  '15 mm',
];

export const ALL_LASH_CURL_CODES: string[] = ['J', 'B', 'C', 'D', 'LJ', 'LB', 'LC'];

export const ALL_VOLUME_OPTIONS: string[] = [
  '1D',
  '2D',
  '2X',
  '3X',
  '4X',
  '5X',
  '2𝑿',
  '3𝑿',
  '4𝑿',
  '5𝑿',
  '3D',
  '4D',
  '5D',
  '3ℓ',
  '4ℓ',
  '5ℓ',
  '3𝓵',
  '4𝓵',
  '5𝓵',
  'Mi Dưới',
];

export interface WingsMenuItemMeta {
  materialCode: string;
  countNum: number;
  totalFibers: number;
  durationMin: number;
  newPrice: number;
  refillPrice: number;
  badge?: 'BEST SELLER' | 'MOST POPULAR';
}

/**
 * Tra cứu thông số chi tiết chuẩn theo Menu Wings Lashes
 */
export function getWingsMenuDetail(
  materialCodeOrId: string,
  countStr?: string,
  volumeStr?: string
): WingsMenuItemMeta | null {
  const mid = String(materialCodeOrId || '').toLowerCase();
  const cNum = parseInt(String(countStr || '').replace(/\D+/g, ''), 10) || 0;
  const v = String(volumeStr || '').toLowerCase();

  // 1. Classic 1D
  if (mid.includes('classic') || mid === 'new_classic') {
    if (cNum === 60)
      return {
        materialCode: 'NEW_CLASSIC',
        countNum: 60,
        totalFibers: 120,
        durationMin: 45,
        newPrice: 390000,
        refillPrice: 250000,
      };
    if (cNum === 70)
      return {
        materialCode: 'NEW_CLASSIC',
        countNum: 70,
        totalFibers: 140,
        durationMin: 50,
        newPrice: 440000,
        refillPrice: 280000,
        badge: 'MOST POPULAR',
      };
    if (cNum === 90)
      return {
        materialCode: 'NEW_CLASSIC',
        countNum: 90,
        totalFibers: 180,
        durationMin: 65,
        newPrice: 550000,
        refillPrice: 340000,
        badge: 'BEST SELLER',
      };
    if (cNum === 110)
      return {
        materialCode: 'NEW_CLASSIC',
        countNum: 110,
        totalFibers: 220,
        durationMin: 85,
        newPrice: 660000,
        refillPrice: 390000,
      };
    if (cNum === 130)
      return {
        materialCode: 'NEW_CLASSIC',
        countNum: 130,
        totalFibers: 260,
        durationMin: 110,
        newPrice: 880000,
        refillPrice: 530000,
      };
    return {
      materialCode: 'NEW_CLASSIC',
      countNum: 90,
      totalFibers: 180,
      durationMin: 65,
      newPrice: 550000,
      refillPrice: 340000,
      badge: 'BEST SELLER',
    };
  }

  // 2. Volume 2D
  if (mid.includes('volume') || mid === 'new_volume' || mid.includes('2d')) {
    if (cNum === 50)
      return {
        materialCode: 'NEW_VOLUME',
        countNum: 50,
        totalFibers: 200,
        durationMin: 50,
        newPrice: 390000,
        refillPrice: 250000,
      };
    if (cNum === 60)
      return {
        materialCode: 'NEW_VOLUME',
        countNum: 60,
        totalFibers: 240,
        durationMin: 55,
        newPrice: 440000,
        refillPrice: 280000,
        badge: 'MOST POPULAR',
      };
    if (cNum === 80)
      return {
        materialCode: 'NEW_VOLUME',
        countNum: 80,
        totalFibers: 320,
        durationMin: 70,
        newPrice: 550000,
        refillPrice: 340000,
        badge: 'BEST SELLER',
      };
    if (cNum === 100)
      return {
        materialCode: 'NEW_VOLUME',
        countNum: 100,
        totalFibers: 400,
        durationMin: 90,
        newPrice: 660000,
        refillPrice: 390000,
      };
    if (cNum === 120)
      return {
        materialCode: 'NEW_VOLUME',
        countNum: 120,
        totalFibers: 480,
        durationMin: 115,
        newPrice: 880000,
        refillPrice: 530000,
      };
    return {
      materialCode: 'NEW_VOLUME',
      countNum: 80,
      totalFibers: 320,
      durationMin: 70,
      newPrice: 550000,
      refillPrice: 340000,
      badge: 'BEST SELLER',
    };
  }

  // 3. Under Mink
  if (mid.includes('under') || mid.includes('dưới')) {
    return {
      materialCode: 'UNDER_MINK',
      countNum: 70,
      totalFibers: 70,
      durationMin: 30,
      newPrice: 390000,
      refillPrice: 250000,
    };
  }

  // 4. Flawless Mink
  if (mid.includes('mink') || mid.includes('flawless')) {
    if (cNum === 60)
      return {
        materialCode: 'FLAWLESS_MINK',
        countNum: 60,
        totalFibers: 120,
        durationMin: 50,
        newPrice: 770000,
        refillPrice: 470000,
      };
    if (cNum === 70)
      return {
        materialCode: 'FLAWLESS_MINK',
        countNum: 70,
        totalFibers: 140,
        durationMin: 55,
        newPrice: 880000,
        refillPrice: 530000,
        badge: 'MOST POPULAR',
      };
    if (cNum === 90)
      return {
        materialCode: 'FLAWLESS_MINK',
        countNum: 90,
        totalFibers: 180,
        durationMin: 65,
        newPrice: 1110000,
        refillPrice: 680000,
        badge: 'BEST SELLER',
      };
    if (cNum === 110)
      return {
        materialCode: 'FLAWLESS_MINK',
        countNum: 110,
        totalFibers: 220,
        durationMin: 80,
        newPrice: 1440000,
        refillPrice: 860000,
      };
    if (cNum === 130)
      return {
        materialCode: 'FLAWLESS_MINK',
        countNum: 130,
        totalFibers: 260,
        durationMin: 100,
        newPrice: 1770000,
        refillPrice: 1090000,
      };
    return {
      materialCode: 'FLAWLESS_MINK',
      countNum: 90,
      totalFibers: 180,
      durationMin: 65,
      newPrice: 1110000,
      refillPrice: 680000,
      badge: 'BEST SELLER',
    };
  }

  // 5. UltraLight (3D, 4D, 5D)
  if (mid.includes('ultra') && mid.includes('light')) {
    const is5D = v.includes('5d') || v.includes('5x');
    const is3D = v.includes('3d') || v.includes('3x');
    if (cNum === 60) {
      if (is3D)
        return {
          materialCode: 'ULTRALIGHT',
          countNum: 60,
          totalFibers: 360,
          durationMin: 70,
          newPrice: 550000,
          refillPrice: 340000,
        };
      if (is5D)
        return {
          materialCode: 'ULTRALIGHT',
          countNum: 60,
          totalFibers: 600,
          durationMin: 80,
          newPrice: 770000,
          refillPrice: 470000,
          badge: 'MOST POPULAR',
        };
      return {
        materialCode: 'ULTRALIGHT',
        countNum: 60,
        totalFibers: 480,
        durationMin: 75,
        newPrice: 660000,
        refillPrice: 390000,
        badge: 'MOST POPULAR',
      };
    }
    if (cNum === 80) {
      if (is3D)
        return {
          materialCode: 'ULTRALIGHT',
          countNum: 80,
          totalFibers: 480,
          durationMin: 85,
          newPrice: 660000,
          refillPrice: 390000,
          badge: 'BEST SELLER',
        };
      if (is5D)
        return {
          materialCode: 'ULTRALIGHT',
          countNum: 80,
          totalFibers: 800,
          durationMin: 95,
          newPrice: 990000,
          refillPrice: 590000,
          badge: 'BEST SELLER',
        };
      return {
        materialCode: 'ULTRALIGHT',
        countNum: 80,
        totalFibers: 640,
        durationMin: 90,
        newPrice: 770000,
        refillPrice: 470000,
        badge: 'BEST SELLER',
      };
    }
    if (cNum === 100) {
      if (is3D)
        return {
          materialCode: 'ULTRALIGHT',
          countNum: 100,
          totalFibers: 600,
          durationMin: 100,
          newPrice: 770000,
          refillPrice: 470000,
        };
      if (is5D)
        return {
          materialCode: 'ULTRALIGHT',
          countNum: 100,
          totalFibers: 1000,
          durationMin: 115,
          newPrice: 1220000,
          refillPrice: 740000,
        };
      return {
        materialCode: 'ULTRALIGHT',
        countNum: 100,
        totalFibers: 800,
        durationMin: 110,
        newPrice: 880000,
        refillPrice: 530000,
      };
    }
    if (cNum === 120) {
      if (is3D)
        return {
          materialCode: 'ULTRALIGHT',
          countNum: 120,
          totalFibers: 720,
          durationMin: 130,
          newPrice: 990000,
          refillPrice: 590000,
        };
      if (is5D)
        return {
          materialCode: 'ULTRALIGHT',
          countNum: 120,
          totalFibers: 1200,
          durationMin: 150,
          newPrice: 1550000,
          refillPrice: 960000,
        };
      return {
        materialCode: 'ULTRALIGHT',
        countNum: 120,
        totalFibers: 960,
        durationMin: 145,
        newPrice: 1110000,
        refillPrice: 680000,
      };
    }
    return {
      materialCode: 'ULTRALIGHT',
      countNum: 80,
      totalFibers: 640,
      durationMin: 90,
      newPrice: 770000,
      refillPrice: 470000,
      badge: 'BEST SELLER',
    };
  }

  // 6. IvyLight (3ℓ/3𝓵, 4ℓ/4𝓵, 5ℓ/5𝓵)
  if (mid.includes('ivylight')) {
    const is3L = v.includes('3l') || v.includes('3ℓ') || v.includes('3𝓵') || v.includes('3𝓛');
    const is5L = v.includes('5l') || v.includes('5ℓ') || v.includes('5𝓵') || v.includes('5𝓛');
    if (cNum === 70) {
      if (is3L)
        return {
          materialCode: 'IVYLIGHT',
          countNum: 70,
          totalFibers: 420,
          durationMin: 70,
          newPrice: 770000,
          refillPrice: 470000,
        };
      if (is5L)
        return {
          materialCode: 'IVYLIGHT',
          countNum: 70,
          totalFibers: 700,
          durationMin: 85,
          newPrice: 1110000,
          refillPrice: 680000,
          badge: 'MOST POPULAR',
        };
      return {
        materialCode: 'IVYLIGHT',
        countNum: 70,
        totalFibers: 560,
        durationMin: 80,
        newPrice: 990000,
        refillPrice: 590000,
        badge: 'MOST POPULAR',
      };
    }
    if (cNum === 90) {
      if (is3L)
        return {
          materialCode: 'IVYLIGHT',
          countNum: 90,
          totalFibers: 540,
          durationMin: 85,
          newPrice: 880000,
          refillPrice: 530000,
        };
      if (is5L)
        return {
          materialCode: 'IVYLIGHT',
          countNum: 90,
          totalFibers: 900,
          durationMin: 95,
          newPrice: 1440000,
          refillPrice: 860000,
        };
      return {
        materialCode: 'IVYLIGHT',
        countNum: 90,
        totalFibers: 720,
        durationMin: 90,
        newPrice: 1220000,
        refillPrice: 740000,
        badge: 'BEST SELLER',
      };
    }
    if (cNum === 110) {
      if (is3L)
        return {
          materialCode: 'IVYLIGHT',
          countNum: 110,
          totalFibers: 660,
          durationMin: 95,
          newPrice: 990000,
          refillPrice: 590000,
        };
      if (is5L)
        return {
          materialCode: 'IVYLIGHT',
          countNum: 110,
          totalFibers: 1100,
          durationMin: 115,
          newPrice: 1770000,
          refillPrice: 1090000,
        };
      return {
        materialCode: 'IVYLIGHT',
        countNum: 110,
        totalFibers: 880,
        durationMin: 110,
        newPrice: 1440000,
        refillPrice: 860000,
      };
    }
    if (cNum === 130) {
      if (is3L)
        return {
          materialCode: 'IVYLIGHT',
          countNum: 130,
          totalFibers: 780,
          durationMin: 120,
          newPrice: 1330000,
          refillPrice: 810000,
        };
      if (is5L)
        return {
          materialCode: 'IVYLIGHT',
          countNum: 130,
          totalFibers: 1300,
          durationMin: 140,
          newPrice: 2110000,
          refillPrice: 1290000,
        };
      return {
        materialCode: 'IVYLIGHT',
        countNum: 130,
        totalFibers: 1040,
        durationMin: 130,
        newPrice: 1770000,
        refillPrice: 1090000,
      };
    }
    return {
      materialCode: 'IVYLIGHT',
      countNum: 90,
      totalFibers: 720,
      durationMin: 90,
      newPrice: 1220000,
      refillPrice: 740000,
      badge: 'BEST SELLER',
    };
  }

  // 7. HyperLight (2X, 3X, 4X, 5X)
  if (mid.includes('hyperlight') || mid.includes('hyper_light')) {
    const is2X = v.includes('2x') || v.includes('2d');
    const is3X = v.includes('3x') || v.includes('3d');
    const is5X = v.includes('5x') || v.includes('5d');
    if (cNum === 50) {
      if (is2X)
        return {
          materialCode: 'HYPERLIGHT',
          countNum: 50,
          totalFibers: 200,
          durationMin: 40,
          newPrice: 440000,
          refillPrice: 280000,
        };
      if (is3X)
        return {
          materialCode: 'HYPERLIGHT',
          countNum: 50,
          totalFibers: 300,
          durationMin: 40,
          newPrice: 550000,
          refillPrice: 340000,
        };
      if (is5X)
        return {
          materialCode: 'HYPERLIGHT',
          countNum: 50,
          totalFibers: 500,
          durationMin: 45,
          newPrice: 770000,
          refillPrice: 470000,
        };
      return {
        materialCode: 'HYPERLIGHT',
        countNum: 50,
        totalFibers: 400,
        durationMin: 45,
        newPrice: 660000,
        refillPrice: 390000,
      };
    }
    if (cNum === 70) {
      if (is2X)
        return {
          materialCode: 'HYPERLIGHT',
          countNum: 70,
          totalFibers: 280,
          durationMin: 50,
          newPrice: 550000,
          refillPrice: 340000,
          badge: 'MOST POPULAR',
        };
      if (is3X)
        return {
          materialCode: 'HYPERLIGHT',
          countNum: 70,
          totalFibers: 420,
          durationMin: 50,
          newPrice: 660000,
          refillPrice: 390000,
          badge: 'MOST POPULAR',
        };
      if (is5X)
        return {
          materialCode: 'HYPERLIGHT',
          countNum: 70,
          totalFibers: 700,
          durationMin: 55,
          newPrice: 990000,
          refillPrice: 590000,
          badge: 'MOST POPULAR',
        };
      return {
        materialCode: 'HYPERLIGHT',
        countNum: 70,
        totalFibers: 560,
        durationMin: 55,
        newPrice: 770000,
        refillPrice: 470000,
        badge: 'BEST SELLER',
      };
    }
    if (cNum === 90) {
      if (is2X)
        return {
          materialCode: 'HYPERLIGHT',
          countNum: 90,
          totalFibers: 360,
          durationMin: 65,
          newPrice: 660000,
          refillPrice: 390000,
          badge: 'BEST SELLER',
        };
      if (is3X)
        return {
          materialCode: 'HYPERLIGHT',
          countNum: 90,
          totalFibers: 540,
          durationMin: 65,
          newPrice: 770000,
          refillPrice: 470000,
          badge: 'BEST SELLER',
        };
      if (is5X)
        return {
          materialCode: 'HYPERLIGHT',
          countNum: 90,
          totalFibers: 900,
          durationMin: 70,
          newPrice: 1220000,
          refillPrice: 740000,
          badge: 'BEST SELLER',
        };
      return {
        materialCode: 'HYPERLIGHT',
        countNum: 90,
        totalFibers: 720,
        durationMin: 70,
        newPrice: 880000,
        refillPrice: 530000,
        badge: 'MOST POPULAR',
      };
    }
    if (cNum === 110) {
      if (is2X)
        return {
          materialCode: 'HYPERLIGHT',
          countNum: 110,
          totalFibers: 440,
          durationMin: 85,
          newPrice: 770000,
          refillPrice: 470000,
        };
      if (is3X)
        return {
          materialCode: 'HYPERLIGHT',
          countNum: 110,
          totalFibers: 660,
          durationMin: 85,
          newPrice: 880000,
          refillPrice: 530000,
        };
      if (is5X)
        return {
          materialCode: 'HYPERLIGHT',
          countNum: 110,
          totalFibers: 1100,
          durationMin: 90,
          newPrice: 1440000,
          refillPrice: 860000,
        };
      return {
        materialCode: 'HYPERLIGHT',
        countNum: 110,
        totalFibers: 880,
        durationMin: 90,
        newPrice: 990000,
        refillPrice: 590000,
      };
    }
    if (cNum === 130) {
      if (is2X)
        return {
          materialCode: 'HYPERLIGHT',
          countNum: 130,
          totalFibers: 520,
          durationMin: 110,
          newPrice: 1110000,
          refillPrice: 680000,
        };
      if (is3X)
        return {
          materialCode: 'HYPERLIGHT',
          countNum: 130,
          totalFibers: 780,
          durationMin: 110,
          newPrice: 1220000,
          refillPrice: 740000,
        };
      if (is5X)
        return {
          materialCode: 'HYPERLIGHT',
          countNum: 130,
          totalFibers: 1300,
          durationMin: 115,
          newPrice: 1770000,
          refillPrice: 1090000,
        };
      return {
        materialCode: 'HYPERLIGHT',
        countNum: 130,
        totalFibers: 1040,
        durationMin: 115,
        newPrice: 1330000,
        refillPrice: 810000,
      };
    }
    return {
      materialCode: 'HYPERLIGHT',
      countNum: 70,
      totalFibers: 560,
      durationMin: 55,
      newPrice: 770000,
      refillPrice: 470000,
      badge: 'BEST SELLER',
    };
  }

  return null;
}

export interface LashMaterialSpec {
  id: string;
  code: string;
  name: string;
  shortLabel: string;
  badge: string;
  priceRange: string;
  summary: string;
  constraintReason: string;
  // Bước 2: Các Thiết kế được phép và lý do khóa các thiết kế còn lại
  allowedDesigns: string[];
  defaultDesign: string;
  lockedDesignReasons: Record<string, string>;
  // Bước 3: Độ cong, Độ dày, Chiều dài, Volume & Số sợi được phép
  allowedCurls: string[];
  defaultCurl: string;
  lockedCurlReason: string;
  allowedThicknesses: string[];
  defaultThickness: string;
  lockedThicknessReason: string;
  allowedLengthMappings: LashLengthMappingOption[];
  allowedSingleLengths: string[];
  defaultLength: string;
  allowedVolumes: string[];
  defaultVolume: string;
  allowedCounts: string[];
  defaultCount: string;
  allowedColors: Array<{ id: string; label: string; colorCode: string }>;
}

export const STANDARD_COLORS = [
  { id: 'Đen Tuyền (Jet Black)', label: 'Đen Tuyền (Jet Black)', colorCode: '#111827' },
  { id: 'Nâu Tây (Brown Choco)', label: 'Nâu Tây (Choco)', colorCode: '#78350F' },
  { id: 'Xanh Đậm (Dark Blue)', label: 'Xanh Đậm (Dark Blue)', colorCode: '#1E3A8A' },
  { id: 'Tím Than (Purple Accent)', label: 'Tím Than (Purple)', colorCode: '#581C87' },
];

export const DEFAULT_LASH_MATERIAL_CATALOG: LashMaterialSpec[] = [
  {
    id: 'New Flawless Mink',
    code: 'FLAWLESS_MINK',
    name: 'New Flawless Mink (Tơ Lụa Độc Quyền)',
    shortLabel: 'Flawless Mink',
    badge: 'BEST SELLER · 770K+',
    priceRange: '770.000đ – 1.770.000đ',
    summary: 'Sợi tơ lụa Mink cao cấp bóng mượt, đi 1 sợi tỷ lệ vàng nhẹ êm tuyệt đối như mi thật.',
    constraintReason:
      'Flawless Mink chỉ mở 3 thiết kế (Natural, Doll, Wing), chỉ dùng 2 độ cong B & C và độ dày mảnh 0.07mm – 0.10mm.',
    allowedDesigns: ['Natural', 'Doll', 'Wing'],
    defaultDesign: 'Natural',
    lockedDesignReasons: {
      'Kim - K': 'Flawless Mink đi sợi đơn mượt đều, chuyển sang HyperLight nếu khách muốn đánh trụ Kim-K',
    },
    allowedCurls: ['B', 'C'],
    defaultCurl: 'C',
    lockedCurlReason: 'Flawless Mink chỉ sử dụng 2 độ cong chuẩn B (45°) và C (55°)',
    allowedThicknesses: ['0.07 mm', '0.10 mm'],
    defaultThickness: '0.10 mm',
    lockedThicknessReason: 'Chỉ dùng 0.07mm – 0.10mm để bảo toàn độ nhẹ không cộm của dòng Flawless',
    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((m) =>
      ['8-10 mm', '9-11 mm', '10-12 mm', '11-13 mm'].includes(m.id)
    ),
    allowedSingleLengths: ['7 mm', '8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm'],
    defaultLength: '10-12 mm',
    allowedVolumes: ['1D'],
    defaultVolume: '1D',
    allowedCounts: ['60 sợi', '70 sợi', '90 sợi', '110 sợi', '130 sợi'],
    defaultCount: '90 sợi',
    allowedColors: STANDARD_COLORS,
  },
  {
    id: 'UltraLight',
    code: 'ULTRALIGHT',
    name: 'UltraLight (Sợi Lông Vũ Siêu Nhẹ)',
    shortLabel: 'UltraLight',
    badge: 'LÔNG VŨ · 550K+',
    priceRange: '550.000đ – 1.550.000đ',
    summary: 'Sợi mi lông vũ siêu nhẹ xốp mềm, chuyên kỹ thuật Volume 3D–5D nhẹ tênh không cộm mắt.',
    constraintReason:
      'Mở đủ 4 thiết kế (Natural, Doll, Wing, Kim-K), sử dụng 3 độ cong B, C, D và sợi siêu mảnh 0.05mm – 0.07mm.',
    allowedDesigns: ['Natural', 'Doll', 'Wing', 'Kim - K'],
    defaultDesign: 'Doll',
    lockedDesignReasons: {},
    allowedCurls: ['B', 'C', 'D'],
    defaultCurl: 'C',
    lockedCurlReason: 'UltraLight chỉ sử dụng 3 độ cong B (45°), C (55°) và D (70°)',
    allowedThicknesses: ['0.05 mm', '0.07 mm'],
    defaultThickness: '0.07 mm',
    lockedThicknessReason: 'Dòng lông vũ Volume dùng sợi 0.05mm – 0.07mm siêu nhẹ bảo vệ gốc mi thật',
    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((m) =>
      ['9-11 mm', '10-12 mm', '11-13 mm', '12-14 mm'].includes(m.id)
    ),
    allowedSingleLengths: ['8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm', '14 mm'],
    defaultLength: '10-12 mm',
    allowedVolumes: ['3D', '4D', '5D'],
    defaultVolume: '4D',
    allowedCounts: ['60 fan', '80 fan', '100 fan', '120 fan'],
    defaultCount: '80 fan',
    allowedColors: STANDARD_COLORS,
  },
  {
    id: 'HyperLight',
    code: 'HYPERLIGHT',
    name: 'HyperLight (Siêu Nhẹ Kháng Nước)',
    shortLabel: 'HyperLight',
    badge: 'MOST POPULAR · 440K+',
    priceRange: '440.000đ – 1.770.000đ',
    summary: 'Sợi mi siêu mảnh kháng nước, chuyên tạo fan Volume 2X–5X bồng bềnh và sắc sảo.',
    constraintReason:
      'Mở đủ 4 thiết kế (Natural, Doll, Wing, Kim-K), chỉ sử dụng 3 độ cong B, C, D và sợi siêu mảnh 0.05mm – 0.07mm.',
    allowedDesigns: ['Natural', 'Doll', 'Wing', 'Kim - K'],
    defaultDesign: 'Doll',
    lockedDesignReasons: {},
    allowedCurls: ['B', 'C', 'D'],
    defaultCurl: 'C',
    lockedCurlReason: 'HyperLight chỉ sử dụng 3 độ cong B (45°), C (55°) và D (70°)',
    allowedThicknesses: ['0.05 mm', '0.07 mm'],
    defaultThickness: '0.05 mm',
    lockedThicknessReason: 'Fan 2X–5X bắt buộc dùng sợi 0.05mm – 0.07mm siêu mảnh để bảo vệ gốc mi thật',
    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((m) =>
      ['9-11 mm', '10-12 mm', '11-13 mm', '12-14 mm'].includes(m.id)
    ),
    allowedSingleLengths: ['8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm', '14 mm'],
    defaultLength: '10-12 mm',
    allowedVolumes: ['2X', '3X', '4X', '5X'],
    defaultVolume: '4X',
    allowedCounts: ['50 fan', '70 fan', '90 fan', '110 fan', '130 fan'],
    defaultCount: '70 fan',
    allowedColors: STANDARD_COLORS,
  },
  {
    id: 'Ivylight Thiết Kế',
    code: 'IVYLIGHT',
    name: 'Ivylight 3L / 4L / 5L (Cánh Tiên Nâng Mí)',
    shortLabel: 'Ivylight 3L-5L',
    badge: 'NÂNG MÍ · 770K+',
    priceRange: '770.000đ – 2.110.000đ',
    summary: 'Cấu trúc sợi dệt 3L/4L/5L chuyên biệt giúp đẩy mí sụp, tạo hiệu ứng tia cánh tiên thanh thoát.',
    constraintReason:
      'Cấu trúc sợi dệt Ivylight chỉ có duy nhất thiết kế Natural, chỉ dùng bộ 3 độ cong gốc L nâng mí (LJ, LB, LC) và sợi mảnh 0.05mm – 0.07mm.',
    allowedDesigns: ['Natural'],
    defaultDesign: 'Natural',
    lockedDesignReasons: {
      Doll: 'Ivylight 3L-5L chỉ thiết kế duy nhất theo form Natural',
      Wing: 'Ivylight 3L-5L chỉ thiết kế duy nhất theo form Natural',
      'Kim - K': 'Ivylight đã có sẵn cấu trúc tia cánh tiên 3L/4L/5L trên nền Natural',
    },
    allowedCurls: ['LJ', 'LB', 'LC'],
    defaultCurl: 'LB',
    lockedCurlReason: 'Ivylight chỉ sử dụng bộ 3 độ cong chân L nâng mí chuyên biệt: LJ, LB, LC',
    allowedThicknesses: ['0.05 mm', '0.07 mm'],
    defaultThickness: '0.05 mm',
    lockedThicknessReason: 'Sợi dệt đa tầng 3L/4L/5L bắt buộc dùng độ mảnh 0.05mm – 0.07mm',
    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((m) =>
      ['8-10-12 mm', '9-11-13 mm', '10-12-14 mm'].includes(m.id)
    ),
    allowedSingleLengths: ['8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm', '14 mm'],
    defaultLength: '8-10-12 mm',
    allowedVolumes: ['3ℓ', '4ℓ', '5ℓ'],
    defaultVolume: '4ℓ',
    allowedCounts: ['70 nhịp', '90 nhịp', '110 nhịp', '130 nhịp'],
    defaultCount: '90 nhịp',
    allowedColors: [STANDARD_COLORS[0], STANDARD_COLORS[1]],
  },
  {
    id: 'New Volume 2D',
    code: 'NEW_VOLUME',
    name: 'New Volume 2D (Nhung Đen Đan Đôi)',
    shortLabel: 'New Volume 2D',
    badge: '2D TỰ NHIÊN · 390K+',
    priceRange: '390.000đ – 880.000đ',
    summary: 'Sợi Nhung Đen lì đan đôi 2D giúp chân mi đen rõ nét như kẻ eyeliner nhẹ nhàng.',
    constraintReason: 'Dòng New Volume 2D mở 4 thiết kế, sử dụng 4 độ cong J, B, C, D và độ dày 0.07mm – 0.12mm.',
    allowedDesigns: ['Natural', 'Doll', 'Wing', 'Kim - K'],
    defaultDesign: 'Wing',
    lockedDesignReasons: {},
    allowedCurls: ['J', 'B', 'C', 'D'],
    defaultCurl: 'C',
    lockedCurlReason: 'New Volume 2D chỉ sử dụng 4 độ cong J, B, C, D',
    allowedThicknesses: ['0.07 mm', '0.10 mm', '0.12 mm'],
    defaultThickness: '0.10 mm',
    lockedThicknessReason: 'Kỹ thuật 2D dùng sợi 0.07mm – 0.12mm để giữ độ tơi và không quá nặng',
    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((m) =>
      ['8-10 mm', '9-11 mm', '10-12 mm', '11-13 mm'].includes(m.id)
    ),
    allowedSingleLengths: ['8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm'],
    defaultLength: '9-11 mm',
    allowedVolumes: ['2D'],
    defaultVolume: '2D',
    allowedCounts: ['50 fan', '60 fan', '80 fan', '100 fan', '120 fan'],
    defaultCount: '80 fan',
    allowedColors: STANDARD_COLORS,
  },
  {
    id: 'New Classic 1D',
    code: 'NEW_CLASSIC',
    name: 'New Classic 1D (Sợi Đơn Truyền Thống)',
    shortLabel: 'New Classic 1D',
    badge: '1D CỔ ĐIỂN · 390K+',
    priceRange: '390.000đ – 880.000đ',
    summary: 'Nối 1 sợi mi giả trên 1 sợi mi thật, tạo hiệu ứng rõ từng sợi như chuốt mascara.',
    constraintReason:
      'Đi 1 sợi đơn 1D với 3 thiết kế (Natural, Doll, Wing), 4 độ cong (J, B, C, D) và 3 độ dày 0.10mm, 0.12mm, 0.15mm.',
    allowedDesigns: ['Natural', 'Doll', 'Wing'],
    defaultDesign: 'Doll',
    lockedDesignReasons: {
      'Kim - K': 'New Classic nối 1 sợi đơn đều nhau, không chập trụ Katun Kim-K',
    },
    allowedCurls: ['J', 'B', 'C', 'D'],
    defaultCurl: 'C',
    lockedCurlReason: 'New Classic 1D chỉ sử dụng 4 độ cong J, B, C, D',
    allowedThicknesses: ['0.10 mm', '0.12 mm', '0.15 mm'],
    defaultThickness: '0.10 mm',
    lockedThicknessReason: 'Đi 1 sợi đơn (1D) chỉ dùng độ dày 0.10mm, 0.12mm hoặc 0.15mm để lên rõ dáng mi',
    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((m) =>
      ['8-10 mm', '9-11 mm', '10-12 mm', '11-13 mm'].includes(m.id)
    ),
    allowedSingleLengths: ['8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm'],
    defaultLength: '9-11 mm',
    allowedVolumes: ['1D'],
    defaultVolume: '1D',
    allowedCounts: ['60 sợi', '70 sợi', '90 sợi', '110 sợi', '130 sợi'],
    defaultCount: '90 sợi',
    allowedColors: STANDARD_COLORS,
  },
];

/**
 * Quy chuẩn Kỹ thuật Mi Dưới (Under Mink) - Option làm chung với 6 bộ mi chính
 */
export const UNDER_MINK_OPTION_SPEC: LashMaterialSpec = {
  id: 'Mi Dưới (Under Mink)',
  code: 'UNDER_MINK',
  name: 'Mi Dưới (Flawless Under Mink)',
  shortLabel: 'Mi Dưới (Under)',
  badge: 'MI DƯỚI · 390K',
  priceRange: '390.000đ',
  summary: 'Sợi Mink ngắn chuyên biệt cho hàng mi dưới giúp cân đối đôi mắt to tròn hoàn hảo.',
  constraintReason:
    'Mi dưới bắt buộc chỉ dùng thiết kế Natural, chỉ dùng duy nhất độ cong B (45°), độ dày 0.10mm – 0.15mm và chiều dài 6–8mm.',
  allowedDesigns: ['Natural'],
  defaultDesign: 'Natural',
  lockedDesignReasons: {
    Doll: 'Mi dưới chỉ nối trải đều tự nhiên (Natural)',
    Wing: 'Mi dưới không nối kéo dài đuôi Wing để tránh cộm khóe mắt',
    'Kim - K': 'Mi dưới không đánh trụ Kim-K',
  },
  allowedCurls: ['B'],
  defaultCurl: 'B',
  lockedCurlReason: 'Mi dưới chỉ sử dụng duy nhất độ cong B (45°) để không móc vào mi trên khi chớp mắt',
  allowedThicknesses: ['0.10 mm', '0.12 mm', '0.15 mm'],
  defaultThickness: '0.10 mm',
  lockedThicknessReason: 'Mi dưới sử dụng sợi đơn rõ nét 0.10mm, 0.12mm, 0.15mm',
  allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((m) => ['6-7 mm', '7-8 mm'].includes(m.id)),
  allowedSingleLengths: ['6 mm', '7 mm', '8 mm'],
  defaultLength: '6-7 mm',
  allowedVolumes: ['Mi Dưới'],
  defaultVolume: 'Mi Dưới',
  allowedCounts: ['70 sợi'],
  defaultCount: '70 sợi',
  allowedColors: [STANDARD_COLORS[0], STANDARD_COLORS[1]],
};

export const LASH_MATERIAL_CATALOG: LashMaterialSpec[] = DEFAULT_LASH_MATERIAL_CATALOG;

export const MATERIAL_MATRIX_STORAGE_KEY = 'mos_lash_material_constraint_matrix_v8';
export const MATERIAL_MATRIX_UPDATED_EVENT = 'mos-lash-material-catalog-updated';

/**
 * Load material constraint catalog from localStorage (if customized by Danny) or fall back to DEFAULT_LASH_MATERIAL_CATALOG
 */
export function loadMaterialCatalog(): LashMaterialSpec[] {
  if (typeof window === 'undefined') {
    return DEFAULT_LASH_MATERIAL_CATALOG;
  }
  try {
    const raw = window.localStorage.getItem(MATERIAL_MATRIX_STORAGE_KEY);
    if (!raw) return DEFAULT_LASH_MATERIAL_CATALOG;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore parse error
  }
  return DEFAULT_LASH_MATERIAL_CATALOG;
}

/**
 * Save customized material constraint catalog and notify all active screens immediately
 */
export function saveMaterialCatalog(catalog: LashMaterialSpec[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MATERIAL_MATRIX_STORAGE_KEY, JSON.stringify(catalog));
    window.dispatchEvent(new CustomEvent(MATERIAL_MATRIX_UPDATED_EVENT, { detail: catalog }));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Reset material constraint catalog back to Wings canonical defaults
 */
export function resetMaterialCatalogToDefault(): LashMaterialSpec[] {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(MATERIAL_MATRIX_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(MATERIAL_MATRIX_UPDATED_EVENT, { detail: DEFAULT_LASH_MATERIAL_CATALOG }));
    } catch {
      // ignore
    }
  }
  return DEFAULT_LASH_MATERIAL_CATALOG;
}

/**
 * Helper: Resolve material spec from serviceName or material ID against a given catalog
 */
export function resolveMaterialSpec(
  materialOrServiceName?: string,
  catalog: LashMaterialSpec[] = DEFAULT_LASH_MATERIAL_CATALOG
): LashMaterialSpec {
  const list = catalog.length > 0 ? catalog : DEFAULT_LASH_MATERIAL_CATALOG;
  const exact = list.find(
    (m) =>
      m.id.toLowerCase() === (materialOrServiceName || '').trim().toLowerCase() ||
      m.code.toLowerCase() === (materialOrServiceName || '').trim().toLowerCase()
  );
  if (exact) return exact;

  const norm = (materialOrServiceName || '').toLowerCase();
  if (norm.includes('under') || norm.includes('mi dưới')) {
    return list.find((m) => m.code === 'UNDER_MINK') || list[0];
  }
  if (norm.includes('ivylight') || norm.includes('ivy light')) {
    return list.find((m) => m.code === 'IVYLIGHT') || list[0];
  }
  if (norm.includes('ultralight') || norm.includes('ultra_light') || norm.includes('lông vũ')) {
    return list.find((m) => m.code === 'ULTRALIGHT') || list[0];
  }
  if (norm.includes('hyperlight') || norm.includes('hyper_light')) {
    return list.find((m) => m.code === 'HYPERLIGHT') || list[0];
  }
  if (norm.includes('volume') || norm.includes('2d')) {
    return list.find((m) => m.code === 'NEW_VOLUME') || list[0];
  }
  if (norm.includes('classic')) {
    return list.find((m) => m.code === 'NEW_CLASSIC') || list[0];
  }
  return list[0];
}

/**
 * Ensure all selected downstream specs are valid for the given Material.
 * If any downstream parameter is outside the material's allowed list, snap it to the material's default.
 */
export function sanitizeSelectionForMaterial(
  material: LashMaterialSpec,
  current: {
    design: string;
    curl: string;
    thickness: string;
    length: string;
    volume: string;
    count: string;
    color: string;
  }
): {
  design: string;
  curl: string;
  thickness: string;
  length: string;
  volume: string;
  count: string;
  color: string;
  autoAdjustedFields: string[];
} {
  const autoAdjustedFields: string[] = [];

  const design = material.allowedDesigns.includes(current.design)
    ? current.design
    : (() => {
        autoAdjustedFields.push(`Thiết kế → ${material.defaultDesign || material.allowedDesigns[0]}`);
        return material.defaultDesign || material.allowedDesigns[0] || 'Natural';
      })();

  const curl = material.allowedCurls.includes(current.curl)
    ? current.curl
    : (() => {
        const nextCurl = material.defaultCurl || material.allowedCurls[0] || 'C';
        autoAdjustedFields.push(`Độ cong → ${nextCurl}`);
        return nextCurl;
      })();

  const thickness = material.allowedThicknesses.includes(current.thickness)
    ? current.thickness
    : (() => {
        const nextThick = material.defaultThickness || material.allowedThicknesses[0] || '0.10 mm';
        autoAdjustedFields.push(`Độ dày → ${nextThick}`);
        return nextThick;
      })();

  const validLengths = [...material.allowedLengthMappings.map((m) => m.id), ...material.allowedSingleLengths];
  const length = validLengths.includes(current.length)
    ? current.length
    : (() => {
        const nextLen =
          material.defaultLength ||
          material.allowedLengthMappings[0]?.id ||
          material.allowedSingleLengths[0] ||
          '10-12 mm';
        autoAdjustedFields.push(`Chiều dài → ${nextLen}`);
        return nextLen;
      })();

  const volume = material.allowedVolumes.includes(current.volume)
    ? current.volume
    : (() => {
        const nextVol = material.defaultVolume || material.allowedVolumes[0] || '1D (Classic)';
        autoAdjustedFields.push(`Kỹ thuật → ${nextVol}`);
        return nextVol;
      })();

  const count = material.allowedCounts.includes(current.count)
    ? current.count
    : material.defaultCount || material.allowedCounts[0] || '';

  const validColors = material.allowedColors.map((c) => c.id);
  const color = validColors.includes(current.color)
    ? current.color
    : material.allowedColors[0]?.id || STANDARD_COLORS[0].id;

  return {
    design,
    curl,
    thickness,
    length,
    volume,
    count,
    color,
    autoAdjustedFields,
  };
}

// ============================================================================
// MA TRẬN MAPPING GIÁ TIỀN & ĐIỂM THƯỞNG VÒNG XOAY CHUYÊN VIÊN (CV ROTATION)
// Chuẩn Điều răn CV-001, CV-002 & Danh mục Dịch Vụ Wings Lashes
// ============================================================================

export interface LashRotationPointsBreakdown {
  skuName: string;
  skuPrice: number;
  upgradePrice: number;
  originalPrice: number;
  vatRate: number;
  vatAmount: number;
  totalPriceWithVat: number;
  upgradeVat: number;
  upgradePriceWithVat: number;
  // Điểm Vòng Xoay Bộ 1 (Mi Trên) theo đúng 6 cột CV Xoay (Class / Fan / Type / Lash / Design / Color)
  classPts: number;
  lashPts: number;
  designPts: number;
  fanPts: number;
  typePts: number;
  colorPts: number;
  upperSetPoints: number;
  upperSetBreakdownLabel: string;
  // Điểm Vòng Xoay Bộ 2 (Mi Dưới · Độc lập về vòng xoay khi khách nối cả Mi Trên & Mi Dưới)
  serviceSetsCount: 1 | 2;
  underClassPts: number;
  underTypePts: number;
  underLashPts: number;
  underSetPoints: number;
  underSetBreakdownLabel: string;
  // Tổng hợp cả ca làm (1 Bộ hoặc 2 Bộ độc lập)
  totalPoints: number;
  summaryLabel: string;
  breakdownLabel: string;
  isRetain?: boolean;
  serviceType?: string;
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
  isUnderMinkComboDeducted?: boolean;
  underMinkPrice?: number;
  underMinkFibers?: number;
  underMinkDuration?: number;
}

/**
 * Kiểm tra dòng mi luôn bắt buộc thực hiện kỹ thuật Nối Mới 100% (không dặm đè):
 * - Flawless Mink (FLAWLESS_MINK) & Ivylight 3L-5L (IVYLIGHT) luôn tháo ra nối mới toàn bộ.
 * - Tuy nhiên nếu khách quay lại trong chu kỳ <= 25 ngày thì vẫn được tính Giá Dặm (Refill Price).
 */
export function isAlwaysFullSetMaterial(materialIdOrCode?: string): boolean {
  const s = String(materialIdOrCode || '').toLowerCase();
  if (s.includes('under') || s.includes('dưới')) return false;
  return s.includes('mink') || s.includes('flawless') || s.includes('ivy');
}

/**
 * 1. Điểm Class (OrderServiceClass) chuẩn Báo cáo CV Xoay:
 * - Classic 1D: 0 pts
 * - Volume 2D / UltraLight / HyperLight: +3 pts
 * - Flawless Mink / Flawless Under Mink: +5 pts
 * - Ivylight: +20 pts
 */
export function getCvXoayClassPoints(materialIdOrCode?: string): number {
  const spec = resolveMaterialSpec(materialIdOrCode);
  switch (spec.code) {
    case 'IVYLIGHT':
      return 20;
    case 'FLAWLESS_MINK':
    case 'UNDER_MINK':
      return 5;
    case 'NEW_VOLUME':
    case 'ULTRALIGHT':
    case 'HYPERLIGHT':
      return 3;
    case 'NEW_CLASSIC':
    default:
      return 0;
  }
}

/**
 * 2. Điểm Fan (OrderServiceAttributeFan) chuẩn Báo cáo CV Xoay:
 * - 1D / 2D / Under Mink: 0 pts
 * - 2X / 3D / 3X / 3L: +1 pt
 * - 4D / 4X / 4L: +2 pts
 * - 5D / 5X / 5L: +3 pts
 */
export function getCvXoayFanPoints(materialIdOrCode?: string, volumeStr?: string): number {
  const spec = resolveMaterialSpec(materialIdOrCode);
  if (spec.code === 'NEW_CLASSIC' || spec.code === 'UNDER_MINK' || spec.code === 'NEW_VOLUME') {
    return 0;
  }
  const v = String(volumeStr || '')
    .toUpperCase()
    .trim();
  if (v.includes('5')) return 3;
  if (v.includes('4')) return 2;
  if (v.includes('3') || v.includes('2X')) return 1;
  return 0;
}

/**
 * 3. Điểm Số Lượng Sợi/Fan (OrderServiceAttributeLashes) chuẩn Báo cáo CV Xoay:
 * - Under Mink / <= 50 fan/sợi: +17 pts
 * - 60: +20 pts | 70: +23 pts | 80: +26 pts | 90: +29 pts
 * - 100: +32 pts | 110: +35 pts | 120: +38 pts | 130+: +41 pts
 */
export function getCvXoayLashPoints(materialIdOrCode?: string, countStr?: string): number {
  const spec = resolveMaterialSpec(materialIdOrCode);
  if (spec.code === 'UNDER_MINK') return 17;
  const match = String(countStr || '').match(/\d+/);
  const num = match ? Number(match[0]) : 70;
  if (num <= 50) return 17;
  if (num <= 60) return 20;
  if (num <= 70) return 23;
  if (num <= 80) return 26;
  if (num <= 90) return 29;
  if (num <= 100) return 32;
  if (num <= 110) return 35;
  if (num <= 120) return 38;
  return 41;
}

/**
 * 4. Điểm Loại Ca Làm (OrderServiceType) chuẩn Báo cáo CV Xoay:
 * - Retain (Dặm): 0 pts
 * - Normal (Nối Mới): +7 pts
 * - Fix / Adjust (Sửa mi FAL): +15 pts
 */
export function getCvXoayTypePoints(serviceType?: string, isAlwaysFullSet?: boolean): number {
  const st = String(serviceType || '').toLowerCase();
  if (st.includes('fix') || st.includes('adjust')) return 15;
  if (isAlwaysFullSet) return 7;
  if (st.includes('retain') || st.includes('dặm')) return 0;
  return 7;
}

/**
 * Tra cứu mã SKU Wings và Giá niêm yết chuẩn theo [Chất Liệu + Số Lượng Sợi/Kỹ Thuật Fan]
 */
export function resolveLashSkuPricing(
  materialId: string,
  countStr?: string,
  volumeStr?: string,
  serviceType?: string
): {
  skuName: string;
  price: number;
  classPts: number;
  lashPts: number;
  fanPts: number;
  isRetain: boolean;
  isAlwaysFullSet?: boolean;
} {
  const mid = String(materialId || '').toLowerCase();
  const c = String(countStr || '').toLowerCase();
  const v = String(volumeStr || '').toLowerCase();
  const isRetain =
    String(serviceType || '')
      .toLowerCase()
      .includes('retain') ||
    String(serviceType || '')
      .toLowerCase()
      .includes('dặm');
  const alwaysFullSet = isAlwaysFullSetMaterial(materialId);
  const classPts = getCvXoayClassPoints(materialId);
  const lashPts = getCvXoayLashPoints(materialId, countStr);
  const fanPts = getCvXoayFanPoints(materialId, volumeStr);

  // Ưu tiên tra cứu trực tiếp Ma Trận Menu Wings Lashes chuẩn xác 100%
  const menuDetail = getWingsMenuDetail(materialId, countStr, volumeStr);
  if (menuDetail) {
    // Riêng Mink & IvyLight: đi trong 25 ngày (isRetain = true) vẫn tính Giá Dặm (refillPrice), nhưng kỹ thuật luôn là Nối Mới 100%
    const price = isRetain ? menuDetail.refillPrice : menuDetail.newPrice;
    const kPrice = Math.round(price / 1000);
    const matSpec = resolveMaterialSpec(materialId);
    const unit =
      matSpec.code === 'UNDER_MINK' || matSpec.code === 'FLAWLESS_MINK' || matSpec.code === 'NEW_CLASSIC'
        ? 'sợi'
        : matSpec.code === 'IVYLIGHT'
          ? 'nhịp'
          : 'fan';
    const actionPrefix = alwaysFullSet ? (isRetain ? 'Nối Mới (Giá Dặm)' : 'New') : isRetain ? 'Dặm' : 'New';
    const skuName = `${actionPrefix} ${matSpec.shortLabel} ${kPrice}K (${menuDetail.countNum} ${unit})`;
    return { skuName, price, classPts, lashPts, fanPts, isRetain, isAlwaysFullSet: alwaysFullSet };
  }

  // Fallback price resolution if menuDetail not matched directly
  if (mid.includes('dưới') || mid.includes('under')) {
    const price = isRetain ? 250000 : 390000;
    const skuName = isRetain ? 'Dặm Mi Dưới 250K' : 'New Flawless Under Mink 390K';
    return { skuName, price, classPts: 5, lashPts: 17, fanPts: 0, isRetain };
  }

  const fallbackPrice = isRetain ? 350000 : 550000;
  const fallbackSkuName = `${isRetain ? 'Dặm' : 'New'} ${materialId} ${Math.round(fallbackPrice / 1000)}K`;
  return {
    skuName: fallbackSkuName,
    price: fallbackPrice,
    classPts,
    lashPts,
    fanPts,
    isRetain,
    isAlwaysFullSet: alwaysFullSet,
  };
}

import { formatComboName as sharedFormatComboName } from '@mos-lab/shared';

/**
 * Fallback-safe wrapper for formatComboName to prevent Webpack HMR bundle desync errors
 */
export function formatComboName(name?: string, packageKey?: string): string {
  if (typeof sharedFormatComboName === 'function') {
    return sharedFormatComboName(name, packageKey);
  }
  const raw = String(name || '').trim();
  if (!raw) return '';
  return raw.startsWith('❖') ? raw : `❖ ${raw}`;
}

export interface CustomerTypeMeta {
  symbol: string;
  label: string;
  colorClass: string;
}

/**
 * Phân định bộ ký hiệu Unicode sang trọng cho 4 nhóm khách hàng (Kinh Thánh mOS Điều răn COMBO-003):
 * - ✦ : Khách mới lần đầu (customerVisits <= 1)
 * - ❖ : Khách có Gói Combo Live (> 2 suất còn lại)
 * - ❖! : Khách Combo sắp hết (còn ≤ 2 suất)
 * - ↻ : Khách quay lại
 */
export function resolveCustomerTypeMeta(booking?: {
  customerVisits?: number;
  comboLiveStatus?: { isComboLive?: boolean; remainingSessions?: number };
}): CustomerTypeMeta {
  const visits = booking?.customerVisits || 1;
  const isCombo = Boolean(booking?.comboLiveStatus?.isComboLive);
  const remaining = booking?.comboLiveStatus?.remainingSessions ?? 0;

  if (visits <= 1) {
    return { symbol: '✦', label: 'Khách mới lần đầu', colorClass: 'text-cyan-400' };
  }
  if (isCombo && remaining > 0) {
    if (remaining <= 2) {
      return { symbol: '❖!', label: 'Khách Combo sắp hết (≤ 2 lần)', colorClass: 'text-rose-400' };
    }
    return { symbol: '❖', label: 'Khách có Combo Live', colorClass: 'text-amber-400' };
  }
  return { symbol: '↻', label: 'Khách quay lại', colorClass: 'text-purple-300' };
}

/**
 * Chuẩn hóa tên dịch vụ hiển thị, triệt tiêu hoàn toàn placeholder tạm "Any - Lashes"
 */
export function resolveDisplayServiceName(booking?: {
  serviceName?: string;
  comboLiveStatus?: { isComboLive?: boolean; comboName?: string; packageKey?: string };
  packageKey?: string;
  lashHistory?: Array<{ serviceName?: string }>;
  attributes?: { material?: string; count?: string; volume?: string; style?: string };
  customerVisits?: number;
}): string {
  const s = String(booking?.serviceName || '').trim();
  const pkgKey = booking?.packageKey || booking?.comboLiveStatus?.packageKey;
  if (s && !s.toLowerCase().includes('any')) {
    return formatComboName(s, pkgKey);
  }
  if (booking?.comboLiveStatus?.isComboLive && booking.comboLiveStatus.comboName) {
    return formatComboName(booking.comboLiveStatus.comboName, pkgKey);
  }
  if (booking?.lashHistory && booking.lashHistory.length > 0) {
    const validHistory = booking.lashHistory.find((h) => h.serviceName && !h.serviceName.toLowerCase().includes('any'));
    if (validHistory?.serviceName) {
      return validHistory.serviceName;
    }
  }
  const mat = booking?.attributes?.material || 'HyperLight';
  const vol = booking?.attributes?.volume || '2X';
  const count = booking?.attributes?.count || '70 fan';
  const sku = resolveLashSkuPricing(mat, count, vol);
  if (sku?.skuName && !sku.skuName.toLowerCase().includes('any')) {
    return sku.skuName;
  }
  return booking?.customerVisits && booking.customerVisits > 1 ? 'New Hyperlight 550' : 'Chưa chọn mẫu mi';
}

/**
 * 5. Điểm Thiết kế Dáng mi (OrderServiceAttributeDesign) chuẩn Báo cáo CV Xoay (staff_bonus_rule):
 * - Natural (id=49): 0 pts
 * - Kim-K / Katun / Thiết kế (id=101): +5 pts
 * - Wing (id=50): +6 pts
 * - Doll (id=102): +7 pts
 */
export function getLashDesignPoints(designId?: string): number {
  const d = String(designId || '').toLowerCase();
  if (d.includes('doll') || d.includes('búp bê')) return 7; // Doll (id=102): +7 pts
  if (d.includes('wing')) return 6; // Wing (id=50): +6 pts
  if (
    d.includes('kim') ||
    d.includes('katun') ||
    d.includes('anime') ||
    d.includes('wispy') ||
    d.includes('wet') ||
    d.includes('thiết kế')
  ) {
    return 5; // Kim-K (id=101): +5 pts
  }
  return 0; // Natural (id=49): 0 pts
}

/**
 * 6. Điểm Màu mi (OrderServiceAttributeColor) chuẩn Báo cáo CV Xoay (staff_bonus_rule):
 * - Đen (black, id=34): 0 pts
 * - Nâu / Xanh / Tím / Phối màu (brown/blue/purple, id=35,89,90): +5 pts
 */
export function getLashColorPoints(colorStr?: string): number {
  const c = String(colorStr || '').toLowerCase();
  if (!c || c === 'black' || c.includes('đen tuyền') || c.includes('jet black')) return 0;
  if (
    c.includes('brown') ||
    c.includes('nâu') ||
    c.includes('blue') ||
    c.includes('xanh') ||
    c.includes('purple') ||
    c.includes('tím') ||
    c.includes('color') ||
    c.includes('màu') ||
    c.includes('highlight') ||
    c.includes('ombre')
  ) {
    return 5;
  }
  return 0;
}

/**
 * Tính toàn bộ thông số Vòng xoay CV (Báo cáo CV Xoay) & Giá tiền mi nối:
 * - Nếu khách nối cả Mi Trên và Mi Dưới (`hasUnderMink = true`), Chuyên Viên nhận đủ 2 BỘ MI ĐỘC LẬP về vòng xoay:
 *   + Bộ 1 (Mi Trên): `classPts + fanPts + typePts + lashPts + designPts + colorPts`
 *   + Bộ 2 (Mi Dưới · Flawless Under Mink): `Class +5 · Fan +0 · Type (+7 Mới / +0 Dặm) · Lash +17 · Design +0` (= +29 pts Mới hoặc +22 pts Dặm)
 * - Nếu khách hàng có Gói Combo Mi Dưới (`hasUnderMinkCombo = true`), tự động trừ thẳng vào gói Combo Mi Dưới (`underMinkPrice = 0đ`).
 */
export function calculateLashPricingAndCvPoints(params: {
  materialId: string;
  countStr?: string;
  volumeStr?: string;
  designId?: string;
  colorStr?: string;
  originalBookedPrice?: number;
  serviceType?: string; // "Normal" | "Retain" | "Fix" | "Adjust"
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
  hasUnderMinkCombo?: boolean;
}): LashRotationPointsBreakdown {
  const {
    materialId,
    countStr,
    volumeStr,
    designId,
    colorStr,
    originalBookedPrice = 550000,
    serviceType = 'Normal',
    hasUnderMink = false,
    underMinkServiceType,
    hasUnderMinkCombo = false,
  } = params;

  // 1. SKU & Giá niêm yết Bộ 1 (Mi Trên)
  const skuInfo = resolveLashSkuPricing(materialId, countStr, volumeStr, serviceType);
  const isRetain = skuInfo.isRetain;
  const alwaysFullSet = Boolean(skuInfo.isAlwaysFullSet);

  // 2. Bộ 2 (Mi Dưới · Flawless Under Mink) độc lập chế độ Nối Mới (390K) hoặc Dặm (250K) với Mi Trên
  // Nếu khách có Gói Combo Mi Dưới (hasUnderMinkCombo = true) -> Tự động trừ vào gói Combo Mi Dưới (0đ thu thêm)
  const resolvedUnderMinkType: 'Normal' | 'Retain' = underMinkServiceType || (isRetain ? 'Retain' : 'Normal');
  const isUnderMinkRetain = resolvedUnderMinkType === 'Retain';
  const isUnderMinkComboDeducted = Boolean(hasUnderMink && hasUnderMinkCombo);
  const underMinkListPrice = isUnderMinkRetain ? 250000 : 390000;
  const underMinkPrice = hasUnderMink ? (isUnderMinkComboDeducted ? 0 : underMinkListPrice) : 0;
  const underMinkFibers = hasUnderMink ? 30 : 0;
  const underMinkDuration = hasUnderMink ? 30 : 0;

  const skuPrice = skuInfo.price + underMinkPrice;
  const underSkuSuffix = isUnderMinkComboDeducted
    ? `Trừ Gói Mi Dưới (${isUnderMinkRetain ? 'Dặm' : 'Mới'} · 0đ)`
    : isUnderMinkRetain
      ? 'Dặm 250K'
      : 'Mới 390K';
  const skuName = hasUnderMink ? `${skuInfo.skuName} + Mi Dưới (${underSkuSuffix})` : skuInfo.skuName;

  const originalPrice = originalBookedPrice;
  const upgradePrice = Math.max(0, skuPrice - originalPrice);

  // Thuế VAT 8% (Chuẩn Wings Lashes & mos-lab)
  const vatRate = 0.08;
  const vatAmount = Math.round(skuPrice * vatRate);
  const totalPriceWithVat = skuPrice + vatAmount;
  const upgradeVat = Math.round(upgradePrice * vatRate);
  const upgradePriceWithVat = upgradePrice + upgradeVat;

  // 3. Điểm Vòng Xoay Bộ 1 (Mi Trên) theo đúng Báo cáo CV Xoay
  const classPts = skuInfo.classPts;
  const fanPts = skuInfo.fanPts;
  const typePts = getCvXoayTypePoints(serviceType, alwaysFullSet);
  const lashPts = skuInfo.lashPts;
  const designPts = getLashDesignPoints(designId);
  const colorPts = getLashColorPoints(colorStr);

  const upperSetPoints = classPts + fanPts + typePts + lashPts + designPts + colorPts;
  const upperSetBreakdownLabel = `Class +${classPts} · Fan +${fanPts} · Type +${typePts} · Lash +${lashPts} · Design +${designPts}${
    colorPts > 0 ? ` · Color +${colorPts}` : ''
  }`;

  // 4. Điểm Vòng Xoay Bộ 2 (Mi Dưới · Độc lập về vòng xoay)
  // Trong DB CV Xoay: Flawless Under Mink có Class = Flawless Mink (+5), Fan = 1D (0), Lash = <=50 (+17), Design = Natural (0)
  // - Nối Mới (Normal): Class +5 · Type +7 · Lash +17 = +29 pts
  // - Dặm (Retain): Class +5 · Type +0 · Lash +17 = +22 pts
  const serviceSetsCount: 1 | 2 = hasUnderMink ? 2 : 1;
  const underClassPts = hasUnderMink ? 5 : 0;
  const underTypePts = hasUnderMink ? (isUnderMinkRetain ? 0 : 7) : 0;
  const underLashPts = hasUnderMink ? 17 : 0;
  const underSetPoints = hasUnderMink ? underClassPts + underTypePts + underLashPts : 0;
  const underSetBreakdownLabel = hasUnderMink
    ? `Class +${underClassPts} · Fan +0 · Type +${underTypePts} · Lash +${underLashPts} · Design +0`
    : '';

  const totalPoints = upperSetPoints + underSetPoints;

  const breakdownLabel = hasUnderMink
    ? `Bộ 1 Mi Trên: +${upperSetPoints}p (${upperSetBreakdownLabel}) | Bộ 2 Mi Dưới (${
        isUnderMinkRetain ? 'Dặm' : 'Mới'
      }): +${underSetPoints}p (Class +5 · Type +${underTypePts} · Lash +17)`
    : upperSetBreakdownLabel;

  const progressUnicode = totalPoints >= 100 ? '●' : totalPoints >= 65 ? '◕' : totalPoints >= 35 ? '◑' : '◔';
  const summaryLabel = hasUnderMink
    ? `${progressUnicode} 2 Bộ Mi Độc Lập · +${totalPoints} pts (${upperSetPoints}p + ${underSetPoints}p)`
    : `${progressUnicode} 1 Bộ Mi · +${totalPoints} pts Vòng Xoay CV`;

  return {
    skuName,
    skuPrice,
    upgradePrice,
    originalPrice,
    vatRate,
    vatAmount,
    totalPriceWithVat,
    upgradeVat,
    upgradePriceWithVat,
    classPts,
    lashPts,
    designPts,
    fanPts,
    typePts,
    colorPts,
    upperSetPoints,
    upperSetBreakdownLabel,
    serviceSetsCount,
    underClassPts,
    underTypePts,
    underLashPts,
    underSetPoints,
    underSetBreakdownLabel,
    totalPoints,
    summaryLabel,
    breakdownLabel,
    isRetain,
    serviceType: isRetain ? 'Retain' : 'Normal',
    hasUnderMink,
    underMinkServiceType: resolvedUnderMinkType,
    isUnderMinkComboDeducted,
    underMinkPrice,
    underMinkFibers,
    underMinkDuration,
  };
}

// ============================================================================
// QUY TẮC TỰ ĐỘNG CHỌN DỊCH VỤ: COMBO (25 NGÀY) vs SINGLE (21 NGÀY VÔ ĐIỀU KIỆN)
// ============================================================================

/**
 * Chu kỳ chuẩn tính Dặm / Giá Dặm toàn hệ thống Wings Lashes:
 * - Khách đã mua Gói Combo (`isComboLive = true`): Đi trong 25 ngày (≤ 25 ngày) luôn luôn được tính Dặm.
 * - Khách lẻ (`Single`, `isComboLive = false`): Đi trong 21 ngày (≤ 21 ngày) sẽ có Giá Dặm vô điều kiện.
 */
export const COMBO_RETAIN_CYCLE_DAYS_LIMIT = 25;
export const SINGLE_RETAIN_CYCLE_DAYS_LIMIT = 21;
export const RETAIN_CYCLE_DAYS_LIMIT = COMBO_RETAIN_CYCLE_DAYS_LIMIT;
export const IVYLIGHT_SYSTEM_DB_RETENTION_DAYS = 25;
export const IVYLIGHT_SYSTEM_COMBO_REMIND_DAYS = 14;

export function getRetainCycleDaysLimit(isComboLive?: boolean): number {
  return isComboLive ? COMBO_RETAIN_CYCLE_DAYS_LIMIT : SINGLE_RETAIN_CYCLE_DAYS_LIMIT;
}

/**
 * Tính số ngày kể từ lần ghé thăm gần nhất (hỗ trợ định dạng DD/MM/YYYY hoặc YYYY-MM-DD)
 */
export function parseDaysSinceLastVisit(
  lastVisitDateStr?: string,
  referenceDateStr: string = '03/11/2026'
): number | null {
  if (!lastVisitDateStr || !lastVisitDateStr.trim()) return null;

  const parseDate = (s: string): Date | null => {
    const clean = s.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
      const [dd, mm, yyyy] = clean.split('/').map(Number);
      return new Date(yyyy, mm - 1, dd, 12, 0, 0);
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  };

  const lastDate = parseDate(lastVisitDateStr);
  if (!lastDate) return null;

  const refDate = parseDate(referenceDateStr) || new Date(2026, 10, 3, 12, 0, 0);
  const diffMs = refDate.getTime() - lastDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export interface AutoResolvedComboServiceSpec {
  materialId: string;
  materialCode: string;
  materialShortLabel: string;
  volume: string;
  count: string;
  matchedKPrice?: number;
  style?: string;
  curl?: string;
  thickness?: string;
  length?: string;
}

/**
 * Tự động bóc tách Chất liệu, Kỹ thuật Volume và Số sợi/fan từ tên Gói Combo hoặc Mã dịch vụ đã mua
 */
export function resolveServiceSpecsFromComboOrHistory(
  rawText?: string,
  catalog: LashMaterialSpec[] = DEFAULT_LASH_MATERIAL_CATALOG
): AutoResolvedComboServiceSpec | null {
  if (!rawText || !rawText.trim()) return null;
  const s = rawText.toLowerCase();

  const mat = resolveMaterialSpec(rawText, catalog);
  const priceMatch = s.match(/\b(390|440|550|660|770|880|990|1110|1220|1330|1440|1550|1770|2110)\b/);
  const kPrice = priceMatch ? Number(priceMatch[1]) : undefined;

  let volume = mat.defaultVolume;
  let count = mat.defaultCount;

  if (mat.code === 'FLAWLESS_MINK') {
    volume = '1D';
    if (kPrice === 770 || s.includes('60 sợi')) count = '60 sợi';
    else if (kPrice === 880 || s.includes('70 sợi')) count = '70 sợi';
    else if (kPrice === 1110 || s.includes('90 sợi')) count = '90 sợi';
    else if (kPrice === 1440 || s.includes('110 sợi')) count = '110 sợi';
    else if (kPrice === 1770 || s.includes('130 sợi')) count = '130 sợi';
    else count = '70 sợi';
  } else if (mat.code === 'IVYLIGHT') {
    if (s.includes('3l')) volume = '3L';
    else if (s.includes('5l')) volume = '5L';
    else volume = '4L';

    if (volume === '3L') {
      if (kPrice === 770) count = '70 sợi';
      else if (kPrice === 880) count = '90 sợi';
      else if (kPrice === 990) count = '110 sợi';
      else if (kPrice === 1330) count = '130 sợi';
      else count = '90 sợi';
    } else if (volume === '5L') {
      if (kPrice === 1110) count = '70 sợi';
      else if (kPrice === 1440) count = '90 sợi';
      else if (kPrice === 1770) count = '110 sợi';
      else if (kPrice === 2110) count = '130 sợi';
      else count = '90 sợi';
    } else {
      if (kPrice === 990) count = '70 sợi';
      else if (kPrice === 1220) count = '90 sợi';
      else if (kPrice === 1440) count = '110 sợi';
      else if (kPrice === 1770) count = '130 sợi';
      else count = '90 sợi';
    }
  } else if (mat.code === 'HYPERLIGHT') {
    if (s.includes('2x')) volume = '2X';
    else if (s.includes('3x')) volume = '3X';
    else if (s.includes('5x')) volume = '5X';
    else volume = '4X';

    if (kPrice === 440) {
      volume = '2X';
      count = '50 fan';
    } else if (kPrice === 550) {
      volume = '3X';
      count = '50 fan';
    } else if (kPrice === 660) {
      if (s.includes('4x')) {
        volume = '4X';
        count = '50 fan';
      } else {
        volume = '3X';
        count = '70 fan';
      }
    } else if (kPrice === 770) {
      volume = '4X';
      count = '70 fan';
    } else if (kPrice === 880) {
      volume = '4X';
      count = '90 fan';
    } else if (kPrice === 990) {
      volume = '4X';
      count = '110 fan';
    } else if (kPrice === 1220) {
      volume = '5X';
      count = '90 fan';
    } else if (kPrice === 1330) {
      volume = '4X';
      count = '130 fan';
    } else if (kPrice === 1440) {
      volume = '5X';
      count = '110 fan';
    } else if (kPrice === 1770) {
      volume = '5X';
      count = '130 fan';
    }
  } else if (mat.code === 'ULTRALIGHT') {
    if (s.includes('3d')) volume = '3D';
    else if (s.includes('5d')) volume = '5D';
    else volume = '4D';

    if (kPrice === 550) {
      volume = '3D';
      count = '60 fan';
    } else if (kPrice === 660) {
      volume = '4D';
      count = '60 fan';
    } else if (kPrice === 770) {
      volume = '4D';
      count = '80 fan';
    } else if (kPrice === 880) {
      volume = '4D';
      count = '100 fan';
    } else if (kPrice === 990) {
      volume = '5D';
      count = '80 fan';
    } else if (kPrice === 1110) {
      volume = '4D';
      count = '120 fan';
    } else if (kPrice === 1220) {
      volume = '5D';
      count = '100 fan';
    } else if (kPrice === 1550) {
      volume = '5D';
      count = '120 fan';
    }
  } else if (mat.code === 'NEW_VOLUME') {
    volume = '2D';
    if (kPrice === 390) count = '50 fan';
    else if (kPrice === 440) count = '60 fan';
    else if (kPrice === 550) count = '80 fan';
    else if (kPrice === 660) count = '100 fan';
    else if (kPrice === 880) count = '120 fan';
    else count = '80 fan';
  } else if (mat.code === 'NEW_CLASSIC') {
    volume = '1D';
    if (kPrice === 390) count = '60 sợi';
    else if (kPrice === 440) count = '70 sợi';
    else if (kPrice === 550) count = '90 sợi';
    else if (kPrice === 660) count = '110 sợi';
    else if (kPrice === 880) count = '130 sợi';
    else count = '90 sợi';
  }

  return {
    materialId: mat.id,
    materialCode: mat.code,
    materialShortLabel: mat.shortLabel,
    volume,
    count,
    matchedKPrice: kPrice,
  };
}

/**
 * Kiểm tra xem lần ghé gần nhất của khách trong `lashHistory` có làm kèm Mi Dưới (Under Mink) không
 */
export function detectUnderMinkFromLastVisit(
  lashHistory?: Array<{ date: string; serviceName: string; staffName?: string }>,
  explicitFlag?: boolean
): boolean {
  if (typeof explicitFlag === 'boolean') return explicitFlag;
  if (!Array.isArray(lashHistory) || lashHistory.length === 0) return false;
  const latestDate = lashHistory[0]?.date;
  return lashHistory.some((h) => {
    if (latestDate && h.date !== latestDate) return false;
    const s = String(h.serviceName || '').toLowerCase();
    return s.includes('under') || s.includes('mi dưới');
  });
}

export const UNDER_MINK_PREP_SPEC = {
  materialName: 'Flawless Under Mink (1D)',
  shortLabel: 'Mi Dưới (Under Mink)',
  fixedThickness: '0.10 mm',
  allowedCurls: ['B', 'C'] as const,
  defaultCurl: 'B',
  allowedLengths: ['5 mm', '6 mm', '7 mm', '8 mm', '9 mm', '10 mm'] as const,
  defaultLength: '7 mm',
  defaultLengthMm: 7,
  minLengthMm: 5,
  maxLengthMm: 10,
  lengthStepMm: 1,
  allowedCounts: ['10 sợi', '20 sợi', '30 sợi', '40 sợi', '50 sợi', '60 sợi'] as const, // Tối đa 60 sợi
  defaultCount: '30 sợi',
  defaultCountFibers: 30,
  minCountFibers: 10,
  maxCountFibers: 60,
  countStepFibers: 10,
  maxFibersRule: '≤ 60 sợi',
  durationMin: 30,
  newPrice: 390000,
  retainPrice: 250000,
};

/**
 * Chuẩn hóa chiều dài Mi Dưới về số nguyên mm (mặc định 7, tăng/giảm 1 trong khoảng 5..10)
 */
export function parseUnderMinkLengthMm(val?: string | number | null): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return Math.min(UNDER_MINK_PREP_SPEC.maxLengthMm, Math.max(UNDER_MINK_PREP_SPEC.minLengthMm, Math.round(val)));
  }
  const str = String(val || '').trim();
  if (!str) return UNDER_MINK_PREP_SPEC.defaultLengthMm;
  // Nếu chuỗi cũ dạng "6-7 mm", lấy số cuối (7) làm chuẩn mặc định
  const matches = str.match(/\d+/g);
  if (!matches || matches.length === 0) return UNDER_MINK_PREP_SPEC.defaultLengthMm;
  const num = Number(matches[matches.length - 1]);
  if (!Number.isFinite(num)) return UNDER_MINK_PREP_SPEC.defaultLengthMm;
  return Math.min(UNDER_MINK_PREP_SPEC.maxLengthMm, Math.max(UNDER_MINK_PREP_SPEC.minLengthMm, num));
}

export function stepUnderMinkLength(currentStr?: string, delta: number = 1): string {
  const currentMm = parseUnderMinkLengthMm(currentStr);
  const nextMm = Math.min(
    UNDER_MINK_PREP_SPEC.maxLengthMm,
    Math.max(UNDER_MINK_PREP_SPEC.minLengthMm, currentMm + delta)
  );
  return `${nextMm} mm`;
}

/**
 * Chuẩn hóa số lượng sợi Mi Dưới về bội số của 10 (mặc định 30, tăng/giảm 10 trong khoảng 10..40)
 */
export function parseUnderMinkCountFibers(val?: string | number | null): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    const rounded = Math.round(val / 10) * 10;
    return Math.min(UNDER_MINK_PREP_SPEC.maxCountFibers, Math.max(UNDER_MINK_PREP_SPEC.minCountFibers, rounded));
  }
  const str = String(val || '').trim();
  if (!str) return UNDER_MINK_PREP_SPEC.defaultCountFibers;
  const match = str.match(/\d+/);
  if (!match) return UNDER_MINK_PREP_SPEC.defaultCountFibers;
  const num = Math.round(Number(match[0]) / 10) * 10;
  if (!Number.isFinite(num)) return UNDER_MINK_PREP_SPEC.defaultCountFibers;
  return Math.min(UNDER_MINK_PREP_SPEC.maxCountFibers, Math.max(UNDER_MINK_PREP_SPEC.minCountFibers, num));
}

export function stepUnderMinkCount(currentStr?: string, delta: number = 10): string {
  const currentFibers = parseUnderMinkCountFibers(currentStr);
  const nextFibers = Math.min(
    UNDER_MINK_PREP_SPEC.maxCountFibers,
    Math.max(UNDER_MINK_PREP_SPEC.minCountFibers, currentFibers + delta)
  );
  return `${nextFibers} sợi`;
}

export interface QuickCheckInComboPreset {
  materialSpec: LashMaterialSpec;
  materialId: string;
  materialShortLabel: string;
  volume: string;
  count: string;
  style: string;
  curl: string;
  thickness: string;
  length: string;
  color: string;
  hasUnderMink: boolean;
  underMinkServiceType: 'Normal' | 'Retain';
  underMinkCurl: string;
  underMinkThickness: string;
  underMinkLength: string;
  underMinkCount: string;
  hasUnderMinkCombo: boolean;
  underComboRemaining: number;
  underComboNormalRemaining: number;
  underComboRetainRemaining: number;
  underComboName: string;
  lastVisitDate: string | null;
  daysSinceLastVisit: number | null;
  retainDaysLimit: number;
  isWithinRetainWindow: boolean;
  expectedServiceType: 'Normal' | 'Retain';
  isAlwaysFullSet: boolean;
  remainingSessions: number;
  normalRemaining: number;
  retainRemaining: number;
  hasNormalRemaining: boolean;
  hasRetainRemaining: boolean;
}

/**
 * Tổng hợp toàn bộ thông số Quick Check-in cho khách có Gói Combo (hoặc khách cũ giữ nguyên form lần trước):
 * - 80-90% khách có Gói Combo sẽ dùng lượt còn lại trong gói với thông số nối mi y hệt lần trước,
 *   chỉ khác là Nối Mới (Normal) hay Dặm Mi (Retain).
 * - Nếu khách muốn Nối Mới (dù đi trong 25 ngày) và trong gói CÒN LẦN NỐI MỚI (`normalRemaining > 0`),
 *   cho phép chọn Nối Mới trực tiếp (trừ 1 lần Nối Mới trong gói) mà không báo lỗi Override!
 * - Mi Dưới (Under Mink) có thể đi kèm bất kỳ Mi Trên nào, luôn nối dưới 50 sợi (20-40 sợi),
 *   thông số chuẩn theo dữ liệu thực tế: Dày 0.10mm · Cong B/C · Dài 6-7mm.
 */
export function resolveQuickCheckInComboPreset(
  booking: {
    serviceName?: string;
    comboLiveStatus?: {
      isComboLive?: boolean;
      remainingSessions?: number;
      normalRemaining?: number;
      retainRemaining?: number;
      comboName?: string;
      serviceKey?: string;
      retainDaysLimit?: number;
    };
    underMinkComboStatus?: {
      hasUnderCombo?: boolean;
      remainingSessions?: number;
      normalRemaining?: number;
      retainRemaining?: number;
      comboName?: string;
    };
    lashHistory?: Array<{ date: string; serviceName: string; staffName?: string }>;
    attributes?: {
      style?: string;
      curl?: string;
      length?: string;
      thickness?: string;
      material?: string;
      color?: string;
      volume?: string;
      count?: string;
      hasUnderMink?: boolean;
      underMinkServiceType?: 'Normal' | 'Retain';
      underMinkCurl?: string;
      underMinkThickness?: string;
      underMinkLength?: string;
      underMinkCount?: string;
    };
  },
  catalog: LashMaterialSpec[] = DEFAULT_LASH_MATERIAL_CATALOG
): QuickCheckInComboPreset {
  const isComboLive = Boolean(booking?.comboLiveStatus?.isComboLive);
  // Tìm dịch vụ mi trên từ lịch sử (bỏ qua dòng Under Mink nếu có cả 2 dòng cùng ngày)
  const historyUpperEntry = (booking?.lashHistory || []).find((h) => {
    const s = String(h.serviceName || '').toLowerCase();
    return !s.includes('under') && !s.includes('mi dưới');
  });

  const sourceText = isComboLive
    ? booking?.comboLiveStatus?.serviceKey ||
      booking?.comboLiveStatus?.comboName ||
      historyUpperEntry?.serviceName ||
      booking?.serviceName
    : booking?.attributes?.material || historyUpperEntry?.serviceName || booking?.serviceName;

  const resolved = resolveServiceSpecsFromComboOrHistory(sourceText || 'New Flawless Mink 880', catalog) || {
    materialId: 'New Flawless Mink',
    materialCode: 'FLAWLESS_MINK',
    materialShortLabel: 'Flawless Mink',
    volume: '1D',
    count: '70 sợi',
  };

  const mat = resolveMaterialSpec(resolved.materialId, catalog);
  const hasHistoryOrCombo = isComboLive || Boolean(historyUpperEntry);

  const rawVolume =
    (hasHistoryOrCombo
      ? resolved.volume || booking?.attributes?.volume
      : booking?.attributes?.volume || resolved.volume) || mat.defaultVolume;
  const volume = mat.allowedVolumes.includes(rawVolume)
    ? rawVolume
    : resolved.volume && mat.allowedVolumes.includes(resolved.volume)
      ? resolved.volume
      : mat.defaultVolume;

  const rawCount =
    (hasHistoryOrCombo ? resolved.count || booking?.attributes?.count : booking?.attributes?.count || resolved.count) ||
    mat.defaultCount;
  const count = mat.allowedCounts.includes(rawCount)
    ? rawCount
    : resolved.count && mat.allowedCounts.includes(resolved.count)
      ? resolved.count
      : mat.defaultCount;

  const rawStyle = booking?.attributes?.style || mat.defaultDesign;
  const style = mat.allowedDesigns.includes(rawStyle) ? rawStyle : mat.defaultDesign;

  const rawCurl = booking?.attributes?.curl || mat.defaultCurl;
  const curl = mat.allowedCurls.includes(rawCurl) ? rawCurl : mat.defaultCurl;

  const rawThick = booking?.attributes?.thickness || mat.defaultThickness;
  const thickness = mat.allowedThicknesses.includes(rawThick) ? rawThick : mat.defaultThickness;

  const validLengths = [...mat.allowedLengthMappings.map((m) => m.id), ...mat.allowedSingleLengths];
  const rawLength = booking?.attributes?.length || mat.defaultLength;
  const length = validLengths.includes(rawLength) ? rawLength : mat.defaultLength;

  const color = booking?.attributes?.color || 'Đen Tuyền (Jet Black)';
  const hasUnderMinkCombo = Boolean(
    booking?.underMinkComboStatus?.hasUnderCombo && Number(booking?.underMinkComboStatus?.remainingSessions ?? 0) > 0
  );
  const underComboRemaining = Number(booking?.underMinkComboStatus?.remainingSessions ?? 0);
  const underComboNormalRemaining = Number(booking?.underMinkComboStatus?.normalRemaining ?? 0);
  const underComboRetainRemaining = Number(booking?.underMinkComboStatus?.retainRemaining ?? 0);
  const underComboName = booking?.underMinkComboStatus?.comboName || 'Combo Mi Dưới';

  const hasUnderMink =
    detectUnderMinkFromLastVisit(booking?.lashHistory, booking?.attributes?.hasUnderMink) || hasUnderMinkCombo;
  const underMinkCurl = booking?.attributes?.underMinkCurl || UNDER_MINK_PREP_SPEC.defaultCurl;
  const underMinkThickness = booking?.attributes?.underMinkThickness || UNDER_MINK_PREP_SPEC.fixedThickness;
  const underMinkLength = `${parseUnderMinkLengthMm(booking?.attributes?.underMinkLength)} mm`;
  const underMinkCount = `${parseUnderMinkCountFibers(booking?.attributes?.underMinkCount)} sợi`;

  const lastVisitDate = booking?.lashHistory?.[0]?.date || null;
  const daysSinceLastVisit = parseDaysSinceLastVisit(lastVisitDate || undefined);
  const retainDaysLimit = getRetainCycleDaysLimit(isComboLive);
  const isWithinRetainWindow = daysSinceLastVisit !== null && daysSinceLastVisit <= retainDaysLimit;
  const isAlwaysFullSet = isAlwaysFullSetMaterial(mat.code || mat.id);

  const remainingSessions = Number(booking?.comboLiveStatus?.remainingSessions ?? 0);
  const hasExplicitCounts =
    booking?.comboLiveStatus?.normalRemaining !== undefined || booking?.comboLiveStatus?.retainRemaining !== undefined;

  const normalRemaining = isComboLive
    ? hasExplicitCounts
      ? Number(booking?.comboLiveStatus?.normalRemaining ?? 0)
      : isAlwaysFullSet
        ? remainingSessions
        : Math.max(1, Math.floor(remainingSessions / 2))
    : 0;

  const retainRemaining = isComboLive
    ? hasExplicitCounts
      ? Number(booking?.comboLiveStatus?.retainRemaining ?? 0)
      : isAlwaysFullSet
        ? 0
        : Math.max(0, remainingSessions - normalRemaining)
    : 0;

  const hasNormalRemaining = normalRemaining > 0;
  const hasRetainRemaining = hasExplicitCounts
    ? retainRemaining > 0
    : isAlwaysFullSet
      ? remainingSessions > 0
      : retainRemaining > 0;

  // Tự động chọn chế độ mặc định:
  // - Nếu đi <= 25 ngày (Combo) và còn lần Dặm: mặc định chọn 'Retain'.
  // - Nếu đi <= 25 ngày nhưng gói đã hết lần Dặm mà chỉ còn lần Nối Mới: tự động chọn 'Normal' (dùng lần Nối Mới).
  // - Nếu đi > 25 ngày: mặc định chọn 'Normal'.
  const expectedServiceType: 'Normal' | 'Retain' = isWithinRetainWindow
    ? isComboLive && !hasRetainRemaining && hasNormalRemaining
      ? 'Normal'
      : 'Retain'
    : 'Normal';

  // Mi Dưới (Under Mink) có chế độ Nối Mới (390K) hoặc Dặm (250K) độc lập với Mi Trên:
  // Nếu khách có Gói Mi Dưới và chỉ còn lần Mới (0 lần Dặm) thì chọn 'Normal'; nếu đi trong <=25 ngày và còn lần Dặm thì chọn 'Retain'
  const underMinkServiceType: 'Normal' | 'Retain' =
    booking?.attributes?.underMinkServiceType ||
    (hasUnderMinkCombo
      ? isWithinRetainWindow && underComboRetainRemaining > 0
        ? 'Retain'
        : underComboNormalRemaining > 0
          ? 'Normal'
          : 'Retain'
      : hasUnderMink && isWithinRetainWindow
        ? 'Retain'
        : 'Normal');

  return {
    materialSpec: mat,
    materialId: mat.id,
    materialShortLabel: mat.shortLabel,
    volume,
    count,
    style,
    curl,
    thickness,
    length,
    color,
    hasUnderMink,
    underMinkServiceType,
    underMinkCurl,
    underMinkThickness,
    underMinkLength,
    underMinkCount,
    hasUnderMinkCombo,
    underComboRemaining,
    underComboNormalRemaining,
    underComboRetainRemaining,
    underComboName,
    lastVisitDate,
    daysSinceLastVisit,
    retainDaysLimit,
    isWithinRetainWindow,
    expectedServiceType,
    isAlwaysFullSet,
    remainingSessions,
    normalRemaining,
    retainRemaining,
    hasNormalRemaining,
    hasRetainRemaining,
  };
}
