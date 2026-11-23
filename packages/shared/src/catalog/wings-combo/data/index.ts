import type { WingsComboCategory, WingsComboCategoryId } from '../types.js';
import { classicVolumeCategory } from './classic-volume.data.js';
import { flawlessMinkCategory } from './flawless-mink.data.js';
import { hyperLight2xCategory } from './hyperlight-2x.data.js';
import { hyperLight3xCategory } from './hyperlight-3x.data.js';
import { hyperLight4xCategory } from './hyperlight-4x.data.js';
import { hyperLight5xCategory } from './hyperlight-5x.data.js';
import { ivyLight3lCategory } from './ivylight-3l.data.js';
import { ivyLight4lCategory } from './ivylight-4l.data.js';
import { ivyLight5lCategory } from './ivylight-5l.data.js';
import { ultraLight3dCategory } from './ultralight-3d.data.js';
import { ultraLight4dCategory } from './ultralight-4d.data.js';
import { ultraLight5dCategory } from './ultralight-5d.data.js';
import { classic1DCat, volume2DCat, volume3DCat, vvipCategory } from './vvip-and-derived.data.js';

export const WINGS_COMBO_CATEGORIES: WingsComboCategory[] = [
  classicVolumeCategory,
  flawlessMinkCategory,
  hyperLight2xCategory,
  hyperLight3xCategory,
  hyperLight4xCategory,
  hyperLight5xCategory,
  ivyLight3lCategory,
  ivyLight4lCategory,
  ivyLight5lCategory,
  ultraLight3dCategory,
  ultraLight4dCategory,
  ultraLight5dCategory,
  vvipCategory,
  classic1DCat,
  volume2DCat,
  volume3DCat,
];

export function getWingsComboCategory(categoryId: WingsComboCategoryId | string): WingsComboCategory {
  return (
    WINGS_COMBO_CATEGORIES.find((c) => c.id === categoryId) ||
    WINGS_COMBO_CATEGORIES.find((c) => c.id === 'FlawlessMink') ||
    WINGS_COMBO_CATEGORIES[0]
  );
}
