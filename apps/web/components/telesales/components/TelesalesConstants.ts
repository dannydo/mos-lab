import {
  PhoneOutlined,
  CustomerServiceOutlined,
  SmileOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

export const metricConfigs = [
  {
    key: 'calls',
    label: 'Calls',
    icon: '📞',
    color: '#3B82F6',
    gradId: 'callsGrad',
    antIcon: PhoneOutlined,
    bgGradient: 'from-blue-600 to-cyan-400',
    shadowGlow: 'shadow-blue-500/20',
    lightBg: 'bg-blue-50/70 text-blue-600 border-blue-100',
    darkBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  {
    key: 'pickups',
    label: 'Pickups',
    icon: '📱',
    color: '#8B5CF6',
    gradId: 'pickupsGrad',
    antIcon: CustomerServiceOutlined,
    bgGradient: 'from-purple-600 to-fuchsia-400',
    shadowGlow: 'shadow-purple-500/20',
    lightBg: 'bg-purple-50/70 text-purple-600 border-purple-100',
    darkBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  {
    key: 'happy',
    label: 'Happy Call',
    icon: '😊',
    color: '#F59E0B',
    gradId: 'happyGrad',
    antIcon: SmileOutlined,
    bgGradient: 'from-amber-500 to-orange-400',
    shadowGlow: 'shadow-amber-500/20',
    lightBg: 'bg-amber-50/70 text-amber-600 border-amber-100',
    darkBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  {
    key: 'booked',
    label: 'Booked',
    icon: '📅',
    color: '#F97316',
    gradId: 'bookedGrad',
    antIcon: CalendarOutlined,
    bgGradient: 'from-orange-500 to-amber-500',
    shadowGlow: 'shadow-orange-500/20',
    lightBg: 'bg-orange-50/70 text-orange-600 border-orange-100',
    darkBg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  {
    key: 'done',
    label: 'Done Deal',
    icon: '✅',
    color: '#10B981',
    gradId: 'doneGrad',
    antIcon: CheckCircleOutlined,
    bgGradient: 'from-emerald-600 to-teal-400',
    shadowGlow: 'shadow-emerald-500/20',
    lightBg: 'bg-emerald-50/70 text-emerald-600 border-emerald-100',
    darkBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
];

export const periods = [
  { id: 'last_month', label: 'Tháng trước' },
  { id: 'last_week', label: 'Tuần trước' },
  { id: 'yesterday', label: 'Hôm qua' },
  { id: 'today', label: 'Hôm nay' },
  { id: 'this_week', label: 'Tuần này' },
  { id: 'this_month', label: 'Tháng này' },
];

export const radialCoords = [
  { x: 0, y: -78 },
  { x: 68, y: -39 },
  { x: 68, y: 39 },
  { x: 0, y: 78 },
  { x: -68, y: 39 },
  { x: -68, y: -39 },
];

export const periodPositions: Record<string, string> = {
  last_month: '5%',
  last_week: '20%',
  yesterday: '35%',
  today: '65%',
  this_week: '80%',
  this_month: '95%',
};
