export type CatalogViewMode = 'month' | 'week' | 'day';
export type CatalogFilterItemType = 'all' | 'service' | 'combo' | 'product';

export const LASH_STYLE_OPTIONS = [
  { value: 'Classic', label: 'Classic' },
  { value: 'Mink', label: 'Mink' },
  { value: 'Volume 3D', label: 'Volume 3D' },
  { value: 'Volume 4D', label: 'Volume 4D' },
  { value: 'Volume 5D', label: 'Volume 5D' },
  { value: 'Ultralight', label: 'Ultralight' },
  { value: 'Hyperlight', label: 'Hyperlight' },
  { value: 'Flawless', label: 'Flawless' },
  { value: 'Ivylight', label: 'Ivylight' },
  { value: 'Under Mink', label: 'Under Mink' },
];

export const CATALOG_GROUP_LABELS: Record<string, string> = {
  LashesTop: 'LashesTop (Mi trên)',
  LashesUnder: 'LashesUnder (Mi dưới)',
  LashLift: 'LashLift (Uốn mi)',
  Product: 'Product (Giỏ hàng)',
};

export const CATALOG_TYPE_LABELS: Record<string, string> = {
  Normal: 'Normal (Nối mới)',
  Retain: 'Retain (Dặm mi)',
  Removal: 'Removal (Tháo mi)',
  Product: 'Product (Giỏ hàng)',
};

export const inferLashStyle = (serviceKey?: string, serviceName?: string): string | null => {
  const key = (serviceKey || '').toLowerCase();
  const name = (serviceName || '').toLowerCase();
  if (key === 'any-service-product' || key.includes('product') || name.includes('shopping cart')) {
    return null;
  }
  const combined = `${key} ${name}`;
  if (key.startsWith('lash-lift') || combined.includes('lash lift') || combined.includes('uốn mi')) return 'Lash Lift';
  if (key.startsWith('ivylight-') || combined.includes('ivylight')) return 'Ivylight';
  if (
    key.startsWith('flawless-') ||
    combined.includes('flawless') ||
    key.startsWith('mink-') ||
    combined.includes('mink')
  ) {
    return 'Mink';
  }
  if (key.startsWith('hyperlight-') || combined.includes('hyperlight')) return 'Hyperlight';
  if (key.startsWith('ultralight-') || combined.includes('ultralight') || combined.includes('ultra light')) {
    return 'Ultralight';
  }
  if (key.startsWith('volume-') || combined.includes('volume')) return 'Volume 3D';
  if (key.startsWith('under-mink-') || combined.includes('under mink') || combined.includes('lashes under')) {
    return 'Under Mink';
  }
  if (key.startsWith('classic-') || combined.includes('classic')) return 'Classic';
  return 'Classic';
};

export const inferLashCount = (serviceKey?: string, serviceName?: string): number | null => {
  const key = (serviceKey || '').toLowerCase();
  const name = (serviceName || '').toLowerCase();
  if (key === 'any-service-product' || key.includes('product') || name.includes('shopping cart')) {
    return null;
  }
  const combined = `${key} ${name}`;
  const countMatch = combined.match(/(\d{2,3})\s*(sợi|soi|lashes|sợ)/);
  if (countMatch) {
    return parseInt(countMatch[1], 10);
  }
  return null;
};

export const getLashStyleStatusType = (style?: string) => {
  if (!style) return 'default' as const;
  const lower = style.toLowerCase();
  if (lower.includes('classic')) return 'success' as const;
  if (lower.includes('mink') && !lower.includes('under')) return 'orange' as const;
  if (lower.includes('ivylight')) return 'purple' as const;
  if (lower.includes('ultralight')) return 'cyan' as const;
  if (lower.includes('hyperlight')) return 'purple' as const;
  if (lower.includes('flawless')) return 'gold' as const;
  if (lower.includes('volume')) return 'processing' as const;
  if (lower.includes('under')) return 'orange' as const;
  if (lower.includes('lift')) return 'gold' as const;
  return 'processing' as const;
};

export const getLashStyleTagColor = (style?: string) => {
  if (!style) return 'default';
  const lower = style.toLowerCase();
  if (lower.includes('classic')) return 'green';
  if (lower.includes('mink') && !lower.includes('under')) return 'orange';
  if (lower.includes('ivylight')) return 'purple';
  if (lower.includes('ultralight')) return 'cyan';
  if (lower.includes('hyperlight')) return 'magenta';
  if (lower.includes('flawless')) return 'gold';
  if (lower.includes('volume')) return 'blue';
  if (lower.includes('under')) return 'volcano';
  if (lower.includes('lift')) return 'gold';
  return 'geekblue';
};

export const getLastPage = (total: number, pageSize: number) => Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

export const formatCatalogCurrency = (val: number | undefined) => {
  if (val === undefined || val === null) return '-';
  return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
};
