import React, { useState, useMemo } from 'react';
import { Card, Avatar, Tag, Badge, Spin, theme, Input, Empty, Button } from 'antd';
import { UserOutlined, HomeOutlined, SmileOutlined, HeartFilled, SearchOutlined } from '@ant-design/icons';
import { getOffDaysText } from './constants';

interface TechnicianSelectorProps {
  selectedCV: SafeAny;
  onSelectCVOption: (cv: SafeAny) => void;
  favoriteTechs: string[];
  getFavoriteKTVs: () => SafeAny[];
  getGroupedKTVs: () => { [storeName: string]: SafeAny[] };
  loadingStaff: boolean;
  themeMode: string;
}

const removeAccents = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

export const TechnicianSelector: React.FC<TechnicianSelectorProps> = ({
  selectedCV,
  onSelectCVOption,
  favoriteTechs,
  getFavoriteKTVs,
  getGroupedKTVs,
  loadingStaff,
  themeMode,
}) => {
  const { token } = theme.useToken();
  const [searchTerm, setSearchTerm] = useState('');
  const favoriteKTVs = getFavoriteKTVs();
  const groupedKTVs = getGroupedKTVs();

  const normalizedSearch = removeAccents(searchTerm.trim().toLowerCase());

  const filteredGroupedKTVs = useMemo(() => {
    if (!normalizedSearch) return groupedKTVs;

    const result: { [storeName: string]: SafeAny[] } = {};
    for (const [storeName, members] of Object.entries(groupedKTVs)) {
      const matchingMembers = members.filter((staff: SafeAny) => {
        const name = removeAccents((staff.displayName || '').toLowerCase());
        const store = removeAccents((staff.notes || storeName || '').toLowerCase());
        const offText = removeAccents(getOffDaysText(staff.offDays).toLowerCase());

        return (
          name.includes(normalizedSearch) || store.includes(normalizedSearch) || offText.includes(normalizedSearch)
        );
      });

      if (matchingMembers.length > 0) {
        result[storeName] = matchingMembers;
      }
    }
    return result;
  }, [groupedKTVs, normalizedSearch]);

  const totalMatchingKTVs = useMemo(() => {
    return Object.values(filteredGroupedKTVs).reduce((acc, m) => acc + m.length, 0);
  }, [filteredGroupedKTVs]);

  return (
    <div>
      <h3 style={{ fontSize: '15px', color: '#888', marginBottom: '16px' }}>
        Bước 1: Khách hàng muốn đặt Chuyên viên nào?
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Free/Auto Specialist */}
        <Card
          hoverable
          styles={{ body: { padding: '16px' } }}
          style={{
            borderColor: selectedCV === null ? '#D4A84B' : 'transparent',
            backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
          }}
          onClick={() => onSelectCVOption(null)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Avatar size="large" icon={<SmileOutlined />} style={{ backgroundColor: '#D4A84B' }} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '15px', color: token.colorText }}>
                Không chỉ định chuyên viên (Chuyên viên Tự Do)
              </div>
              <div style={{ fontSize: '12.5px', color: '#888', marginTop: '2px' }}>
                Sắp xếp ngẫu nhiên chuyên viên trống lịch tại Chi nhánh
              </div>
            </div>
          </div>
        </Card>

        {/* Favorite Stylist Suggestion Section */}
        {favoriteTechs.length > 0 && favoriteKTVs.length > 0 && !searchTerm && (
          <div style={{ marginTop: '8px' }}>
            <div
              style={{
                fontWeight: 'bold',
                fontSize: '13px',
                color: '#db2777',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <HeartFilled style={{ color: '#db2777' }} /> GỢI Ý CHUYÊN VIÊN ƯA THÍCH CỦA KHÁCH
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
              {favoriteKTVs.map((staff: SafeAny) => {
                const isSelected = selectedCV?.id === staff.id;
                return (
                  <Card
                    key={`fav-${staff.id}`}
                    hoverable
                    size="small"
                    styles={{ body: { padding: '10px 12px' } }}
                    style={{
                      borderColor: isSelected ? '#db2777' : themeMode === 'dark' ? '#4f1a30' : '#fbcfe8',
                      backgroundColor: isSelected
                        ? themeMode === 'dark'
                          ? 'rgba(219, 39, 119, 0.15)'
                          : 'rgba(219, 39, 119, 0.05)'
                        : themeMode === 'dark'
                          ? '#1e293b'
                          : '#ffffff',
                      boxShadow: isSelected ? '0 0 0 1px #db2777' : 'none',
                      transition: 'all 0.2s',
                      height: '100%',
                    }}
                    onClick={() => onSelectCVOption(staff)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Avatar
                        src={staff.avatar || staff.avatarUrl || undefined}
                        icon={<UserOutlined />}
                        style={{ backgroundColor: '#db2777', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <div
                            style={{
                              fontWeight: 'bold',
                              color: token.colorText,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {staff.displayName}
                          </div>
                          <Tag color="magenta" style={{ margin: 0, fontSize: '10px', padding: '0 4px' }}>
                            Ưa thích nhất
                          </Tag>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#888', marginTop: '2px' }}>
                          Chi nhánh: {staff.notes || 'Khác'}
                          {staff.offDays && staff.offDays.length > 0 && (
                            <span style={{ color: '#ef4444', marginLeft: '6px', fontWeight: 'bold' }}>
                              | {getOffDaysText(staff.offDays)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Section Header Row with Inline Search Input */}
        <div
          style={{
            marginTop: '8px',
            marginBottom: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#888', whiteSpace: 'nowrap' }}>
            HOẶC CHỌN CHUYÊN VIÊN YÊU CẦU
          </div>
          <Input
            placeholder="Tìm theo tên CV, chi nhánh, ngày off..."
            prefix={<SearchOutlined style={{ color: '#888' }} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            size="small"
            style={{
              maxWidth: '240px',
              borderRadius: '6px',
              backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
              borderColor: themeMode === 'dark' ? '#334155' : '#cbd5e1',
            }}
          />
        </div>

        {loadingStaff ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Spin />
            <div style={{ color: '#888', fontSize: '13px' }}>Đang tải danh sách chuyên viên...</div>
          </div>
        ) : totalMatchingKTVs === 0 && searchTerm ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              backgroundColor: themeMode === 'dark' ? '#1e293b' : '#f8fafc',
              borderRadius: '8px',
              border: `1px dashed ${themeMode === 'dark' ? '#334155' : '#cbd5e1'}`,
            }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: '#888', fontSize: '13px' }}>
                  Không tìm thấy chuyên viên phù hợp với từ khóa &quot;<strong>{searchTerm}</strong>&quot;
                </span>
              }
            >
              <Button size="small" type="primary" onClick={() => setSearchTerm('')}>
                Xóa tìm kiếm
              </Button>
            </Empty>
          </div>
        ) : (
          Object.entries(filteredGroupedKTVs).map(([storeName, members]) => (
            <div key={storeName} style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  paddingBottom: '6px',
                  borderBottom: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
                }}
              >
                <HomeOutlined style={{ color: '#D4A84B' }} />
                <span style={{ fontWeight: 'bold', fontSize: '13.5px', color: token.colorText }}>{storeName}</span>
                <Badge
                  count={members.length}
                  style={{
                    backgroundColor: themeMode === 'dark' ? '#334155' : '#f1f5f9',
                    color: themeMode === 'dark' ? '#cbd5e1' : '#64748b',
                    boxShadow: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                {members.map((staff: SafeAny) => (
                  <Card
                    key={staff.id}
                    hoverable
                    size="small"
                    styles={{ body: { padding: '10px 12px' } }}
                    style={{
                      borderColor:
                        selectedCV?.id === staff.id ? '#D4A84B' : themeMode === 'dark' ? '#334155' : '#e2e8f0',
                      backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
                      boxShadow: selectedCV?.id === staff.id ? '0 0 0 1px #D4A84B' : 'none',
                      transition: 'all 0.2s',
                      height: '100%',
                    }}
                    onClick={() => onSelectCVOption(staff)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Avatar
                        src={staff.avatar || staff.avatarUrl || undefined}
                        icon={<UserOutlined />}
                        style={{ backgroundColor: '#D4A84B', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <div
                            style={{
                              fontWeight: 'bold',
                              color: token.colorText,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {staff.displayName}
                          </div>
                          {favoriteTechs.includes(staff.displayName?.trim()) && (
                            <Tag color="magenta" style={{ margin: 0, fontSize: '10px', padding: '0 4px' }}>
                              Ưa thích
                            </Tag>
                          )}
                          {staff.approvedOffDates &&
                            staff.approvedOffDates.includes(new Date().toLocaleDateString('sv-SE')) && (
                              <Tag
                                color="error"
                                style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', padding: '0 4px' }}
                              >
                                Nghỉ phép hôm nay
                              </Tag>
                            )}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#888', marginTop: '2px' }}>
                          Vai trò: Chuyên viên
                          {staff.offDays && staff.offDays.length > 0 && (
                            <span style={{ color: '#ef4444', marginLeft: '6px', fontWeight: 'bold' }}>
                              | {getOffDaysText(staff.offDays)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
