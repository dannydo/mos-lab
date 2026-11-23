'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { DEFAULT_TRAINING_OVERRIDES } from './sandboxDefaults';
import type { SimulatedLogAction, StaffTrainingOverride, TodaySandboxMode } from './sandboxTypes';

interface UseTrainingSimulationParams {
  mode: TodaySandboxMode;
  logAction: (type: SimulatedLogAction['type'], msg: string) => void;
}

export function useTrainingSimulation({ mode, logAction }: UseTrainingSimulationParams) {
  const [staffOverrides, setStaffOverrides] =
    useState<Record<string, StaffTrainingOverride>>(DEFAULT_TRAINING_OVERRIDES);
  const [nowTickMs, setNowTickMs] = useState<number>(() => Date.now());

  const hasRunningTimer = useMemo(
    () => mode === 'training' && Object.values(staffOverrides).some((item) => Boolean(item.timerStartedAt)),
    [mode, staffOverrides]
  );

  useEffect(() => {
    if (!hasRunningTimer) return undefined;
    const timer = setInterval(() => {
      setNowTickMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [hasRunningTimer]);

  const formatStaffTimerMMSS = useCallback(
    (staffName: string) => {
      const ov = staffOverrides[staffName];
      if (!ov?.timerStartedAt) {
        const mins = ov?.timerElapsedMinutes || 0;
        return `${String(mins).padStart(2, '0')}:00`;
      }
      const totalSeconds = Math.max(0, Math.floor((nowTickMs - ov.timerStartedAt) / 1000));
      const mm = Math.floor(totalSeconds / 60);
      const ss = totalSeconds % 60;
      return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    },
    [nowTickMs, staffOverrides]
  );

  const simulateStaffCheckIn = useCallback(
    (staffName: string, role: 'CV' | 'CC' = 'CV') => {
      setStaffOverrides((prev) => ({
        ...prev,
        [staffName]: {
          ...(prev[staffName] || {}),
          attendance: 'checked_in',
          status: 'available',
          doing: role === 'CV' ? 'Sẵn sàng nhận khách' : 'Đang đón tiếp khách tại sảnh',
          timerStartedAt: null,
          timerElapsedMinutes: 0,
        },
      }));
      logAction('CHECK_IN', `[Training] Đã giả lập Check-in cho ${role} ${staffName}`);
      message.success(`[Training] Đã giả lập Check-in cho ${staffName}`);
    },
    [logAction]
  );

  const simulateStaffCheckOut = useCallback(
    (staffName: string, role: 'CV' | 'CC' = 'CV') => {
      setStaffOverrides((prev) => ({
        ...prev,
        [staffName]: {
          ...(prev[staffName] || {}),
          attendance: 'checked_out',
          status: 'available',
          doing: 'Đã hoàn tất ca & check-out',
          timerStartedAt: null,
          timerElapsedMinutes: 0,
        },
      }));
      logAction('CHECK_OUT', `[Training] Đã giả lập Check-out kết ca cho ${role} ${staffName}`);
      message.info(`[Training] Đã giả lập Check-out cho ${staffName}`);
    },
    [logAction]
  );

  const simulateStaffStartTimer = useCallback(
    (staffName: string, serviceName = 'Nối Mi Classic Thiết Kế (60p)', estimatedMinutes = 60) => {
      const now = Date.now();
      setStaffOverrides((prev) => {
        const cur = prev[staffName] || {};
        return {
          ...prev,
          [staffName]: {
            ...cur,
            attendance: 'checked_in',
            status: 'busy',
            doing: `Đang làm ${serviceName} (Bấm giờ 0/${estimatedMinutes}p)`,
            timerStartedAt: now,
            timerElapsedMinutes: 0,
            timerService: serviceName,
            clientsIncrement: (cur.clientsIncrement || 0) + 1,
          },
        };
      });
      logAction('START_TIMER', `[Training] Bắt đầu bấm giờ phục vụ cho ${staffName} (${serviceName})`);
      message.success(`[Training] Đang bấm giờ phục vụ cho ${staffName} — ${serviceName}`);
    },
    [logAction]
  );

  const simulateStaffStopTimer = useCallback(
    (staffName: string) => {
      setStaffOverrides((prev) => {
        const cur = prev[staffName] || {};
        return {
          ...prev,
          [staffName]: {
            ...cur,
            status: 'available',
            doing: 'Vừa hoàn tất phục vụ (Đã check-out khách)',
            timerStartedAt: null,
            timerElapsedMinutes: 0,
            doneIncrement: (cur.doneIncrement || 0) + 1,
          },
        };
      });
      logAction('STOP_TIMER', `[Training] Hoàn tất phục vụ & check-out khách cho ${staffName}`);
      message.success(`[Training] Hoàn tất phục vụ cho ${staffName}`);
    },
    [logAction]
  );

  const simulateBatchCheckInAll = useCallback(
    (role: 'CV' | 'CC' | 'ALL' = 'ALL') => {
      setStaffOverrides((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((name) => {
          if (role === 'ALL' || (role === 'CV' && name.startsWith('CV')) || (role === 'CC' && name.startsWith('CC'))) {
            if (updated[name].attendance !== 'checked_out') {
              updated[name] = {
                ...updated[name],
                attendance: 'checked_in',
                status: 'available',
                doing: name.startsWith('CV') ? 'Sẵn sàng nhận khách' : 'Đang đón tiếp tại sảnh',
              };
            }
          }
        });
        return updated;
      });
      logAction('CHECK_IN', '[Training] Đã giả lập Check-in đồng loạt cho toàn bộ nhân sự ca');
      message.success('[Training] Đã check-in đồng loạt cho nhân sự');
    },
    [logAction]
  );

  const simulateBatchStartAllTimers = useCallback(() => {
    const now = Date.now();
    setStaffOverrides((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((name) => {
        if (name.startsWith('CV') && updated[name].attendance === 'checked_in') {
          updated[name] = {
            ...updated[name],
            status: 'busy',
            doing: 'Đang làm mi Volume 5D (Bấm giờ đồng loạt)',
            timerStartedAt: now,
            timerElapsedMinutes: 15,
            timerService: 'Nối Mi Volume 5D',
            clientsIncrement: (updated[name].clientsIncrement || 0) + 1,
          };
        }
      });
      return updated;
    });
    logAction('START_TIMER', '[Training] Giả lập bấm giờ đồng loạt cho tất cả giường phục vụ');
    message.success('[Training] Đã bấm giờ đồng loạt cho các giường');
  }, [logAction]);

  const resetTrainingState = useCallback(() => {
    setStaffOverrides(DEFAULT_TRAINING_OVERRIDES);
    logAction('RESET', '[Training] Đã khôi phục trạng thái chấm công & bấm giờ về kịch bản mẫu');
    message.info('[Training] Đã reset phòng tập check-in/bấm giờ');
  }, [logAction]);

  return {
    staffOverrides,
    nowTickMs,
    formatStaffTimerMMSS,
    simulateStaffCheckIn,
    simulateStaffCheckOut,
    simulateStaffStartTimer,
    simulateStaffStopTimer,
    simulateBatchCheckInAll,
    simulateBatchStartAllTimers,
    resetTrainingState,
  };
}
