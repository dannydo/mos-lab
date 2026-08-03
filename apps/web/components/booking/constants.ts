export const STORES = [
  { id: 16, name: 'Estella Place', fullAddress: 'L5-08, 09 Estella Place, 88 Song Hành, Quận 2' },
  { id: 6, name: 'De Tham', fullAddress: '159 - 159A Đề Thám, Quận 1' },
  { id: 2, name: 'Phan Xích Long', fullAddress: 'Phan Xích Long, Phú Nhuận' },
];

export const getStoreFullAddress = (store: SafeAny): string => {
  if (!store) return '159 - 159A Đề Thám, Quận 1';
  if (typeof store === 'object') {
    if (store.fullAddress) return store.fullAddress;
    const matched = STORES.find((s) => s.id === store.id || s.name === store.name);
    if (matched?.fullAddress) return matched.fullAddress;
  }
  const storeStr = String(store).toLowerCase();
  if (storeStr.includes('estella')) return 'L5-08, 09 Estella Place, 88 Song Hành, Quận 2';
  if (storeStr.includes('tham') || storeStr.includes('thám')) return '159 - 159A Đề Thám, Quận 1';
  if (storeStr.includes('phan xích long') || storeStr.includes('pxl')) return 'Phan Xích Long, Phú Nhuận';
  return String(store);
};

export const FALLBACK_SERVICES = [{ id: 0, name: 'Any Lashes / Any Services', price: 0, duration: 90 }];

export const CHANNELS = [
  { key: 'FB', label: 'FB (Facebook)' },
  { key: 'ZALO', label: 'ZALO' },
  { key: 'SMS', label: 'SMS' },
  { key: 'HOTLINE', label: 'HOTLINE' },
  { key: 'WA', label: 'WA (WhatsApp)' },
  { key: 'VL', label: 'VL (Viber)' },
  { key: 'GB', label: 'GB (Google Business)' },
];

export const getOffDaysText = (offDays?: string[]) => {
  if (!offDays || offDays.length === 0) return '';
  const weekdayMap: { [key: string]: string } = {
    '1': 'T2',
    '2': 'T3',
    '3': 'T4',
    '4': 'T5',
    '5': 'T6',
    '6': 'T7',
    '7': 'CN',
  };
  return (
    'Off: ' +
    offDays
      .map((d) => weekdayMap[d])
      .filter(Boolean)
      .join(', ')
  );
};
