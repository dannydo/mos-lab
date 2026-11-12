import type { WingsMenuItemMeta } from './constraintTypesAndOptions';
import { lookupClassicVolumeAndMinkMenu } from './wingsMenuClassicAndMink';
import { lookupLightSeriesMenu } from './wingsMenuLightSeries';

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

  return lookupClassicVolumeAndMinkMenu(mid, cNum) || lookupLightSeriesMenu(mid, cNum, v);
}
