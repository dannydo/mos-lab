import { SERUM_TIERS_CVL } from '../../state/mockData';

export const COMMON_STYLES = ['Natural', 'Katun', 'Baby Doll', 'Sexy', 'Whispy', 'Mắt Mèo', 'Thiết Kế Riêng'];

export const COMMON_COMBOS = [
  { name: 'Không dùng Combo', price: 0 },
  { name: 'Gói 3 Lần (Tiết kiệm)', price: 1170000 },
  { name: 'Gói 5 Lần (Phổ biến)', price: 1850000 },
  { name: 'Gói 10 Lần (VIP)', price: 3500000 },
];

export const COMMON_UNDER_COMBOS = [
  { name: 'Không dùng Mi Dưới', price: 0 },
  { name: 'Mi Dưới 3 Lần', price: 450000 },
  { name: 'Mi Dưới 5 Lần', price: 700000 },
];

export const REAL_UPSELL_PRODUCTS = SERUM_TIERS_CVL.map((tier) => ({
  productName: tier.id === 'serum-orig' ? 'Dưỡng Mi Yeppeum Korea' : `Dưỡng Mi Yeppeum Korea (${tier.label})`,
  price: tier.price,
  cvBonus: tier.cvBonus,
  desc: tier.desc,
}));
