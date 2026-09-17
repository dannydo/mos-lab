'use client';

import React from 'react';
import { Button, Radio, Segmented, Space, theme } from 'antd';
import dayjs from 'dayjs';
import { CheckSquare, IdCard, Printer, Sparkles, Users } from 'lucide-react';
import type { AcademyWorkshopDetail, AcademyWorkshopParticipant } from '@mos-lab/shared';
import { AdaptiveModal, AppIcon, StatusTag } from '../../../../components/ui';

export interface AcademyWorkshopPrintBadgesModalProps {
  open: boolean;
  onClose: () => void;
  workshop: AcademyWorkshopDetail;
  participants: AcademyWorkshopParticipant[];
}

export default function AcademyWorkshopPrintBadgesModal({
  open,
  onClose,
  workshop,
  participants,
}: AcademyWorkshopPrintBadgesModalProps) {
  const { token } = theme.useToken();
  const [mode, setMode] = React.useState<'badges' | 'sheet'>('badges');
  const [filterConfirmedOnly, setFilterConfirmedOnly] = React.useState(false);
  const [qrMap, setQrMap] = React.useState<Record<number, string>>({});

  const filteredParticipants = React.useMemo(() => {
    if (!filterConfirmedOnly) return participants;
    return participants.filter((p) => p.attendanceStatus === 'CONFIRMED' || p.checkedInAt !== null);
  }, [filterConfirmedOnly, participants]);

  // Generate QR codes for badges
  React.useEffect(() => {
    if (!open || mode !== 'badges') return;
    let active = true;

    void import('qrcode').then(({ default: QRCode }) => {
      filteredParticipants.forEach((p) => {
        const url =
          p.qrUrl ||
          (p.qrToken
            ? `${window.location.origin}/academy/workshops/join/${encodeURIComponent(p.qrToken)}`
            : `${window.location.origin}/academy/workshops/join/${p.id}`);
        QRCode.toDataURL(url, { width: 300, margin: 1 })
          .then((dataUrl) => {
            if (active) {
              setQrMap((prev) => ({ ...prev, [p.id]: dataUrl }));
            }
          })
          .catch(() => undefined);
      });
    });

    return () => {
      active = false;
    };
  }, [filteredParticipants, mode, open]);

  const handlePrint = React.useCallback(() => {
    window.print();
  }, []);

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={IdCard} className="text-violet-500" />
          <span>In Thẻ Đeo Cổ & Bảng Ký Tên Điểm Danh</span>
        </div>
      }
      width={940}
      footer={
        <Space className="w-full justify-between" wrap>
          <div className="flex items-center gap-2">
            <Segmented
              value={mode}
              onChange={(val) => setMode(val as 'badges' | 'sheet')}
              options={[
                { label: 'Thẻ tên đeo cổ (Badges)', value: 'badges', icon: <AppIcon icon={IdCard} size="sm" /> },
                {
                  label: 'Bảng ký tên đón khách (Sheet)',
                  value: 'sheet',
                  icon: <AppIcon icon={CheckSquare} size="sm" />,
                },
              ]}
            />
            <Radio.Group
              size="small"
              value={filterConfirmedOnly}
              onChange={(e) => setFilterConfirmedOnly(e.target.value)}
              className="ml-2 hidden sm:inline-flex"
            >
              <Radio.Button value={false}>Tất cả ({participants.length})</Radio.Button>
              <Radio.Button value={true}>
                Sẽ đến ({participants.filter((p) => p.attendanceStatus === 'CONFIRMED' || p.checkedInAt).length})
              </Radio.Button>
            </Radio.Group>
          </div>
          <Space>
            <Button onClick={onClose}>Đóng</Button>
            <Button type="primary" icon={<AppIcon icon={Printer} size="sm" />} onClick={handlePrint}>
              In {mode === 'badges' ? 'thẻ đeo' : 'bảng ký tên'} (A4)
            </Button>
          </Space>
        </Space>
      }
    >
      <div className="space-y-6 pt-2 print:p-0">
        {mode === 'badges' ? (
          /* NAME BADGES GRID (4 BADGES PER A4 PAGE) */
          <div>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400 print:hidden">
              Xem trước bố cục in thẻ đeo (4 thẻ/trang A4). Khi in, hãy chọn khổ giấy <strong>A4</strong> và lề{' '}
              <strong>Tối thiểu (Minimum margins)</strong>.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-6">
              {filteredParticipants.map((p) => (
                <div
                  key={p.id}
                  className="relative flex min-h-[340px] break-inside-avoid flex-col justify-between overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-5 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white print:m-0 print:border-2 print:border-black print:bg-white print:text-black print:shadow-none"
                >
                  {/* Badge Header */}
                  <div className="border-b-2 border-slate-100 pb-3 text-center dark:border-slate-800 print:border-black">
                    <div className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400 print:text-black">
                      <AppIcon icon={Sparkles} size={12} />
                      <span>ACADEMY WORKSHOP</span>
                    </div>
                    <h4 className="m-0 mt-1 line-clamp-1 text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300 print:text-black">
                      {workshop.name}
                    </h4>
                  </div>

                  {/* Badge Body */}
                  <div className="my-auto py-4 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-black">
                      Học viên tham dự
                    </span>
                    <h2 className="m-0 my-1.5 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                      {p.lead.name}
                    </h2>
                    <p className="mb-0 text-xs font-semibold text-slate-500 dark:text-slate-400 print:text-black">
                      {p.lead.phone || 'Học viên'}
                    </p>
                  </div>

                  {/* Badge Footer with QR & Instructor */}
                  <div className="flex items-end justify-between border-t-2 border-slate-100 pt-3 dark:border-slate-800 print:border-black">
                    <div className="text-left">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 print:text-black">
                        Giáo viên kèm:
                      </span>
                      <span className="mt-0.5 block text-xs font-black text-slate-800 dark:text-slate-200 print:text-black">
                        {p.primaryInstructor?.displayName || 'Tổ Giảng Viên'}
                      </span>
                      <span className="mt-1 block text-[10px] tabular-nums text-slate-400 print:text-black">
                        {dayjs(workshop.startsAt).format('DD/MM/YYYY')}
                      </span>
                    </div>

                    <div className="text-center">
                      {qrMap[p.id] ? (
                        <img
                          src={qrMap[p.id]}
                          alt="QR Check-in"
                          className="h-16 w-16 rounded border border-slate-200 bg-white p-0.5 dark:border-slate-700 print:border-black"
                        />
                      ) : (
                        <div className="h-16 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                      )}
                      <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-tighter text-slate-400 print:text-black">
                        Quét check-in
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* DOOR SIGN-IN SHEET (BẢNG KÝ TÊN ĐIỂM DANH LỄ TÂN) */
          <div>
            <div className="border-b border-slate-200 pb-3 dark:border-slate-800 print:border-black">
              <div className="flex justify-between">
                <div>
                  <h3 className="m-0 text-base font-black uppercase print:text-black">
                    BẢNG KÝ TÊN ĐIỂM DANH ĐÓN KHÁCH · WORKSHOP ACADEMY
                  </h3>
                  <p className="mb-0 mt-1 text-xs text-slate-600 dark:text-slate-400 print:text-black">
                    Sự kiện: <strong>{workshop.name}</strong> · Thời gian:{' '}
                    <strong className="tabular-nums">{dayjs(workshop.startsAt).format('HH:mm, DD/MM/YYYY')}</strong> ·
                    Địa điểm: <strong>{workshop.location}</strong>
                  </p>
                </div>
                <div className="text-right text-xs print:text-black">
                  Tổng: <strong>{filteredParticipants.length} học viên</strong>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs print:text-black">
                <thead>
                  <tr className="border-b-2 border-black bg-slate-100 dark:bg-slate-800 print:bg-white">
                    <th className="w-10 border border-slate-300 p-2 text-center font-bold print:border-black">STT</th>
                    <th className="w-44 border border-slate-300 p-2 font-bold print:border-black">Họ và tên</th>
                    <th className="w-28 border border-slate-300 p-2 font-bold print:border-black">Số điện thoại</th>
                    <th className="w-24 border border-slate-300 p-2 font-bold print:border-black">Phí tham dự</th>
                    <th className="border border-slate-300 p-2 font-bold print:border-black">Thực đơn đã chọn</th>
                    <th className="border border-slate-300 p-2 font-bold print:border-black">Gói dụng cụ</th>
                    <th className="w-32 border border-slate-300 p-2 text-center font-bold print:border-black">
                      Ký nhận thẻ & quà
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((p, index) => (
                    <tr key={p.id} className="border-b border-slate-200 dark:border-slate-800 print:border-black">
                      <td className="border border-slate-300 p-2 text-center tabular-nums print:border-black">
                        {index + 1}
                      </td>
                      <td className="border border-slate-300 p-2 font-bold print:border-black">{p.lead.name}</td>
                      <td className="border border-slate-300 p-2 tabular-nums print:border-black">
                        {p.lead.phone || '—'}
                      </td>
                      <td className="border border-slate-300 p-2 print:border-black">
                        {p.feeStatus === 'PAID' ? '✓ Đã đóng' : p.feeStatus === 'WAIVED' ? 'Miễn phí' : 'Chưa đóng'}
                      </td>
                      <td className="border border-slate-300 p-2 print:border-black">
                        {p.menuSelections.length ? p.menuSelections.map((s) => s.itemName).join(', ') : '—'}
                      </td>
                      <td className="border border-slate-300 p-2 print:border-black">
                        {p.equipmentSelection ? p.equipmentSelection.packageName : 'Tự chuẩn bị'}
                      </td>
                      <td className="h-11 border border-slate-300 p-2 print:border-black"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 hidden justify-between text-xs print:flex">
              <div>
                <p className="font-bold">LỄ TÂN ĐÓN KHÁCH</p>
                <p className="mt-12">(Ký và ghi rõ họ tên)</p>
              </div>
              <div>
                <p className="font-bold">QUẢN LÝ ĐIỀU HÀNH SỰ KIỆN</p>
                <p className="mt-12">(Ký xác nhận)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdaptiveModal>
  );
}
