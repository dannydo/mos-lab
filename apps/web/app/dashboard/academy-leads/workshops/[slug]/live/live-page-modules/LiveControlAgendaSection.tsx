'use client';

import { Button, Card, Popconfirm, Space } from 'antd';
import { CircleCheckBig, CirclePause, CirclePlay, Clock3, SkipForward } from 'lucide-react';
import type { AcademyWorkshopAgendaItem } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { formatAgendaExecutionText, formatAgendaTime, formatWorkshopClock } from '~/lib/academy-workshop-live';
import { AGENDA_STATUS_LABELS, cleanAgendaTitle, type AgendaCommandAction } from './live-control-constants';

export interface LiveControlAgendaSectionProps {
  activeAgendaItem: AcademyWorkshopAgendaItem | null;
  agenda: AcademyWorkshopAgendaItem[];
  agendaRemaining: number;
  busy: boolean;
  onAgendaCommand: (agendaItemId: number, action: AgendaCommandAction) => Promise<void> | void;
}

export function LiveControlAgendaSection({
  activeAgendaItem,
  agenda,
  agendaRemaining,
  busy,
  onAgendaCommand,
}: LiveControlAgendaSectionProps) {
  const heroToneClass =
    agendaRemaining < 0
      ? 'bg-red-500/10 dark:bg-red-500/15'
      : activeAgendaItem?.status === 'PAUSED'
        ? 'bg-amber-500/10 dark:bg-amber-500/15'
        : 'bg-[var(--mos-accent-soft)]';

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <AppIcon icon={Clock3} /> Agenda live
        </span>
      }
    >
      {activeAgendaItem && (
        <div className={`mb-4 rounded-2xl p-5 text-center transition-colors duration-300 ${heroToneClass}`}>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] opacity-65">
            {activeAgendaItem.status === 'PAUSED' ? 'Phần đang tạm dừng' : 'Phần đang chạy'}
          </div>
          <div className="mt-2 text-2xl font-bold">{cleanAgendaTitle(activeAgendaItem.title)}</div>
          <div className={`mt-3 text-6xl font-black tabular-nums ${agendaRemaining < 0 ? 'text-red-500' : ''}`}>
            {formatWorkshopClock(agendaRemaining)}
          </div>
          {agendaRemaining < 0 && <div className="mt-2 font-bold text-red-500">QUÁ GIỜ</div>}
          {activeAgendaItem.startedAt && (
            <div className="mt-2 text-xs opacity-75 tabular-nums">
              Bắt đầu lúc {formatAgendaTime(activeAgendaItem.startedAt)} · Kế hoạch{' '}
              {Math.round(activeAgendaItem.plannedDurationSeconds / 60)} phút
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {activeAgendaItem.status === 'RUNNING' && (
              <Button
                size="large"
                icon={<AppIcon icon={CirclePause} />}
                loading={busy}
                onClick={() => void onAgendaCommand(activeAgendaItem.id, 'PAUSE')}
              >
                Tạm dừng
              </Button>
            )}
            {activeAgendaItem.status === 'PAUSED' && (
              <Button
                size="large"
                type="primary"
                icon={<AppIcon icon={CirclePlay} />}
                loading={busy}
                onClick={() => void onAgendaCommand(activeAgendaItem.id, 'RESUME')}
              >
                Tiếp tục
              </Button>
            )}
            <Popconfirm
              title="Hoàn thành phần này?"
              description="Timeline sẽ chốt thời lượng thực tế và không tự chuyển sang phần kế tiếp."
              okText="Hoàn thành"
              cancelText="Chưa"
              onConfirm={() => void onAgendaCommand(activeAgendaItem.id, 'COMPLETE')}
            >
              <Button
                size="large"
                type="primary"
                icon={<AppIcon icon={CircleCheckBig} />}
                loading={busy}
                className="font-semibold"
              >
                Hoàn thành
              </Button>
            </Popconfirm>
            <Popconfirm
              title="Bỏ qua phần đang chạy này?"
              description="Phần này sẽ dừng ngay và được ghi nhận là đã bỏ qua trong timeline."
              okText="Bỏ qua ngay"
              cancelText="Chưa"
              okButtonProps={{ danger: true }}
              onConfirm={() => void onAgendaCommand(activeAgendaItem.id, 'SKIP')}
            >
              <Button size="large" danger icon={<AppIcon icon={SkipForward} />} loading={busy}>
                Bỏ qua phần này
              </Button>
            </Popconfirm>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {agenda.map((item) => {
          const executionText = formatAgendaExecutionText(item, true);
          return (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-inherit p-3"
            >
              <div className="min-w-0 flex-1">
                <strong>
                  {item.sortOrder}. {cleanAgendaTitle(item.title)}
                </strong>
                {executionText ? (
                  <div className="mt-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {executionText}
                  </div>
                ) : item.status === 'RUNNING' && item.startedAt ? (
                  <div className="mt-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 tabular-nums">
                    Bắt đầu lúc {formatAgendaTime(item.startedAt)} · Đang diễn ra (
                    {Math.round(item.plannedDurationSeconds / 60)} phút dự kiến)
                  </div>
                ) : item.status === 'PAUSED' && item.startedAt ? (
                  <div className="mt-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                    Bắt đầu lúc {formatAgendaTime(item.startedAt)} · Đang tạm dừng
                  </div>
                ) : (
                  <div className="mt-0.5 text-xs opacity-60 tabular-nums">
                    {Math.round(item.plannedDurationSeconds / 60)} phút · {AGENDA_STATUS_LABELS[item.status]}
                  </div>
                )}
              </div>
              <Space wrap className="justify-end">
                {item.status === 'PENDING' && (
                  <Button
                    type="primary"
                    icon={<AppIcon icon={CirclePlay} />}
                    loading={busy}
                    onClick={() => void onAgendaCommand(item.id, 'START')}
                  >
                    Bắt đầu
                  </Button>
                )}
                {item.status === 'RUNNING' && (
                  <Button
                    icon={<AppIcon icon={CirclePause} />}
                    loading={busy}
                    onClick={() => void onAgendaCommand(item.id, 'PAUSE')}
                  >
                    Tạm dừng
                  </Button>
                )}
                {item.status === 'PAUSED' && (
                  <Button
                    icon={<AppIcon icon={CirclePlay} />}
                    loading={busy}
                    onClick={() => void onAgendaCommand(item.id, 'RESUME')}
                  >
                    Tiếp tục
                  </Button>
                )}
                {['RUNNING', 'PAUSED'].includes(item.status) && (
                  <Popconfirm
                    title="Hoàn thành phần này?"
                    description="Timeline sẽ chốt thời lượng thực tế và không tự chuyển sang phần kế tiếp."
                    okText="Hoàn thành"
                    cancelText="Chưa"
                    onConfirm={() => void onAgendaCommand(item.id, 'COMPLETE')}
                  >
                    <Button
                      type="primary"
                      icon={<AppIcon icon={CircleCheckBig} />}
                      loading={busy}
                      className="font-semibold"
                    >
                      Hoàn thành phần này
                    </Button>
                  </Popconfirm>
                )}
                {['PENDING', 'RUNNING', 'PAUSED'].includes(item.status) && (
                  <Popconfirm
                    title="Bỏ qua phần này?"
                    description="Phần này sẽ được ghi nhận là đã bỏ qua trong timeline."
                    okText="Bỏ qua"
                    cancelText="Chưa"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => void onAgendaCommand(item.id, 'SKIP')}
                  >
                    <Button danger type="text" icon={<AppIcon icon={SkipForward} />} loading={busy}>
                      Bỏ qua
                    </Button>
                  </Popconfirm>
                )}
                {item.status === 'COMPLETED' && <StatusTag status="success" label="Đã hoàn thành" />}
                {item.status === 'SKIPPED' && <StatusTag status="default" label="Đã bỏ qua" />}
              </Space>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
