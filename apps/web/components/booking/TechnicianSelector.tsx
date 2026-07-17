import React from 'react';
import { Card, Avatar, Tag, Badge, Spin, theme } from 'antd';
import { UserOutlined, HomeOutlined, SmileOutlined, HeartFilled } from '@ant-design/icons';
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
  const favoriteKTVs = getFavoriteKTVs();
  const groupedKTVs = getGroupedKTVs();

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
        {favoriteTechs.length > 0 && favoriteKTVs.length > 0 && (
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {favoriteKTVs.map((staff: SafeAny) => {
                const isSelected = selectedCV?.id === staff.id;
                return (
                  <Card
                    key={`fav-${staff.id}`}
                    hoverable
                    size="small"
                    styles={{ body: { padding: '12px 16px' } }}
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
                    }}
                    onClick={() => onSelectCVOption(staff)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <Avatar
                          src={staff.avatar || staff.avatarUrl || undefined}
                          icon={<UserOutlined />}
                          style={{ backgroundColor: '#db2777' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ fontWeight: 'bold', color: token.colorText }}>{staff.displayName}</div>
                            <Tag color="magenta" style={{ margin: 0, fontSize: '10.5px' }}>
                              Ưa thích nhất
                            </Tag>
                          </div>
                          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                            Chi nhánh: {staff.notes || 'Khác'}
                            {staff.offDays && staff.offDays.length > 0 && (
                              <span style={{ color: '#ef4444', marginLeft: '8px', fontWeight: 'bold' }}>
                                | {getOffDaysText(staff.offDays)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: '8px', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: '#888' }}>
          HOẶC CHỌN CHUYÊN VIÊN YÊU CẦU
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
        ) : (
          Object.entries(groupedKTVs).map(([storeName, members]) => (
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.map((staff: SafeAny) => (
                  <Card
                    key={staff.id}
                    hoverable
                    size="small"
                    styles={{ body: { padding: '12px 16px' } }}
                    style={{
                      borderColor:
                        selectedCV?.id === staff.id ? '#D4A84B' : themeMode === 'dark' ? '#334155' : '#e2e8f0',
                      backgroundColor: themeMode === 'dark' ? '#1e293b' : '#ffffff',
                      boxShadow: selectedCV?.id === staff.id ? '0 0 0 1px #D4A84B' : 'none',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => onSelectCVOption(staff)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <Avatar
                          src={staff.avatar || staff.avatarUrl || undefined}
                          icon={<UserOutlined />}
                          style={{ backgroundColor: '#D4A84B' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ fontWeight: 'bold', color: token.colorText }}>{staff.displayName}</div>
                            {favoriteTechs.includes(staff.displayName?.trim()) && (
                              <Tag color="magenta" style={{ margin: 0, fontSize: '10.5px' }}>
                                Ưa thích
                              </Tag>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#888' }}>
                            Vai trò: Chuyên viên
                            {staff.offDays && staff.offDays.length > 0 && (
                              <span style={{ color: '#ef4444', marginLeft: '8px', fontWeight: 'bold' }}>
                                | {getOffDaysText(staff.offDays)}
                              </span>
                            )}
                          </div>
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
