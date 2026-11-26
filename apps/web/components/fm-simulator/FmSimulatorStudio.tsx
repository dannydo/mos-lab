'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen } from 'lucide-react';
import { isAdminOrSuperAdminRole } from '@mos-lab/shared';
import { AppleSimulatorShell, type StudioTabItem } from './AppleSimulatorShell';
import { FmCockpitView, type FmPresetKey } from './FmCockpitView';
import { RulesBlueprintView } from './RulesBlueprintView';
import {
  BRANCH_SPECS,
  DEFAULT_SIMULATOR_INPUT,
  SimulatorInput,
  createMetricsForUniformStar,
  createUniformStars,
  simulateFm,
} from './fm-simulator.engine';

type FmTab = 'cockpit' | 'rules';

const FM_TABS: readonly StudioTabItem<FmTab>[] = [
  {
    id: 'cockpit',
    label: 'Mô Phỏng FM',
    shortLabel: 'Mô phỏng',
    icon: <Award className="h-4 w-4" />,
  },
  {
    id: 'rules',
    label: 'Quy Chế FM',
    shortLabel: 'Quy chế',
    icon: <BookOpen className="h-4 w-4" />,
  },
];

export function FmSimulatorStudio({
  standaloneMobile = false,
  embedded = false,
}: {
  readonly standaloneMobile?: boolean;
  readonly embedded?: boolean;
}) {
  const [input, setInput] = useState<SimulatorInput>(DEFAULT_SIMULATOR_INPUT);
  const [activeTab, setActiveTab] = useState<FmTab>('cockpit');
  const [canViewPnl, setCanViewPnl] = useState(false);

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('mos_user');
      if (!rawUser) return;
      const parsed = JSON.parse(rawUser) as { role?: string | null };
      setCanViewPnl(isAdminOrSuperAdminRole(parsed?.role));
    } catch {
      setCanViewPnl(false);
    }
  }, []);

  const fmResult = useMemo(() => simulateFm(input), [input]);
  const spec = BRANCH_SPECS[input.branch];

  const handleChange = (patch: Partial<SimulatorInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
  };

  const handleApplyPreset = (preset: FmPresetKey) => {
    setInput((prev) => {
      if (preset === 'dt-2star') {
        return {
          ...DEFAULT_SIMULATOR_INPUT,
          pillarMetrics: createMetricsForUniformStar(2, DEFAULT_SIMULATOR_INPUT.cvs),
          pillarMaxRewards: prev.pillarMaxRewards,
        };
      }
      if (preset === 'dt-3star') {
        return {
          ...DEFAULT_SIMULATOR_INPUT,
          branch: 'dt',
          revVnd: 800_000_000,
          cvs: 16,
          autonomyPct: 60,
          cvllKeyholders: 2,
          stars: createUniformStars(3),
          pillarMetrics: createMetricsForUniformStar(3, 16),
          pillarMaxRewards: prev.pillarMaxRewards,
        };
      }
      if (preset === 'ep-1fm') {
        return {
          ...DEFAULT_SIMULATOR_INPUT,
          branch: 'ep',
          revVnd: BRANCH_SPECS.ep.presetDefaultRev,
          cvs: BRANCH_SPECS.ep.presetDefaultCvs,
          autonomyPct: 50,
          cvllKeyholders: 1,
          stars: createUniformStars(2),
          pillarMetrics: createMetricsForUniformStar(2, BRANCH_SPECS.ep.presetDefaultCvs),
          pillarMaxRewards: prev.pillarMaxRewards,
        };
      }
      return {
        ...DEFAULT_SIMULATOR_INPUT,
        branch: 'dt',
        revVnd: 340_000_000,
        cvs: 8,
        autonomyPct: 25,
        cvllKeyholders: 0,
        stars: { ...createUniformStars(1), autonomy: 0 },
        pillarMetrics: createMetricsForUniformStar(1, 8),
        pillarMaxRewards: prev.pillarMaxRewards,
      };
    });
  };

  return (
    <AppleSimulatorShell<FmTab>
      title="Mô Phỏng Lương FM 7★"
      subtitle={`${spec.name} · ${input.cvs} CV · ${fmResult.fmCount} FM`}
      standaloneMobile={standaloneMobile}
      embedded={embedded}
      mobileHref="/fm-simulator"
      peerLink={!embedded && canViewPnl ? { href: '/dashboard/pnl-simulator', label: 'P&L Studio' } : undefined}
      tabs={FM_TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onReset={() => setInput(DEFAULT_SIMULATOR_INPUT)}
      renderPanel={(compact) =>
        activeTab === 'cockpit' ? (
          <FmCockpitView
            input={input}
            fm={fmResult}
            compact={compact}
            onChange={handleChange}
            onApplyPreset={handleApplyPreset}
          />
        ) : (
          <RulesBlueprintView compact={compact} mode="fm" />
        )
      }
    />
  );
}
