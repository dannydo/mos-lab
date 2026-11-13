import type { WingsMenuItemMeta } from './constraintTypesAndOptions';

export function lookupClassicVolumeAndMinkMenu(mid: string, cNum: number, v: string = ''): WingsMenuItemMeta | null {
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

  // 2. Volume 2D / 3D
  if (mid.includes('volume') || mid === 'new_volume' || mid.includes('2d')) {
    const is3D = v.includes('3d') || mid.includes('3d');
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
    if (cNum === 70)
      return {
        materialCode: 'NEW_VOLUME',
        countNum: 70,
        totalFibers: is3D ? 420 : 280,
        durationMin: 60,
        newPrice: is3D ? 660000 : 550000,
        refillPrice: is3D ? 390000 : 340000,
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
    if (cNum === 90)
      return {
        materialCode: 'NEW_VOLUME',
        countNum: 90,
        totalFibers: is3D ? 540 : 360,
        durationMin: 75,
        newPrice: is3D ? 770000 : 660000,
        refillPrice: is3D ? 470000 : 390000,
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
    if (cNum === 110)
      return {
        materialCode: 'NEW_VOLUME',
        countNum: 110,
        totalFibers: is3D ? 660 : 440,
        durationMin: 95,
        newPrice: is3D ? 880000 : 770000,
        refillPrice: is3D ? 530000 : 470000,
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
    if (cNum === 130)
      return {
        materialCode: 'NEW_VOLUME',
        countNum: 130,
        totalFibers: is3D ? 780 : 520,
        durationMin: 115,
        newPrice: is3D ? 1110000 : 880000,
        refillPrice: is3D ? 680000 : 530000,
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

  return null;
}
