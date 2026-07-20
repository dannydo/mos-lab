import type { ThemeConfig } from 'antd';

const theme: ThemeConfig = {
  token: {
    fontFamily: 'var(--font-sans, "Outfit", -apple-system, BlinkMacSystemFont, sans-serif)',
    colorPrimary: '#3b82f6', // Blue primary
    colorSuccess: '#10b981', // Green
    colorWarning: '#f59e0b', // Warning amber
    colorError: '#ef4444', // Red
    borderRadius: 8,
  },
  components: {
    Button: {
      fontWeight: 600,
      borderRadius: 6,
    },
    Table: {
      headerBg: '#f8fafc', // Light slate
      headerColor: '#475569',
      rowHoverBg: '#f1f5f9',
    },
    Modal: {
      headerBg: '#ffffff',
      titleColor: '#0f172a',
    },
  },
};

export default theme;
