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
}

export const TableConfigDrawer: React.FC<TableConfigDrawerProps> = ({
  visible,
  onClose,
  title = 'Cấu hình cột bảng',
  columns: initialColumns,
  onSave,
  onReset,
}) => {
  const { token } = theme.useToken();
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [user, setUser] = useState<any>(null);
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

  return (
    <Drawer
      title={
        <Space>
          <SettingOutlined style={{ color: token.colorPrimary }} />
          <span>{title}</span>
        </Space>
      }
      placement="right"
      width={450}
      onClose={onClose}
      open={visible}
      styles={{
        body: {
          padding: '16px',
          background: token.colorBgLayout,
        },
      }}
      extra={
        <Button type="text" icon={<UndoOutlined />} onClick={handleReset} loading={resetting} danger>
          Reset mặc định
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
        <Alert
          message="Hướng dẫn"
          description="Kéo thả để sắp xếp lại thứ tự cột hoặc sử dụng các nút Mũi tên. Tích chọn để ẩn/hiển thị cột."
          type="info"
          showIcon
          style={{ fontSize: '12px' }}
        />

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
                    flexDirection: 'column',
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    border: `1px solid ${token.colorBorderSecondary}`,
                    background: draggedIndex === index ? token.colorFillAlter : token.colorBgContainer,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    opacity: item.visible ? 1 : 0.6,
                    cursor: 'grab',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
                    <div style={{ cursor: 'grab', color: token.colorTextDescription }}>
                      <HolderOutlined />
                    </div>

                    <Checkbox checked={item.visible} onChange={() => handleToggleVisibility(index)} />

                    <div style={{ flex: 1 }}>
                      <Input
                        size="small"
                        value={item.title}
                        onChange={(e) => handleRename(index, e.target.value)}
                        placeholder={item.originalTitle}
                        prefix={currentIcon !== 'none' && renderIconHelper(currentIcon)}
                        addonBefore={
                          <span style={{ fontSize: '11px', color: token.colorTextDescription }}>
                            Gốc: {item.originalTitle}
                          </span>
                        }
                        style={{ width: '100%' }}
                      />
                    </div>

                    <Space size={2}>
                      <Tooltip title="Di chuyển lên">
                        <Button
                          size="small"
                          type="text"
                          icon={<ArrowUpOutlined />}
                          disabled={isFirst}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveColumn(index, 'up');
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="Di chuyển xuống">
                        <Button
                          size="small"
                          type="text"
                          icon={<ArrowDownOutlined />}
                          disabled={isLast}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveColumn(index, 'down');
                          }}
                        />
                      </Tooltip>
                    </Space>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginTop: '8px',
                      paddingLeft: '24px',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: token.colorTextDescription }}>Độ rộng (px):</span>
                    <InputNumber
                      size="small"
                      min={50}
                      max={1000}
                      value={item.width}
                      onChange={(val) => handleResize(index, val)}
                      placeholder="Tự động"
                      style={{ width: '75px' }}
                    />
                    {item.width && (
                      <Button
                        size="small"
                        type="link"
                        onClick={() => handleResize(index, null)}
                        style={{ padding: 0, fontSize: '11px', marginRight: '4px' }}
                      >
                        Reset
                      </Button>
                    )}

                    <span style={{ fontSize: '11px', color: token.colorTextDescription, marginLeft: '8px' }}>
                      Icon:
                    </span>
                    <Space size={4}>
                      <Select
                        size="small"
                        style={{ width: '130px' }}
                        value={item.icon || ''}
                        onChange={(val) => handleSelectIcon(index, val)}
                        options={AVAILABLE_ICONS}
                        popupMatchSelectWidth={false}
                      />
                      <Tooltip title="Tìm kiếm tất cả icon Ant Design & Lucide">
                        <Button
                          size="small"
                          icon={<SearchOutlined />}
                          onClick={() => {
                            setActiveColIndex(index);
                            setPickerOpen(true);
                          }}
                        />
                      </Tooltip>
                    </Space>
                  </div>
                </div>
              );
            }}
          />
        </div>

        <Divider style={{ margin: '8px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
              >
                Lưu làm mẫu mặc định (danhdo@gmail.com)
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

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
