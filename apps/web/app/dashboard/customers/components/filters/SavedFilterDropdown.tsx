import React from 'react';
import { Dropdown, Button, theme } from 'antd';
import { DeleteOutlined, DownOutlined } from '@ant-design/icons';

interface SavedFilterDropdownProps {
  savedFilters: SafeAny[];
  presetFilters: SafeAny[];
  handleDeleteFilter: (id: string, name: string) => void;
  applyFilter: (filter: SafeAny) => void;
}

export const SavedFilterDropdown: React.FC<SavedFilterDropdownProps> = ({
  savedFilters,
  presetFilters,
  handleDeleteFilter,
  applyFilter,
}) => {
  const { token } = theme.useToken();

  return (
    <Dropdown
      menu={{
        items: [
          {
            key: 'presets',
            label: (
              <span style={{ fontWeight: 'bold', color: token.colorTextDescription }}>BỘ LỌC MẶC ĐỊNH (PRESETS)</span>
            ),
            type: 'group',
            children: presetFilters.map((f) => ({
              key: f.id,
              label: f.name,
            })),
          },
          {
            key: 'custom',
            label: (
              <span style={{ fontWeight: 'bold', color: token.colorTextDescription }}>BỘ LỌC TỰ LƯU (DATABASE)</span>
            ),
            type: 'group',
            children:
              savedFilters.length > 0
                ? savedFilters.map((f) => ({
                    key: f.id,
                    label: (
                      <div className="flex justify-between items-center w-full min-w-[220px]">
                        <span>{f.name}</span>
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFilter(f.id, f.name);
                          }}
                        />
                      </div>
                    ),
                  }))
                : [
                    {
                      key: 'no_custom',
                      label: <span style={{ color: '#888', fontStyle: 'italic' }}>Chưa lưu bộ lọc nào</span>,
                      disabled: true,
                    },
                  ],
          },
        ],
        onClick: (info) => {
          const preset = presetFilters.find((p) => p.id === info.key);
          if (preset) {
            applyFilter(preset);
            return;
          }
          const custom = savedFilters.find((f) => f.id === info.key);
          if (custom) {
            applyFilter(custom);
            return;
          }
        },
      }}
      trigger={['click']}
    >
      <Button className="customer-saved-filter-trigger" icon={<DownOutlined />}>
        Bộ lọc đã lưu
      </Button>
    </Dropdown>
  );
};
export default SavedFilterDropdown;
