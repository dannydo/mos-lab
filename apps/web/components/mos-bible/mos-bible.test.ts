import { describe, expect, it } from 'vitest';
import { filterMosBibleCommandments, getMosBibleCommandmentsForPath, MOS_BIBLE_COMMANDMENTS } from '@mos-lab/shared';

describe('Kinh Thánh mOS contextual registry', () => {
  it('suggests Booker and Missed commandments on the Booker dashboard', () => {
    const ids = getMosBibleCommandmentsForPath('/dashboard/bk?tab=booking').map((item) => item.id);

    expect(ids).toContain('BK-001');
    expect(ids).toContain('BK-002');
    expect(ids).not.toContain('CAT-001');
  });

  it('inherits global commandments on every dashboard route', () => {
    const ids = getMosBibleCommandmentsForPath('/dashboard/catalog').map((item) => item.id);

    expect(ids).toContain('MOS-001');
    expect(ids).toContain('UI-001');
    expect(ids).toContain('CAT-001');
  });

  it('shows privileged account-switch rules on the Staff screen', () => {
    const ids = getMosBibleCommandmentsForPath('/dashboard/staff').map((item) => item.id);

    expect(ids).toContain('PEOPLE-002');
  });

  it('searches Vietnamese terms without tones', () => {
    const results = filterMosBibleCommandments(MOS_BIBLE_COMMANDMENTS, 'khong dau');

    expect(results.map((item) => item.id)).toContain('UI-001');
  });
});
