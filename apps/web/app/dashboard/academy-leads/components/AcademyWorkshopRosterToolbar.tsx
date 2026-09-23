'use client';

import React from 'react';
import { Button, Dropdown, Space, type MenuProps } from 'antd';
import { ChevronDown, FileText, QrCode, Sparkles, UserPlus, Users, UtensilsCrossed, Wrench } from 'lucide-react';
import { AppIcon, IconText } from '../../../../components/ui';

export interface AcademyWorkshopRosterToolbarProps {
  hasMenuItems: boolean;
  hasEquipmentPackages: boolean;
  hasDesigns?: boolean;
  onOpenKitchenModal: () => void;
  onOpenEquipmentPrepModal: () => void;
  onOpenDesignPrepModal?: () => void;
  onOpenQrCheckIn: () => void;
  onOpenWalkIn: () => void;
  onOpenAddParticipant: () => void;
}

export default function AcademyWorkshopRosterToolbar({
  hasMenuItems,
  hasEquipmentPackages,
  hasDesigns = false,
  onOpenKitchenModal,
  onOpenEquipmentPrepModal,
  onOpenDesignPrepModal,
  onOpenQrCheckIn,
  onOpenWalkIn,
  onOpenAddParticipant,
}: AcademyWorkshopRosterToolbarProps) {
  const reportMenuItems: MenuProps['items'] = React.useMemo(() => {
    const items: MenuProps['items'] = [];
    if (hasMenuItems) {
      items.push({
        key: 'kitchen',
        label: <IconText icon={<AppIcon icon={UtensilsCrossed} size="sm" />}>Báo cáo Bếp &amp; Đặt món</IconText>,
        onClick: onOpenKitchenModal,
      });
    }
    if (hasEquipmentPackages) {
      items.push({
        key: 'equipment',
        label: <IconText icon={<AppIcon icon={Wrench} size="sm" />}>Báo cáo Soạn kho</IconText>,
        onClick: onOpenEquipmentPrepModal,
      });
    }
    if (hasDesigns && onOpenDesignPrepModal) {
      items.push({
        key: 'design',
        label: <IconText icon={<AppIcon icon={Sparkles} size="sm" />}>Báo cáo Chuẩn bị Mẫu mi</IconText>,
        onClick: onOpenDesignPrepModal,
      });
    }
    return items;
  }, [
    hasDesigns,
    hasEquipmentPackages,
    hasMenuItems,
    onOpenDesignPrepModal,
    onOpenEquipmentPrepModal,
    onOpenKitchenModal,
  ]);

  const hasReports = reportMenuItems.length > 0;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {/* Reports: Show dropdown if both are available, or single button if only 1 */}
      {hasReports && reportMenuItems.length > 1 ? (
        <Dropdown menu={{ items: reportMenuItems }} trigger={['click']}>
          <Button>
            <Space size={4}>
              <AppIcon icon={FileText} size="sm" />
              <span>Báo cáo hậu cần</span>
              <AppIcon icon={ChevronDown} size={12} className="opacity-60" />
            </Space>
          </Button>
        </Dropdown>
      ) : hasReports && hasMenuItems ? (
        <Button onClick={onOpenKitchenModal}>
          <IconText icon={<AppIcon icon={UtensilsCrossed} size="sm" />}>Báo cáo Bếp</IconText>
        </Button>
      ) : hasReports && hasEquipmentPackages ? (
        <Button onClick={onOpenEquipmentPrepModal}>
          <IconText icon={<AppIcon icon={Wrench} size="sm" />}>Báo cáo Soạn kho</IconText>
        </Button>
      ) : hasReports && hasDesigns && onOpenDesignPrepModal ? (
        <Button onClick={onOpenDesignPrepModal}>
          <IconText icon={<AppIcon icon={Sparkles} size="sm" />}>Báo cáo Mẫu mi</IconText>
        </Button>
      ) : null}

      <Button onClick={onOpenQrCheckIn}>
        <IconText icon={<AppIcon icon={QrCode} size="sm" />}>Quét / nhập QR</IconText>
      </Button>

      <Button onClick={onOpenWalkIn}>
        <IconText icon={<AppIcon icon={UserPlus} size="sm" />}>Học viên mới / Walk-in</IconText>
      </Button>

      <Button type="primary" onClick={onOpenAddParticipant}>
        <IconText icon={<AppIcon icon={Users} size="sm" />}>Thêm học viên</IconText>
      </Button>
    </div>
  );
}
