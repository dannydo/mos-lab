import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CAREER_PROGRESSION_CONFIG } from '../../types/career-progression/career-defaults.js';
import { MOS_BIBLE_COMMANDMENTS } from '../mos-bible.js';
import { hydrateMosBibleCommandmentsWithCareerConfig, LIVE_CAREER_BIBLE_IDS } from './hydrate-career-commandments.js';

describe('hydrateMosBibleCommandmentsWithCareerConfig', () => {
  it('hydrates CV-004 with default 100/0 CVLL rules and 30% x 2 consecutive months', () => {
    const hydrated = hydrateMosBibleCommandmentsWithCareerConfig(
      MOS_BIBLE_COMMANDMENTS,
      DEFAULT_CAREER_PROGRESSION_CONFIG
    );
    const cv004 = hydrated.find((c) => c.id === 'CV-004');
    assert.ok(cv004, 'CV-004 commandment must exist');
    assert.equal(LIVE_CAREER_BIBLE_IDS.has('CV-004'), true);
    assert.match(cv004.summary, /29\.500đ\/h/);
    assert.match(cv004.summary, /100% Combo/);
    assert.match(cv004.summary, /30%/);
    assert.match(cv004.summary, /2 tháng liên tiếp/);
    assert.match(cv004.commandments[0], /330 bộ mi/);
    assert.match(cv004.commandments[4], /Miễn Trừ Mẫu Số/);
    assert.match(cv004.commandments[5], /Bắt Buộc Đi Tua/);
  });

  it('dynamically updates CV-002 and CV-004 text when live admin config changes', () => {
    const customConfig = {
      ...DEFAULT_CAREER_PROGRESSION_CONFIG,
      updatedAt: '2026-11-26T00:00:00.000Z',
      cvToCvPlus: {
        ...DEFAULT_CAREER_PROGRESSION_CONFIG.cvToCvPlus,
        hourlyWage: 28000,
        minSelfComboRate: 0.22,
      },
      cvPlusToCvPlusPlus: {
        ...DEFAULT_CAREER_PROGRESSION_CONFIG.cvPlusToCvPlusPlus,
        hourlyWage: 31000,
        minOrders: 360,
        promotionMinComboRate: 0.35,
        promotionConsecutiveMonths: 3,
        minSelfComboRate: 0.25,
        crossConsultCvShareRate: 0.1,
        exemptCvlDenominatorOnCrossConsult: false,
        enforceMandatoryOwnQueue: false,
      },
    };

    const hydrated = hydrateMosBibleCommandmentsWithCareerConfig(MOS_BIBLE_COMMANDMENTS, customConfig);
    const cv002 = hydrated.find((c) => c.id === 'CV-002');
    const cv004 = hydrated.find((c) => c.id === 'CV-004');

    assert.ok(cv002 && cv004);
    assert.match(cv002.summary, /28\.000đ\/h/);
    assert.match(cv002.summary, /22%/);
    assert.match(cv004.summary, /31\.000đ\/h/);
    assert.match(cv004.summary, /35%/);
    assert.match(cv004.summary, /3 tháng liên tiếp/);
    assert.match(cv004.commandments[0], /360 bộ mi/);
    assert.match(cv004.commandments[2], /90%\/10%/);
    assert.match(cv004.commandments[4], /Đang Tắt Miễn Trừ/);
    assert.match(cv004.commandments[5], /Đang Tắt Khóa Bắt Buộc/);
    assert.match(cv004.commandments[6], /≥ 25% Combo/);
    assert.equal(cv004.effectiveFrom, '2026-11-26');
  });

  it('hydrates FM-001 with default 3-tier FM Floor Farm rules and 1-3★ pillar caps', () => {
    const hydrated = hydrateMosBibleCommandmentsWithCareerConfig(
      MOS_BIBLE_COMMANDMENTS,
      DEFAULT_CAREER_PROGRESSION_CONFIG
    );
    const fm001 = hydrated.find((c) => c.id === 'FM-001');
    assert.ok(fm001, 'FM-001 commandment must exist');
    assert.equal(LIVE_CAREER_BIBLE_IDS.has('FM-001'), true);
    assert.match(fm001.summary, /8\.000\.000đ/);
    assert.match(fm001.summary, /9\.000\.000đ/);
    assert.match(fm001.summary, /10\.000\.000đ/);
    assert.match(fm001.summary, /5★/);
    assert.match(fm001.summary, /≤ 1 sâu/);
    assert.match(fm001.summary, /0\.5%/);
    assert.match(fm001.summary, /6 ca tư vấn/);
    assert.match(fm001.commandments[1], /1\.5×/);
    assert.match(fm001.commandments[1], /> 12 CV/);
    assert.match(fm001.commandments[1], /13 CV/);
    assert.match(fm001.commandments[3], /≤ 3%/);
    assert.match(fm001.commandments[3], /≤ 2%/);
    assert.match(fm001.commandments[3], /≤ 1%/);
    assert.match(fm001.commandments[6], /-200\.000đ\/con/);
    assert.match(fm001.commandments[8], /≥ 50% CVL\/CVLL/);
  });

  it('dynamically updates FM-001 text when live fmFloorFarm admin config changes', () => {
    const customConfig = {
      ...DEFAULT_CAREER_PROGRESSION_CONFIG,
      updatedAt: '2026-11-27T00:00:00.000Z',
      fmFloorFarm: {
        ...DEFAULT_CAREER_PROGRESSION_CONFIG.fmFloorFarm!,
        fm1BaseSalary: 8_500_000,
        fm3BaseSalary: 10_500_000,
        gmaps3StarBonus: 1_500_000,
        falMaxRate3Star: 0.004,
        mapsWormLate24hPenalty: 250_000,
        gmapsAllowButterflyRedemption: false,
        consultTipToFunFund: false,
        holidayAutopilotMinCvlRatio: 0.6,
      },
    };

    const hydrated = hydrateMosBibleCommandmentsWithCareerConfig(MOS_BIBLE_COMMANDMENTS, customConfig);
    const fm001 = hydrated.find((c) => c.id === 'FM-001');

    assert.ok(fm001);
    assert.match(fm001.summary, /8\.500\.000đ/);
    assert.match(fm001.summary, /10\.500\.000đ/);
    assert.match(fm001.summary, /3\.800\.000đ/);
    assert.match(fm001.summary, /0\.4%/);
    assert.match(fm001.commandments[2], /đang tắt Sâu Hóa Bướm/);
    assert.match(fm001.commandments[5], /cấu hình lương hiện hành/);
    assert.match(fm001.commandments[6], /-250\.000đ\/con/);
    assert.match(fm001.commandments[8], /≥ 60% CVL\/CVLL/);
    assert.equal(fm001.effectiveFrom, '2026-11-27');
  });
});
