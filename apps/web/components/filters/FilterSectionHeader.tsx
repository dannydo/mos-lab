import React from 'react';

interface FilterSectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  themeMode: string;
}

export const FilterSectionHeader: React.FC<FilterSectionHeaderProps> = ({ icon, title, themeMode }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '26px',
          height: '26px',
          borderRadius: '6px',
          background: 'rgba(212, 168, 75, 0.08)',
          color: '#D4A84B',
        }}
      >
        {icon}
      </span>
      <span style={{ fontWeight: 600, fontSize: '14px', color: themeMode === 'dark' ? '#fff' : '#1f1f1f' }}>
        {title}
      </span>
    </div>
  );
};
export default FilterSectionHeader;
