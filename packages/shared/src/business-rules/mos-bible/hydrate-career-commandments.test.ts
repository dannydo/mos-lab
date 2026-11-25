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
});
