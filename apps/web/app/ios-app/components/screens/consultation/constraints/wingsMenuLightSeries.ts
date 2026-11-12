import type { WingsMenuItemMeta } from './constraintTypesAndOptions';

export function lookupLightSeriesMenu(mid: string, cNum: number, v: string): WingsMenuItemMeta | null {
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
