export interface TodayStatsPaletteToken {
  color: string;
  dotClass: string;
}

export const TODAY_STATS_COLORS = {
  combo: {
    color: 'rgba(212, 168, 75, 1)',
    dotClass: 'bg-[rgba(212,168,75,1)]',
  },
  tele: {
    color: 'rgba(82, 196, 26, 1)',
    dotClass: 'bg-[rgba(82,196,26,1)]',
  },
  other: {
    color: 'rgba(24, 144, 255, 1)',
    dotClass: 'bg-[rgba(24,144,255,1)]',
  },
  detham: {
    color: 'rgba(114, 46, 209, 1)',
    dotClass: 'bg-[rgba(114,46,209,1)]',
  },
  estella: {
    color: 'rgba(19, 194, 194, 1)',
    dotClass: 'bg-[rgba(19,194,194,1)]',
  },
  done: {
    color: 'rgba(82, 196, 26, 1)',
    dotClass: 'bg-[rgba(82,196,26,1)]',
  },
  serving: {
    color: 'rgba(19, 194, 194, 1)',
    dotClass: 'bg-[rgba(19,194,194,1)]',
  },
  late: {
    color: 'rgba(255, 77, 79, 1)',
    dotClass: 'bg-[rgba(255,77,79,1)]',
  },
  pending: {
    color: 'rgba(250, 173, 20, 1)',
    dotClass: 'bg-[rgba(250,173,20,1)]',
  },
  single: {
    color: 'rgba(24, 144, 255, 1)',
    dotClass: 'bg-[rgba(24,144,255,1)]',
  },
  product: {
    color: 'rgba(250, 140, 22, 1)',
    dotClass: 'bg-[rgba(250,140,22,1)]',
  },
} as const satisfies Record<string, TodayStatsPaletteToken>;

export const DONUT_TRACK_COLORS = {
  light: 'rgba(240, 240, 240, 1)',
  dark: 'rgba(45, 45, 45, 1)',
} as const;
