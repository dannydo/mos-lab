'use client';

import React from 'react';
import { Segmented, Avatar } from 'antd';
import {
  Building2,
  MapPin,
  Compass,
  ExternalLink,
  Users,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  User,
  Phone,
} from 'lucide-react';
import { AppIcon, AdaptiveDrawer, StatusTag, StatePanel } from '../../../../components/ui';
import type { CrmBranch, BranchStaffInfo, BranchType } from '@mos-lab/shared';

interface BranchDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  branch: CrmBranch | null;
  loading: boolean;
  activeTab: 'info' | 'staff';
  onTabChange: (tab: 'info' | 'staff') => void;
  renderStoreTypeBadge: (type: BranchType) => React.ReactNode;
}

export function BranchDetailDrawer({
  open,
  onClose,
  branch,
  loading,
  activeTab,
  onTabChange,
  renderStoreTypeBadge,
}: BranchDetailDrawerProps) {
  return (
    <AdaptiveDrawer
      intent="detail"
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={Building2} size="sm" className="text-emerald-500" />
          <span>{branch?.name || 'Chi Tiết Chi Nhánh'}</span>
          {branch && renderStoreTypeBadge(branch.storeType)}
        </div>
      }
      open={open}
      onClose={onClose}
      width={620}
    >
      {loading ? (
        <StatePanel kind="loading" title="Đang tải chi tiết chi nhánh…" surface={false} />
      ) : branch ? (
        <div className="space-y-5">
          <Segmented
            block
            value={activeTab}
            onChange={(val) => onTabChange(val as 'info' | 'staff')}
            options={[
              {
                value: 'info',
                icon: <AppIcon icon={Building2} size="sm" />,
                label: 'Thông Tin Chi Nhánh',
              },
              {
                value: 'staff',
                icon: <AppIcon icon={Users} size="sm" />,
                label: `Đội Ngũ Nhân Sự (${branch.staffList?.length ?? branch.staffCount ?? 0})`,
              },
            ]}
          />

          {activeTab === 'info' ? (
            <div className="space-y-4">
              {/* General Info Card */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Mã chi nhánh:</span>
                    <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                      {branch.code}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Trạng thái:</span>
                    <div className="mt-0.5">
                      {branch.isActive ? (
                        <StatusTag
                          status="success"
                          label="Đang hoạt động"
                          icon={<AppIcon icon={CheckCircle2} size="sm" />}
                        />
                      ) : (
                        <StatusTag
                          status="default"
                          label="Tạm ngắt / Vô hiệu hóa"
                          icon={<AppIcon icon={XCircle} size="sm" />}
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Tên tiếng Việt:</span>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{branch.name}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Tên tiếng Anh:</span>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{branch.nameEn || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                  <AppIcon icon={MapPin} size="sm" className="text-emerald-500" />
                  <span>Địa Chỉ & Bản Đồ</span>
                </div>

                <div>
                  <span className="text-slate-400">Địa chỉ hiển thị trên Website:</span>
                  <div className="text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                    {branch.addressWeb || 'Chưa thiết lập'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Địa chỉ gửi SMS:</span>
                  <div className="text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                    {branch.addressSms || 'Chưa thiết lập'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Thành phố / Khu vực:</span>
                  <div className="text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                    {branch.addressCity || 'Chưa thiết lập'}
                  </div>
                </div>

                {branch.addressMap && (
                  <div className="pt-1">
                    <a
                      href={branch.addressMap}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 font-medium"
                    >
                      <AppIcon icon={Compass} size="sm" /> Mở liên kết Google Maps{' '}
                      <AppIcon icon={ExternalLink} size="sm" />
                    </a>
                  </div>
                )}
              </div>

              {/* Business Stats */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-2">
                  Chỉ Số Vận Hành Chi Nhánh
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Tổng nhân sự hiện tại:</span>
                    <div className="text-base font-bold text-slate-800 dark:text-slate-200 tabular-nums mt-0.5">
                      {branch.staffList?.length ?? branch.staffCount ?? 0} người
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Đơn hàng đã hoàn tất:</span>
                    <div className="text-base font-bold text-slate-800 dark:text-slate-200 tabular-nums mt-0.5">
                      {(branch.completedOrdersCount ?? 0).toLocaleString('vi-VN')} đơn
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {branch.notes && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <span className="text-slate-400 font-semibold">Ghi chú quản lý:</span>
                  <div className="text-slate-700 dark:text-slate-300 whitespace-pre-line">{branch.notes}</div>
                </div>
              )}
            </div>
          ) : (
            /* Staff Directory Tab */
            <div className="space-y-3">
              {branch.staffList && branch.staffList.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {branch.staffList.map((staff: BranchStaffInfo) => (
                    <div key={staff.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={staff.avatarUrl}
                          icon={<AppIcon icon={User} size="sm" />}
                          size={40}
                          className="bg-emerald-500/20 text-emerald-600 font-semibold"
                        />
                        <div>
                          <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                            {staff.displayName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <span>{staff.role}</span>
                            {staff.phone && (
                              <a
                                href={`tel:${staff.phone}`}
                                className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-emerald-500"
                              >
                                <AppIcon icon={Phone} size="sm" /> {staff.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        {staff.isActive ? (
                          <StatusTag status="success" label="Đang làm việc" />
                        ) : (
                          <StatusTag status="default" label="Đã nghỉ" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <StatePanel
                  kind="empty"
                  title="Chưa có nhân sự"
                  description="Chưa có nhân sự nào được phân bổ trực tiếp cho chi nhánh này"
                  surface={false}
                />
              )}
            </div>
          )}
        </div>
      ) : null}
    </AdaptiveDrawer>
  );
}
