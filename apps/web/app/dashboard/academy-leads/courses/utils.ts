type SafeAny = any;

export function formatVndInput(value?: number | string | null): string {
  if (value === undefined || value === null || value === '') return '';
  return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ';
}

export function parseVndInput(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return '';
  const digits = String(value).replace(/\D/g, '');
  return digits ? (digits as SafeAny) : '';
}
