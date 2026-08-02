'use client';

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  Checkbox,
  Input,
  Button,
  Space,
  Divider,
  Tooltip,
  theme,
  InputNumber,
  Alert,
  Select,
  Tabs,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  UndoOutlined,
  SaveOutlined,
  SettingOutlined,
  HolderOutlined,
  SearchOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { ColumnConfig } from '@mos-lab/shared';
import { AVAILABLE_ICONS, getDefaultIcon, renderIconHelper } from '../hooks/useTableConfig';
import dynamic from 'next/dynamic';

const IconPickerModal = dynamic(() => import('./IconPickerModal').then((m) => m.IconPickerModal), { ssr: false });

interface TableConfigDrawerProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  columns: ColumnConfig[];
  onSave: (columns: ColumnConfig[], saveAsDefault?: boolean) => Promise<void>;
  onReset: () => Promise<void>;
  extraTabContent?: React.ReactNode;
  extraTabTitle?: string;
}

export const TableConfigDrawer: React.FC<TableConfigDrawerProps> = ({
  visible,
  onClose,
  title = 'Cấu hình hệ thống',
  columns: initialColumns,
  onSave,
  onReset,
  extraTabContent,
  extraTabTitle = 'Quy trình & Nghiệp vụ',
}) => {
  const { token } = theme.useToken();
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [user, setUser] = useState<SafeAny>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeColIndex, setActiveColIndex] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setColumns(JSON.parse(JSON.stringify(initialColumns))); // deep clone
    }
  }, [initialColumns, visible]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const isDanhDo = user?.username === 'danhdo@gmail.com' || user?.email === 'danhdo@gmail.com';

  const handleToggleVisibility = (index: number) => {
    const nextCols = [...columns];
    nextCols[index].visible = !nextCols[index].visible;
    setColumns(nextCols);
  };

  const handleRename = (index: number, newTitle: string) => {
    const nextCols = [...columns];
    nextCols[index].title = newTitle;
    setColumns(nextCols);
  };

  const handleResize = (index: number, width: number | null) => {
    const nextCols = [...columns];
    if (width === null) {
      delete nextCols[index].width;
    } else {
      nextCols[index].width = width;
    }
    setColumns(nextCols);
  };

  const handleSelectIcon = (index: number, icon: string) => {
    const nextCols = [...columns];
    nextCols[index].icon = icon;
    setColumns(nextCols);
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === columns.length - 1) return;

    const nextCols = [...columns];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = nextCols[index];
    nextCols[index] = nextCols[targetIndex];
    nextCols[targetIndex] = temp;
    setColumns(nextCols);
  };

  // HTML5 Drag and Drop Handlers
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const nextCols = [...columns];
    const draggedItem = nextCols[draggedIndex];
    nextCols.splice(draggedIndex, 1);
    nextCols.splice(index, 0, draggedItem);

    setColumns(nextCols);
    setDraggedIndex(null);
  };

  const handleSave = async (saveAsDefault = false) => {
    setSaving(true);
    try {
      await onSave(columns, saveAsDefault);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await onReset();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setResetting(false);
    }
  };

  const [drawerWidth, setDrawerWidth] = useState<number>(500);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('table_config_drawer_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= 400 && parsed <= 1200) {
          setDrawerWidth(parsed);
        }
      }
    }
  }, []);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = drawerWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.min(Math.max(startWidth + deltaX, 420), window.innerWidth * 0.9);
      setDrawerWidth(newWidth);
      if (typeof window !== 'undefined') {
        localStorage.setItem('table_config_drawer_width', Math.round(newWidth).toString());
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const columnsContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      <div className="flex justify-between items-center gap-2">
        <Alert
          message="Kéo thả để sắp xếp lại thứ tự cột. Tích chọn để ẩn/hiển thị."
          type="info"
          showIcon
          style={{ fontSize: '11px', padding: '4px 10px', flex: 1 }}
        />
        <Tooltip title="Khôi phục cấu hình cột mặc định">
          <Button type="text" danger icon={<UndoOutlined />} onClick={handleReset} loading={resetting} size="small" />
        </Tooltip>
      </div>

      {/* Header Tiêu Đề Cột Cấu Hình */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          background: token.colorFillAlter,
          border: `1px solid ${token.colorBorderSecondary}`,
          color: token.colorTextHeading,
        }}
      >
        <span style={{ width: '32px', textAlign: 'center' }}>Ẩn/Hiện</span>
        <span style={{ flex: 1, paddingLeft: '4px' }}>Tên Cột Hiển Thị</span>
        <span style={{ width: '65px', textAlign: 'center' }}>Rộng(px)</span>
        <span style={{ width: '105px', textAlign: 'center' }}>Biểu Tượng</span>
        <span style={{ width: '75px', textAlign: 'center' }}>Thứ Tự</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        <List
          size="small"
          dataSource={columns}
          renderItem={(item, index) => {
            const isFirst = index === 0;
            const isLast = index === columns.length - 1;
            const currentIcon = item.icon !== undefined && item.icon !== '' ? item.icon : getDefaultIcon(item.key);

            return (
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 10px',
                  marginBottom: '6px',
                  borderRadius: '8px',
                  border: `1px solid ${token.colorBorderSecondary}`,
                  background: draggedIndex === index ? token.colorFillAlter : token.colorBgContainer,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  opacity: item.visible ? 1 : 0.55,
                  cursor: 'grab',
                  gap: '8px',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ cursor: 'grab', color: token.colorTextDescription }} title="Kéo thả sắp xếp">
                  <HolderOutlined />
                </div>

                <Tooltip title={item.visible ? 'Đang hiển thị' : 'Đang ẩn'}>
                  <Checkbox checked={item.visible} onChange={() => handleToggleVisibility(index)} />
                </Tooltip>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <Input
                    size="small"
                    value={item.title}
                    onChange={(e) => handleRename(index, e.target.value)}
                    placeholder={item.originalTitle}
                    prefix={currentIcon !== 'none' && renderIconHelper(currentIcon)}
                    style={{ fontSize: '12px' }}
                  />
                </div>

                <Tooltip title="Độ rộng cột (px)">
                  <InputNumber
                    size="small"
                    min={50}
                    max={1000}
                    value={item.width}
                    onChange={(val) => handleResize(index, val)}
                    placeholder="Auto"
                    style={{ width: '65px', fontSize: '11px' }}
                  />
                </Tooltip>

                <Tooltip title="Icon đại diện">
                  <Select
                    size="small"
                    style={{ width: '105px' }}
                    value={item.icon || ''}
                    onChange={(val) => handleSelectIcon(index, val)}
                    options={AVAILABLE_ICONS}
                    popupMatchSelectWidth={false}
                  />
                </Tooltip>

                <Tooltip title="Tìm kiếm Icon">
                  <Button
                    size="small"
                    type="text"
                    icon={<SearchOutlined style={{ fontSize: '12px' }} />}
                    onClick={() => {
                      setActiveColIndex(index);
                      setPickerOpen(true);
                    }}
                  />
                </Tooltip>

                <Space size={0}>
                  <Tooltip title="Lên">
                    <Button
                      size="small"
                      type="text"
                      icon={<ArrowUpOutlined style={{ fontSize: '11px' }} />}
                      disabled={isFirst}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveColumn(index, 'up');
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="Xuống">
                    <Button
                      size="small"
                      type="text"
                      icon={<ArrowDownOutlined style={{ fontSize: '11px' }} />}
                      disabled={isLast}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveColumn(index, 'down');
                      }}
                    />
                  </Tooltip>
                </Space>
              </div>
            );
          }}
        />
      </div>

      <Divider style={{ margin: '4px 0' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave(false)} loading={saving} block>
          Lưu cấu hình cá nhân
        </Button>

        {isDanhDo && (
          <Tooltip title="Cập nhật cấu hình này làm mẫu chung cho tất cả nhân viên khác">
            <Button
              type="dashed"
              danger
              icon={<SaveOutlined />}
              onClick={() => handleSave(true)}
              loading={saving}
              block
              size="small"
            >
              Lưu làm mẫu mặc định (danhdo@gmail.com)
            </Button>
          </Tooltip>
        )}
      </div>
    </div>
  );

  return (
    <Drawer
      title={
        <Space>
          <SettingOutlined style={{ color: token.colorPrimary }} />
          <span>{title}</span>
        </Space>
      }
      placement="right"
      width={drawerWidth}
      onClose={onClose}
      open={visible}
      styles={{
        body: {
          padding: '12px 16px',
          background: token.colorBgLayout,
          position: 'relative',
        },
      }}
    >
      {/* Resizable Left Handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        title="Kéo thả viền trái để thay đổi chiều rộng Drawer (Kích thước được lưu tự động)"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '6px',
          cursor: 'ew-resize',
          zIndex: 100,
          backgroundColor: 'transparent',
          transition: 'background-color 0.2s',
        }}
        className="hover:bg-blue-500/40 active:bg-blue-600/60"
      />
      {extraTabContent ? (
        <Tabs
          defaultActiveKey="columns"
          items={[
            {
              key: 'columns',
              label: (
                <Space>
                  <TableOutlined />
                  <span className="font-semibold">Cấu hình cột bảng</span>
                </Space>
              ),
              children: columnsContent,
            },
            {
              key: 'process',
              label: (
                <Space>
                  <SettingOutlined />
                  <span className="font-semibold">{extraTabTitle}</span>
                </Space>
              ),
              children: extraTabContent,
            },
          ]}
        />
      ) : (
        columnsContent
      )}

      <IconPickerModal
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setActiveColIndex(null);
        }}
        onSelect={(iconName) => {
          if (activeColIndex !== null) {
            handleSelectIcon(activeColIndex, iconName);
          }
        }}
        value={activeColIndex !== null ? columns[activeColIndex]?.icon || '' : ''}
      />
    </Drawer>
  );
};
