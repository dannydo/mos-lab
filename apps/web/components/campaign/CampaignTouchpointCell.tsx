'use client';

import React from 'react';
import { Popover, Tooltip } from 'antd';
import type {
  CampaignTouchpointCellProps,
  CampaignTouchpointItem,
} from './campaign-touchpoint-cell/touchpoint-cell-types';
import { useTouchpointCellState } from './campaign-touchpoint-cell/useTouchpointCellState';
import { TouchpointTooltipContent } from './campaign-touchpoint-cell/TouchpointTooltipContent';
import { TouchpointPopoverContent } from './campaign-touchpoint-cell/TouchpointPopoverContent';
import { TouchpointPillBadge } from './campaign-touchpoint-cell/TouchpointPillBadge';

export type { CampaignTouchpointCellProps, CampaignTouchpointItem };

export const CampaignTouchpointCell: React.FC<CampaignTouchpointCellProps> = ({
  customer,
  touchpoint,
  themeMode,
  onToggle,
  onOpenBooking,
}) => {
  const {
    tpLog,
    currentNote,
    days,
    displayStatus,
    labelText,
    customerName,
    formattedDate,
    staffName,
    popoverOpen,
    setPopoverOpen,
    selectedStatus,
    noteInput,
    setNoteInput,
    hasReferredDiamond,
    toggleDiamondReferral,
    callbackDate,
    setCallbackDate,
    loading,
    handleCellClick,
    handleSelectStatus,
    handleSave,
    handleBookedAction,
    handleReset,
  } = useTouchpointCellState({
    customer,
    touchpoint,
    onToggle,
    onOpenBooking,
  });

  const isDark = themeMode === 'dark';

  const popoverContent = (
    <TouchpointPopoverContent
      labelText={labelText}
      customerName={customerName}
      isDark={isDark}
      selectedStatus={selectedStatus}
      callbackDate={callbackDate}
      hasReferredDiamond={hasReferredDiamond}
      noteInput={noteInput}
      loading={loading}
      onSelectStatus={handleSelectStatus}
      onBookedAction={handleBookedAction}
      onChangeCallbackDate={setCallbackDate}
      onToggleDiamondReferral={toggleDiamondReferral}
      onChangeNoteInput={setNoteInput}
      onReset={handleReset}
      onSave={handleSave}
    />
  );

  const tooltipContent = popoverOpen ? (
    ''
  ) : (
    <TouchpointTooltipContent
      displayStatus={displayStatus}
      labelText={labelText}
      staffName={staffName}
      formattedDate={formattedDate}
      currentNote={currentNote}
      days={days}
      convertedAt={tpLog?.conversionDetails?.convertedAt}
      customerCallbackDate={customer.callbackDate}
      callbackDate={callbackDate}
    />
  );

  return (
    <Popover
      content={popoverContent}
      title={null}
      trigger="click"
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      placement="bottom"
    >
      <Tooltip title={tooltipContent} placement="top">
        <TouchpointPillBadge
          displayStatus={displayStatus}
          isDark={isDark}
          loading={loading}
          hasReferredDiamond={hasReferredDiamond}
          currentNote={currentNote}
          onCellClick={handleCellClick}
        />
      </Tooltip>
    </Popover>
  );
};
