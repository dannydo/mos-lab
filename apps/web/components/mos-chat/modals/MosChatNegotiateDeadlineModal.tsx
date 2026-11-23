'use client';

import React from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { Modal, Input, DatePicker } from 'antd';
import { Handshake } from 'lucide-react';
import type { MosChatTaskItem } from '@mos-lab/shared';

export interface MosChatNegotiateDeadlineModalProps {
  isMobile: boolean;
  surfaceRaised: string;
  negotiateModalOpen: boolean;
  setNegotiateModalOpen: (open: boolean) => void;
  negotiatingTask: MosChatTaskItem | null;
  setNegotiatingTask: (t: MosChatTaskItem | null) => void;
  negotiateProposedDeadline: Dayjs | null;
  setNegotiateProposedDeadline: (d: Dayjs | null) => void;
  negotiateReason: string;
  setNegotiateReason: (r: string) => void;
  isSubmittingNegotiation: boolean;
  handleSubmitNegotiation: () => Promise<void> | void;
}

export const MosChatNegotiateDeadlineModal: React.FC<MosChatNegotiateDeadlineModalProps> = ({
  isMobile,
  surfaceRaised,
  negotiateModalOpen,
  setNegotiateModalOpen,
  negotiatingTask,
  setNegotiatingTask,
  negotiateProposedDeadline,
  setNegotiateProposedDeadline,
  negotiateReason,
  setNegotiateReason,
  isSubmittingNegotiation,
  handleSubmitNegotiation,
}) => {
  return (
    <Modal
      className="mos-chat-theme-scope"
      open={negotiateModalOpen}
      zIndex={1360}
      onCancel={() => {
        setNegotiateModalOpen(false);
        setNegotiatingTask(null);
      }}
      onOk={handleSubmitNegotiation}
      confirmLoading={isSubmittingNegotiation}
      okText="Gửi đề xuất dời hạn"
      cancelText="Đóng"
      title={
        <span className="flex items-center gap-2 text-[14px] font-bold text-amber-500">
          <Handshake size={16} />
          <span>Thương Lượng Dời Hạn Chót Task</span>
        </span>
      }
      width={isMobile ? 'calc(100vw - 24px)' : 460}
    >
      <div className="space-y-3 py-1">
        {negotiatingTask && (
          <div
            className="p-2.5 rounded-lg text-[12px] space-y-1 text-left"
            style={{ background: surfaceRaised, borderLeft: '3px solid #d4a84b' }}
          >
            <div className="font-extrabold text-[13px]">{negotiatingTask.title}</div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
              <span>
                Giao bởi: <strong>{negotiatingTask.creatorName || 'Hệ thống'}</strong>
              </span>
              <span>·</span>
              <span>
                Hạn hiện tại:{' '}
                <strong className="text-amber-400">
                  {negotiatingTask.deadline
                    ? dayjs(negotiatingTask.deadline).format('HH:mm DD/MM/YYYY')
                    : 'Chưa đặt hạn'}
                </strong>
              </span>
            </div>
          </div>
        )}

        <div>
          <div className="text-[11px] font-bold text-slate-400 mb-1">
            Thời hạn đề xuất dời sang <span className="text-rose-400">*</span>
          </div>
          <DatePicker
            showTime={{ format: 'HH:mm' }}
            format="DD/MM/YYYY HH:mm"
            value={negotiateProposedDeadline}
            onChange={(val) => setNegotiateProposedDeadline(val)}
            className="w-full h-9 text-[12px]"
            placeholder="Chọn ngày và giờ bạn xin dời hạn..."
          />
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
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
                onClick={() => setNegotiateProposedDeadline(chip.get())}
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
        </div>

        <div>
          <div className="text-[11px] font-bold text-slate-400 mb-1">
            Lý do / Giải trình đề xuất dời hạn <span className="text-rose-400">*</span>
          </div>
          <Input.TextArea
            rows={3}
            value={negotiateReason}
            onChange={(e) => setNegotiateReason(e.target.value)}
            placeholder="VD: Đang xử lý khẩn cấp khách VIP tại quầy, xin dời hạn sang 22:00 tối nay..."
          />
        </div>

        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400 leading-relaxed text-left">
          💡 Khi gửi đề xuất, người giao việc ({negotiatingTask?.creatorName || 'người tạo'}) sẽ nhận được thông báo để
          xét duyệt hoặc phản hồi trao đổi.
        </div>
      </div>
    </Modal>
  );
};
