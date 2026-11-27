'use client';

import React, { useMemo, useState } from 'react';
import { BookOpen, SlidersHorizontal } from 'lucide-react';
import { AppleSimulatorShell, type StudioTabItem } from './AppleSimulatorShell';
import { FmGuideProvider } from './FmInfoGuideModal';
import { PnlCockpitView, type PnlPresetKey } from './PnlCockpitView';
import { RulesBlueprintView } from './RulesBlueprintView';
import {
  BRANCH_SPECS,
  DEFAULT_SIMULATOR_INPUT,
  SimulatorInput,
  createUniformStars,
  simulateBranchPnl,
  simulateFm,
} from './fm-simulator.engine';

type PnlTab = 'cockpit' | 'rules';

const PNL_TABS: readonly StudioTabItem<PnlTab>[] = [
  {
    id: 'cockpit',
    label: 'P&L Toàn Sàn',
    shortLabel: 'P&L Sàn',
    icon: <SlidersHorizontal className="h-4 w-4" />,
  },
  {
    id: 'rules',
    label: 'Cấu Trúc Chi Phí',
    shortLabel: 'Cấu trúc',
    icon: <BookOpen className="h-4 w-4" />,
  },
];

export function PnlSimulatorStudio({
  standaloneMobile = false,
  embedded = false,
}: {
  readonly standaloneMobile?: boolean;
  readonly embedded?: boolean;
}) {
  const [input, setInput] = useState<SimulatorInput>(DEFAULT_SIMULATOR_INPUT);
  const [starTier, setStarTier] = useState<0 | 1 | 2 | 3>(2);
  const [activeTab, setActiveTab] = useState<PnlTab>('cockpit');

  const fmResult = useMemo(() => simulateFm(input), [input]);
  const pnlResult = useMemo(() => simulateBranchPnl(input, fmResult), [input, fmResult]);
  const spec = BRANCH_SPECS[input.branch];

  const handleChange = (patch: Partial<SimulatorInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
  };

  const handleApplyPreset = (preset: PnlPresetKey) => {
    if (preset === 'dt-680') {
      setStarTier(2);
      setInput(DEFAULT_SIMULATOR_INPUT);
      return;
    }
    if (preset === 'dt-800') {
      setStarTier(3);
      setInput({
        ...DEFAULT_SIMULATOR_INPUT,
        branch: 'dt',
        revVnd: 800_000_000,
        cvs: 16,
        autonomyPct: 60,
        cvllKeyholders: 2,
        stars: createUniformStars(3),
      });
      return;
    }
    if (preset === 'ep-480') {
      setStarTier(2);
      setInput({
        ...DEFAULT_SIMULATOR_INPUT,
        branch: 'ep',
        revVnd: BRANCH_SPECS.ep.presetDefaultRev,
        cvs: BRANCH_SPECS.ep.presetDefaultCvs,
        autonomyPct: 50,
        cvllKeyholders: 1,
        newCustomers: 32,
        stars: createUniformStars(2),
      });
      return;
    }
    setStarTier(1);
    setInput({
      ...DEFAULT_SIMULATOR_INPUT,
      branch: 'dt',
      revVnd: 340_000_000,
      cvs: 8,
      autonomyPct: 25,
      cvllKeyholders: 0,
      newCustomers: 18,
      stars: { ...createUniformStars(1), autonomy: 0 },
    });
  };

  const handleReset = () => {
    setStarTier(2);
    setInput(DEFAULT_SIMULATOR_INPUT);
  };

  return (
    <FmGuideProvider>
      <AppleSimulatorShell<PnlTab>
        title="Mô Phỏng P&L Toàn Sàn"
        subtitle={`${spec.name} · ${input.cvs} CV · Thực tế T08–T10/2026`}
        standaloneMobile={standaloneMobile}
        embedded={embedded}
        mobileHref="/pnl-simulator"
        peerLink={embedded ? undefined : { href: '/dashboard/fm-simulator', label: 'FM Studio' }}
        tabs={PNL_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onReset={handleReset}
        renderPanel={(compact) =>
          activeTab === 'cockpit' ? (
            <PnlCockpitView
              input={input}
              fm={fmResult}
              pnl={pnlResult}
              starTier={starTier}
              compact={compact}
              onChange={handleChange}
              onChangeStarTier={setStarTier}
              onApplyPreset={handleApplyPreset}
            />
          ) : (
            <RulesBlueprintView compact={compact} mode="pnl" />
          )
        }
      />
    </FmGuideProvider>
  );
}
