'use client';

import { useParams } from 'next/navigation';
import { Presentation } from 'lucide-react';
import { AppIcon, FeaturePage, StatePanel } from '~/components/ui';
import { computeLiveControlTimers } from './live-page-modules/live-control-constants';
import { useWorkshopLiveControl } from './live-page-modules/useWorkshopLiveControl';
import { LiveControlHeaderActions } from './live-page-modules/LiveControlHeaderActions';
import { LiveControlMetrics } from './live-page-modules/LiveControlMetrics';
import { LiveControlAgendaSection } from './live-page-modules/LiveControlAgendaSection';
import { LiveControlGameSection } from './live-page-modules/LiveControlGameSection';

export default function WorkshopLiveControlPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(String(params.slug || ''));
  const {
    detail,
    state,
    receivedAt,
    connected,
    busy,
    error,
    agendaCommand,
    seedQuiz,
    repairSampleQuiz,
    gameCommand,
    toggleLeaderboardQr,
  } = useWorkshopLiveControl(slug);

  if (error) return <StatePanel kind="error" title={error} />;
  if (!detail || !state) return <StatePanel kind="loading" title="Đang kết nối Live Control…" />;

  const timers = computeLiveControlTimers(state, receivedAt);

  return (
    <FeaturePage
      title={`Live Control · ${detail.name}`}
      subtitle="Host commands qua REST transaction; WebSocket chỉ broadcast snapshot để reconnect an toàn."
      icon={<AppIcon icon={Presentation} />}
      tag={detail.displayCode ? `Mã ${detail.displayCode}` : undefined}
      headerActions={
        <LiveControlHeaderActions
          detail={detail}
          showJoinQrOnDisplay={state.showJoinQrOnDisplay}
          connected={connected}
          busy={busy}
          onToggleLeaderboardQr={toggleLeaderboardQr}
        />
      }
    >
      <LiveControlMetrics state={state} />

      <div className="grid gap-4 2xl:grid-cols-[1.15fr_1fr]">
        <LiveControlAgendaSection
          activeAgendaItem={state.activeAgendaItem}
          agenda={state.agenda ?? detail.agenda}
          agendaRemaining={timers.agendaRemaining}
          busy={busy}
          onAgendaCommand={agendaCommand}
        />

        <LiveControlGameSection
          activeQuiz={state.activeQuiz}
          activeQuestion={state.activeQuestion}
          connectedParticipantCount={state.connectedParticipantCount}
          gameLeaderboard={state.gameLeaderboard}
          timers={timers}
          busy={busy}
          onSeedQuiz={seedQuiz}
          onRepairSampleQuiz={repairSampleQuiz}
          onGameCommand={gameCommand}
        />
      </div>
    </FeaturePage>
  );
}
