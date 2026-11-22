'use client';

import React from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { Modal, Input, Select, DatePicker, Switch, message as antdMessage, type GlobalToken } from 'antd';
import { AlarmClockPlus, Archive, Calendar, CalendarClock, Check, Clock, Handshake, Pencil, X } from 'lucide-react';
import {
  removeVietnameseTones,
  type MosChatMessage,
  type MosChatStaffMember,
  type MosChatTaskItem,
  type SafeAny,
} from '@mos-lab/shared';
import { DEADLINE_PRESETS, REMINDER_PRESETS } from '../constants/chat-constants';

export interface MosChatTaskModalProps {
  isMobile: boolean;
  token: GlobalToken;
  surfaceRaised: string;
  borderColor: string;
  renderUserAvatarNode: (props: SafeAny) => React.ReactNode;
  staffDirectory: MosChatStaffMember[];
  taskModalOpen: boolean;
  setTaskModalOpen: (open: boolean) => void;
  editingTask: MosChatTaskItem | null;
  setEditingTask: (t: MosChatTaskItem | null) => void;
  taskModalSourceMsg: MosChatMessage | null;
  taskTitle: string;
  setTaskTitle: (val: string) => void;
  taskDoneState: boolean;
  setTaskDoneState: (val: boolean) => void;
  taskArchivedState: boolean;
  setTaskArchivedState: (val: boolean) => void;
  taskAssignee: string;
  setTaskAssignee: (val: string) => void;
  assigneeOptions: Array<{ label: string; value: string; staffId?: number }>;
  taskPriority: 'URGENT' | 'HIGH' | 'NORMAL';
  setTaskPriority: (p: SafeAny) => void;
  taskDeadline: Dayjs | null;
  setTaskDeadline: (d: Dayjs | null) => void;
  taskDeadlineMode: 'none' | 'preset' | 'custom';
  setTaskDeadlineMode: (m: SafeAny) => void;
  selectedDeadlinePresetId: string;
  setSelectedDeadlinePresetId: (id: string) => void;
  taskNegotiatedDeadline?: Dayjs | null;
  setTaskNegotiatedDeadline?: (d: Dayjs | null) => void;
  taskNegotiationNote?: string;
  setTaskNegotiationNote?: (n: string) => void;
  taskRemindMode: 'preset' | 'custom';
  setTaskRemindMode: (m: SafeAny) => void;
  selectedPresetId: string;
  setSelectedPresetId: (id: string) => void;
  setTaskRemindSeconds: (sec: number) => void;
  customRemindDate: Dayjs | null;
  setCustomRemindDate: (d: Dayjs | null) => void;
  handleConfirmCreateTask: () => Promise<void> | void;
}

