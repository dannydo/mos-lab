import { describe, it, expect } from 'vitest';
import {
  getWingsComboCategory,
  getLashFamilyInfo,
  matchComboCategoryAndVolumeFromBooking,
  getComboPackagesForCategoryAndVolume,
} from '@mos-lab/shared';

describe('Wings Combo Catalog Refactoring - Classic 1D, Volume 2D/3D, Mink 𝓜', () => {
  it('correctly provides Classic 1D category and family info', () => {
    const cat = getWingsComboCategory('Classic_1D');
    expect(cat.name).toBe('Classic 1D');
    expect(cat.theme).toBe('blue');

    const family = getLashFamilyInfo('Classic_1D');
    expect(family.familyKey).toBe('Classic');
    expect(family.siblings).toHaveLength(1);
    expect(family.siblings[0].shortLabel).toBe('1D');
  });

  it('correctly provides Volume 2D and 3D categories and family info', () => {
    const cat2D = getWingsComboCategory('Volume_2D');
    expect(cat2D.name).toBe('Volume 2D');
    expect(cat2D.theme).toBe('teal');

    const cat3D = getWingsComboCategory('Volume_3D');
    expect(cat3D.name).toBe('Volume 3D');
    expect(cat3D.theme).toBe('teal');

    const family2D = getLashFamilyInfo('Volume_2D');
    expect(family2D.familyKey).toBe('Volume');
    expect(family2D.siblings).toHaveLength(2);
    expect(family2D.siblings[0].shortLabel).toBe('2D');
    expect(family2D.siblings[1].shortLabel).toBe('3D');
  });

  it('correctly isolates Flawless Mink 𝓜 as a distinct 100% real mink fur luxury family', () => {
    const catMink = getWingsComboCategory('FlawlessMink');
    expect(catMink.name).toContain('Flawless Mink');

    const familyMink = getLashFamilyInfo('FlawlessMink');
    expect(familyMink.familyKey).toBe('Mink');
    expect(familyMink.siblings).toHaveLength(1);
    expect(familyMink.siblings[0].shortLabel).toBe('Mink 𝓜');
  });

  it('matches Classic vs Volume vs Mink correctly from booking details', () => {
    const classicMatch = matchComboCategoryAndVolumeFromBooking({
      serviceName: 'Classic 1D Tự Nhiên',
      volume: '1D',
    });
    expect(classicMatch.categoryId).toBe('Classic_1D');

    const volumeMatch = matchComboCategoryAndVolumeFromBooking({
      serviceName: 'Volume 3D Dày Đậm',
      volume: '3D',
    });
    expect(volumeMatch.categoryId).toBe('Volume_3D');

    const minkMatch = matchComboCategoryAndVolumeFromBooking({
      serviceName: 'Flawless Mink Cao Cấp',
    });
    expect(minkMatch.categoryId).toBe('FlawlessMink');
  });

  it('generates combo packages with VIP 20 for all categories', () => {
    const classicPkgs = getComboPackagesForCategoryAndVolume({
      categoryId: 'Classic_1D',
      volume: 550,
      includeVvipPass: true,
    });
    expect(classicPkgs.some((p) => p.packageKind === 'vvip_pass')).toBe(true);

    const volumePkgs = getComboPackagesForCategoryAndVolume({
      categoryId: 'Volume_2D',
      volume: 660,
      includeVvipPass: true,
    });
    expect(volumePkgs.some((p) => p.packageKind === 'vvip_pass')).toBe(true);
  });
});
