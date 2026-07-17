export const STORES = [
  { id: 16, name: 'Estella Place' },
  { id: 6, name: 'De Tham' },
  { id: 2, name: 'Phan Xích Long' },
];

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