export const MosChatTaskModal: React.FC<MosChatTaskModalProps> = ({
  isMobile,
  token,
  surfaceRaised,
  borderColor,
  renderUserAvatarNode,
  staffDirectory,
  taskModalOpen,
  setTaskModalOpen,
  editingTask,
  setEditingTask,
  taskModalSourceMsg,
  taskTitle,
  setTaskTitle,
  taskDoneState,
  setTaskDoneState,
  taskArchivedState,
  setTaskArchivedState,
  taskAssignee,
  setTaskAssignee,
  assigneeOptions,
  taskPriority,
  setTaskPriority,
  taskDeadline,
  setTaskDeadline,
  taskDeadlineMode,
  setTaskDeadlineMode,
  selectedDeadlinePresetId,
  setSelectedDeadlinePresetId,
  taskNegotiatedDeadline,
  setTaskNegotiatedDeadline,
  taskNegotiationNote,
  setTaskNegotiationNote,
  taskRemindMode,
  setTaskRemindMode,
  selectedPresetId,
  setSelectedPresetId,
  setTaskRemindSeconds,
  customRemindDate,
  setCustomRemindDate,
  handleConfirmCreateTask,
}) => {
  return (
    <Modal
      className="mos-chat-theme-scope"
      open={taskModalOpen}
      zIndex={1350}
      onCancel={() => {
        setTaskModalOpen(false);
        setEditingTask(null);
      }}
      onOk={handleConfirmCreateTask}
      okText={
        editingTask
          ? 'Lưu thay đổi'
          : taskRemindMode === 'preset' && selectedPresetId === 'none'
            ? 'Lưu Task'
            : 'Lưu & Hẹn giờ'
      }
      cancelText="Hủy"
      title={
        <span className="flex items-center gap-2 text-[14px] font-bold">
          {editingTask ? (
            <>
              <Pencil size={16} className="text-amber-500" />
              <span>Chỉnh Sửa Công Việc</span>
            </>
          ) : (
            <>
              <AlarmClockPlus size={16} className="text-amber-500" />
              <span>Giao Task & Hẹn Giờ Nhắc</span>
            </>
          )}
        </span>
      }
      width={isMobile ? 'calc(100vw - 24px)' : 440}
    >
      <div className="space-y-3 py-1">
        {taskModalSourceMsg && (
          <div
            className="p-2 rounded-lg text-[11.5px]"
            style={{ background: surfaceRaised, borderLeft: '3px solid #d4a84b' }}
          >
            <strong>{taskModalSourceMsg.senderName}:</strong> &ldquo;{taskModalSourceMsg.text}&rdquo;
          </div>
        )}

        <div>
          <div className="text-[11px] font-bold text-slate-400 mb-1">Tên công việc</div>
          <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
        </div>

        {editingTask && (
          <div
            className="p-2.5 rounded-lg space-y-2.5"
            style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
          >
            <div className="text-[11px] font-bold text-slate-400">Trạng thái công việc</div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] flex items-center gap-2 font-medium">
                <Check size={14} className={taskDoneState ? 'text-emerald-400' : 'text-slate-400'} />
                <span>Đã hoàn thành</span>
              </span>
              <Switch checked={taskDoneState} onChange={(checked) => setTaskDoneState(checked)} size="small" />
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
              <span className="text-[12px] flex items-center gap-2 font-medium">
                <Archive size={14} className={taskArchivedState ? 'text-amber-400' : 'text-slate-400'} />
                <span>Lưu trữ (Archived)</span>
              </span>
              <Switch checked={taskArchivedState} onChange={(checked) => setTaskArchivedState(checked)} size="small" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-1">
              Người phụ trách <span className="text-rose-400">*</span>
            </div>
            <Select
              className="w-full"
              value={taskAssignee || undefined}
              onChange={(val) => setTaskAssignee(val || '')}
              options={assigneeOptions}
              showSearch
              allowClear
              loading={assigneeOptions.length === 0}
              notFoundContent={
                assigneeOptions.length === 0 ? 'Đang tải danh sách nhân sự...' : 'Không tìm thấy nhân sự'
              }
              getPopupContainer={(trigger) => trigger?.parentElement || document.body}
              dropdownStyle={{ zIndex: 1400 }}
              status={!taskAssignee ? 'warning' : undefined}
              placeholder="Chọn nhân sự phụ trách..."
              optionRender={(option) => {
                const valStr = String(option.value || '').trim();
                const matchedStaff = staffDirectory.find(
                  (s) =>
                    String(s.displayName || '').toLowerCase() === valStr.toLowerCase() ||
                    String(s.username || '').toLowerCase() === valStr.toLowerCase()
                );
                return (
                  <div className="flex items-center gap-2 py-0.5 min-w-0">
                    {renderUserAvatarNode({
                      staffId: matchedStaff?.id,
                      name: matchedStaff?.displayName || valStr,
                      username: matchedStaff?.username,
                      avatarUrl: matchedStaff?.avatarUrl,
                      sizeClass: 'w-5 h-5',
                      roundedClass: 'rounded-full',
                      textSizeClass: 'text-[9px]',
                    })}
                    <span className="truncate text-xs font-medium">{option.label}</span>
                  </div>
                );
              }}
              labelRender={(props) => {
                const valStr = String(props.value || '').trim();
                const matchedStaff = staffDirectory.find(
                  (s) =>
                    String(s.displayName || '').toLowerCase() === valStr.toLowerCase() ||
                    String(s.username || '').toLowerCase() === valStr.toLowerCase()
                );
                return (
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    {renderUserAvatarNode({
                      staffId: matchedStaff?.id,
                      name: matchedStaff?.displayName || valStr,
                      username: matchedStaff?.username,
                      avatarUrl: matchedStaff?.avatarUrl,
                      sizeClass: 'w-4 h-4',
                      roundedClass: 'rounded-full',
                      textSizeClass: 'text-[8px]',
                    })}
                    <span className="truncate">{props.label || props.value}</span>
                  </span>
                );
              }}
              filterOption={(input, option) => {
                const normInput = removeVietnameseTones(input.trim().toLowerCase());
                if (!normInput) return true;
                const normLabel = removeVietnameseTones(String(option?.label || '').toLowerCase());
                const normValue = removeVietnameseTones(String(option?.value || '').toLowerCase());
                return normLabel.includes(normInput) || normValue.includes(normInput);
              }}
            />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-1">Mức ưu tiên</div>
            <Select
              className="w-full"
              value={taskPriority}
              onChange={setTaskPriority}
              options={[
                { value: 'URGENT', label: 'Khẩn cấp' },
                { value: 'HIGH', label: 'Quan trọng' },
                { value: 'NORMAL', label: 'Bình thường' },
              ]}
            />
          </div>
        </div>

        {/* Deadline Section (MOS-BUG-125) */}
        <div
          className="p-2.5 rounded-lg space-y-2 text-left"
          style={{
            background: surfaceRaised,
            border: `1px solid ${taskDeadline ? 'rgba(212, 168, 75, 0.4)' : borderColor}`,
          }}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-500">
              <CalendarClock size={13} />
              <span>Hạn chót hoàn thành (Deadline)</span>
            </span>
            {taskDeadline && (
              <span className="text-amber-500 font-semibold tabular-nums text-[10.5px]">
                Hạn: {taskDeadline.format('HH:mm DD/MM/YYYY')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {DEADLINE_PRESETS.map((preset) => {
              const isSelected = taskDeadlineMode === 'preset' && selectedDeadlinePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setTaskDeadlineMode('preset');
                    setSelectedDeadlinePresetId(preset.id);
                    setTaskDeadline(preset.getDate());
                  }}
                  className="h-8 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                  style={{
                    background: isSelected ? 'rgba(212, 168, 75, 0.18)' : surfaceRaised,
                    border: `1px solid ${isSelected ? '#d4a84b' : borderColor}`,
                    color: isSelected ? '#d4a84b' : token.colorText,
                  }}
                >
                  {preset.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setTaskDeadlineMode('custom');
                if (!taskDeadline) {
                  const defaultCustom = dayjs().hour(17).minute(30).second(0);
                  setTaskDeadline(defaultCustom.isBefore(dayjs()) ? defaultCustom.add(1, 'day') : defaultCustom);
                }
              }}
              className="h-8 rounded-lg text-[11px] font-bold cursor-pointer transition-colors col-span-3 flex items-center justify-center gap-1.5"
              style={{
                background: taskDeadlineMode === 'custom' ? 'rgba(212, 168, 75, 0.18)' : surfaceRaised,
                border: `1px solid ${taskDeadlineMode === 'custom' ? '#d4a84b' : borderColor}`,
                color: taskDeadlineMode === 'custom' ? '#d4a84b' : token.colorText,
              }}
            >
              <Calendar size={13} />
              <span>Tùy chỉnh ngày & giờ chót hoàn thành</span>
            </button>
          </div>

          {taskDeadlineMode === 'custom' && (
            <div
              className="p-2 rounded-lg space-y-1.5"
              style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
            >
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                value={taskDeadline}
                onChange={(val) => {
                  setTaskDeadline(val);
                }}
                disabledDate={(current) => current && current < dayjs().startOf('day')}
                className="w-full h-8 text-[12px]"
                placeholder="Chọn thời hạn chót..."
              />

              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-slate-400 mr-0.5">Gợi ý:</span>
                {[
                  { label: '+2 giờ', get: () => dayjs().add(2, 'hour') },
                  {
                    label: '17:30 hôm nay',
                    get: () => {
                      const t = dayjs().hour(17).minute(30).second(0);
                      return t.isBefore(dayjs()) ? t.add(1, 'day') : t;
                    },
                  },
                  {
                    label: '22:00 hôm nay',
                    get: () => {
                      const t = dayjs().hour(22).minute(0).second(0);
                      return t.isBefore(dayjs()) ? t.add(1, 'day') : t;
                    },
                  },
                  { label: '12:00 trưa mai', get: () => dayjs().add(1, 'day').hour(12).minute(0).second(0) },
                  { label: '17:30 chiều mai', get: () => dayjs().add(1, 'day').hour(17).minute(30).second(0) },
                  { label: '+2 ngày', get: () => dayjs().add(2, 'day').hour(17).minute(30).second(0) },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setTaskDeadline(chip.get())}
                    className="px-2 py-0.5 rounded text-[10px] cursor-pointer hover:opacity-80 transition-opacity tabular-nums"
                    style={{
                      background: 'rgba(212, 168, 75, 0.12)',
                      color: '#d4a84b',
                      border: '1px solid rgba(212, 168, 75, 0.25)',
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active Negotiation review banner in Edit modal */}
        {editingTask && taskNegotiatedDeadline && (
          <div
            className="p-2.5 rounded-lg space-y-1.5 text-left"
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1.5px dashed rgba(245, 158, 11, 0.45)',
            }}
          >
            <div className="flex items-center justify-between text-amber-500 font-bold text-[11.5px]">
              <span className="flex items-center gap-1">
                <Handshake size={13} />
                <span>Đề xuất dời hạn từ người nhận</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {taskNegotiatedDeadline ? dayjs(taskNegotiatedDeadline).format('HH:mm DD/MM/YYYY') : ''}
              </span>
            </div>
            {taskNegotiationNote && (
              <div className="text-[11px] italic text-slate-300 bg-black/20 p-1.5 rounded">
                &ldquo;{taskNegotiationNote}&rdquo;
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                className="h-6 px-2.5 rounded-md text-[11px] font-bold cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm inline-flex items-center gap-1"
                onClick={() => {
                  if (taskNegotiatedDeadline) {
                    setTaskDeadline(taskNegotiatedDeadline);
                    if (setTaskNegotiatedDeadline) setTaskNegotiatedDeadline(null);
                    if (setTaskNegotiationNote) setTaskNegotiationNote('');
                    antdMessage.success('Đã áp dụng hạn mới từ đề xuất thương lượng!');
                  }
                }}
              >
                <Check size={12} strokeWidth={3} />
                <span>Áp dụng hạn đề xuất này</span>
              </button>
              <button
                type="button"
                className="h-6 px-2.5 rounded-md text-[11px] font-bold cursor-pointer bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1"
                onClick={() => {
                  if (setTaskNegotiatedDeadline) setTaskNegotiatedDeadline(null);
                  if (setTaskNegotiationNote) setTaskNegotiationNote('');
                  antdMessage.info('Đã hủy bỏ đề xuất thương lượng');
                }}
              >
                <X size={12} />
                <span>Bác bỏ đề xuất</span>
              </button>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
            <span>Hẹn giờ nhắc (Reminder)</span>
            {taskRemindMode === 'custom' && customRemindDate && (
              <span className="text-amber-500 font-semibold tabular-nums text-[10.5px]">
                {customRemindDate.isAfter(dayjs())
                  ? `Nhắc lúc: ${customRemindDate.format('HH:mm DD/MM')}`
                  : 'Chọn thời gian tương lai'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {REMINDER_PRESETS.map((preset) => {
              const isSelected = taskRemindMode === 'preset' && selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setTaskRemindMode('preset');
                    setSelectedPresetId(preset.id);
                    setTaskRemindSeconds(preset.getSeconds());
                  }}
                  className="h-8 rounded-lg text-[11.5px] font-semibold cursor-pointer transition-colors"
                  style={{
                    background: isSelected ? 'rgba(212, 168, 75, 0.18)' : surfaceRaised,
                    border: `1px solid ${isSelected ? '#d4a84b' : borderColor}`,
                    color: isSelected ? '#d4a84b' : token.colorText,
                  }}
                >
                  {preset.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setTaskRemindMode('custom');
                if (!customRemindDate) {
                  setCustomRemindDate(dayjs().add(1, 'hour').minute(0).second(0));
                }
              }}
              className="h-8 rounded-lg text-[11.5px] font-bold cursor-pointer transition-colors col-span-3 flex items-center justify-center gap-1.5"
              style={{
                background: taskRemindMode === 'custom' ? 'rgba(212, 168, 75, 0.18)' : surfaceRaised,
                border: `1px solid ${taskRemindMode === 'custom' ? '#d4a84b' : borderColor}`,
                color: taskRemindMode === 'custom' ? '#d4a84b' : token.colorText,
              }}
            >
              <Calendar size={13} />
              <span>Tùy chỉnh ngày & giờ nhắc hẹn (như ý)</span>
            </button>
          </div>

          {taskRemindMode === 'custom' && (
            <div
              className="p-2.5 rounded-lg space-y-2"
              style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
            >
              <div className="flex items-center gap-2">
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format="DD/MM/YYYY HH:mm"
                  value={customRemindDate}
                  onChange={(val) => setCustomRemindDate(val)}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                  className="w-full h-8 text-[12px]"
                  placeholder="Chọn ngày và giờ nhắc hẹn..."
                />
              </div>

              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="text-[10px] text-slate-400 mr-0.5">Nhanh:</span>
                {[
                  { label: '+10 phút', get: () => dayjs().add(10, 'minute') },
                  { label: '+30 phút', get: () => dayjs().add(30, 'minute') },
                  { label: '+1 giờ', get: () => dayjs().add(1, 'hour') },
                  { label: '+2 giờ', get: () => dayjs().add(2, 'hour') },
                  {
                    label: '17:30 hôm nay',
                    get: () => {
                      const t = dayjs().hour(17).minute(30).second(0);
                      return t.isBefore(dayjs()) ? t.add(1, 'day') : t;
                    },
                  },
                  {
                    label: '09:00 sáng mai',
                    get: () => dayjs().add(1, 'day').hour(9).minute(0).second(0),
                  },
                  {
                    label: '14:00 chiều mai',
                    get: () => dayjs().add(1, 'day').hour(14).minute(0).second(0),
                  },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setCustomRemindDate(chip.get())}
                    className="px-2 py-0.5 rounded text-[10.5px] cursor-pointer hover:opacity-80 transition-opacity tabular-nums"
                    style={{
                      background: 'rgba(212, 168, 75, 0.12)',
                      color: '#d4a84b',
                      border: '1px solid rgba(212, 168, 75, 0.25)',
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {customRemindDate && (
                <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 pt-0.5">
                  <Clock size={12} className="shrink-0 text-emerald-400" />
                  <span>
                    Sẽ nhắc hẹn vào lúc{' '}
                    <strong className="text-emerald-300">{customRemindDate.format('HH:mm - DD/MM/YYYY')}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
