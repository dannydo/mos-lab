'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { removeVietnameseTones } from '@mos-lab/shared';

export type MosChatStickerPackId = 'wings' | 'cat' | 'quby' | 'pepe' | '3d' | 'emoji';

export interface MosChatStickerItem {
  id: string;
  packId: Exclude<MosChatStickerPackId, 'emoji'>;
  title: string;
  caption?: string;
  captionBg?: string;
  captionColor?: string;
  keywords: string[];
  notoCode?: string;
  customSvg?:
    | 'cat-bongo'
    | 'cat-vibing'
    | 'cat-knife'
    | 'cat-ok'
    | 'quby-heart-gun'
    | 'quby-tantrum'
    | 'quby-cheer'
    | 'quby-bow'
    | 'quby-bonk'
    | 'quby-coffee'
    | 'quby-overload'
    | 'quby-shy'
    | 'quby-money'
    | 'quby-yes'
    | 'pepe-monkas'
    | 'pepe-clap'
    | 'pepe-cry'
    | 'pepe-hype'
    | 'pepe-run'
    | 'pepe-smart';
  fallbackEmoji: string;
  glowColor?: string;
}

export const MOS_CHAT_STICKER_PACK_TABS: Array<{
  id: MosChatStickerPackId;
  label: string;
  shortLabel: string;
  icon: string;
}> = [
  { id: 'wings', label: 'Đặc sản Wings', shortLabel: 'Wings', icon: '🔥' },
  { id: 'cat', label: 'Mèo Bựa Công Sở', shortLabel: 'Mèo Bựa', icon: '🐱' },
  { id: 'quby', label: 'Bé Quby & Đào', shortLabel: 'Quby', icon: '👶' },
  { id: 'pepe', label: 'Ếch Pepe Bựa', shortLabel: 'Pepe', icon: '🐸' },
  { id: '3d', label: '3D Động Google', shortLabel: '3D Động', icon: '✨' },
  { id: 'emoji', label: 'Emoji Chữ', shortLabel: 'Emoji', icon: '😀' },
];

export const MOS_CHAT_STICKERS: MosChatStickerItem[] = [
  // =========================================================================
  // PACK 1: ĐẶC SẢN WINGS (VUI & BỰA CÔNG SỞ)
  // =========================================================================
  {
    id: 'wings-chot-don',
    packId: 'wings',
    title: 'Chốt đơn liền tay',
    caption: 'CHỐT ĐƠN!! 🔥',
    captionBg: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
    captionColor: '#ffffff',
    keywords: ['chot don', 'tien', 'no don', 'ban hang', 'fire', 'money'],
    notoCode: '1f4b8',
    fallbackEmoji: '💸',
    glowColor: 'rgba(239, 68, 68, 0.35)',
  },
  {
    id: 'wings-dinh-noc',
    packId: 'wings',
    title: 'Đỉnh nóc kịch trần',
    caption: 'ĐỈNH NÓC KỊCH TRẦN!',
    captionBg: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    captionColor: '#ffffff',
    keywords: ['dinh noc', 'kich tran', 'bay phap phoi', 'rocket', 'vip'],
    notoCode: '1f680',
    fallbackEmoji: '🚀',
    glowColor: 'rgba(139, 92, 246, 0.35)',
  },
  {
    id: 'wings-da-ro-sep',
    packId: 'wings',
    title: 'Đã rõ thưa sếp',
    caption: 'ĐÃ RÕ THƯA SẾP! 🫡',
    captionBg: 'linear-gradient(135deg, #d4a84b 0%, #b45309 100%)',
    captionColor: '#000000',
    keywords: ['da ro', 'thua sep', 'ok sep', 'nhan lenh', 'salute'],
    notoCode: '1fae1',
    fallbackEmoji: '🫡',
    glowColor: 'rgba(212, 168, 75, 0.4)',
  },
  {
    id: 'wings-cuu-be',
    packId: 'wings',
    title: 'Cứu bé với',
    caption: 'CỨU BÉ!! 😭',
    captionBg: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
    captionColor: '#ffffff',
    keywords: ['cuu be', 'khoc', 'sos', 'deadline', 'help'],
    notoCode: '1f62d',
    fallbackEmoji: '😭',
    glowColor: 'rgba(14, 165, 233, 0.35)',
  },
  {
    id: 'wings-10-diem',
    packId: 'wings',
    title: '10 điểm không có nhưng',
    caption: '10 ĐIỂM KO NHƯNG!',
    captionBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    captionColor: '#ffffff',
    keywords: ['10 diem', 'khong co nhung', '100', 'xuat sac', 'chuan'],
    notoCode: '1f4af',
    fallbackEmoji: '💯',
    glowColor: 'rgba(16, 185, 129, 0.35)',
  },
  {
    id: 'wings-chay-may',
    packId: 'wings',
    title: 'Đang gọi cháy máy',
    caption: 'GỌI CHÁY MÁY! 🚨',
    captionBg: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
    captionColor: '#ffffff',
    keywords: ['goi chay may', 'telesales', 'booker', 'khan cap', 'gap'],
    notoCode: '1f6a8',
    fallbackEmoji: '🚨',
    glowColor: 'rgba(225, 29, 72, 0.35)',
  },
  {
    id: 'wings-xin-via',
    packId: 'wings',
    title: 'Xin vía khách VIP',
    caption: 'XIN VÍA KHÁCH VIP 💎',
    captionBg: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    captionColor: '#ffffff',
    keywords: ['xin via', 'khach vip', 'combo', 'kim cuong', 'loc'],
    notoCode: '1f48e',
    fallbackEmoji: '💎',
    glowColor: 'rgba(6, 182, 212, 0.35)',
  },
  {
    id: 'wings-no-nao',
    packId: 'wings',
    title: 'Nổ não luôn',
    caption: 'NỔ NÃO RỒI!! 🤯',
    captionBg: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
    captionColor: '#000000',
    keywords: ['no nao', 'shock', 'kinh khung', 'ao ma'],
    notoCode: '1f92f',
    fallbackEmoji: '🤯',
    glowColor: 'rgba(245, 158, 11, 0.35)',
  },
  {
    id: 'wings-no-don',
    packId: 'wings',
    title: 'Nổ đơn rực rỡ',
    caption: 'NỔ ĐƠN RỰC RỠ! 🎉',
    captionBg: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
    captionColor: '#ffffff',
    keywords: ['no don', 'an mung', 'party', 'chuc mung'],
    notoCode: '1f389',
    fallbackEmoji: '🎉',
    glowColor: 'rgba(236, 72, 153, 0.35)',
  },
  {
    id: 'wings-gap-lam',
    packId: 'wings',
    title: 'Gấp lắm rồi',
    caption: 'GẤP LẮM RỒI!! ⏰',
    captionBg: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
    captionColor: '#ffffff',
    keywords: ['gap lam roi', 'nhanh len', 'alarm', 'urgent'],
    notoCode: '23f0',
    fallbackEmoji: '⏰',
    glowColor: 'rgba(239, 68, 68, 0.35)',
  },
  {
    id: 'wings-da-ta',
    packId: 'wings',
    title: 'Đa tạ đại ca',
    caption: 'ĐA TẠ ĐẠI CA! 🙏',
    captionBg: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
    captionColor: '#000000',
    keywords: ['da ta', 'cam on', 'lay hon', 'thank you', 'pray'],
    notoCode: '1f64f',
    fallbackEmoji: '🙏',
    glowColor: 'rgba(251, 191, 36, 0.35)',
  },
  {
    id: 'wings-ngon-luon',
    packId: 'wings',
    title: 'Ngon lành cành đào',
    caption: 'NGON LUÔN! 😎',
    captionBg: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    captionColor: '#ffffff',
    keywords: ['ngon luon', 'ngau', 'cool', 'xong phim'],
    notoCode: '1f60e',
    fallbackEmoji: '😎',
    glowColor: 'rgba(20, 184, 166, 0.35)',
  },
  {
    id: 'wings-ua-alo',
    packId: 'wings',
    title: 'Ủa alo gì vậy',
    caption: 'ỦA ALO?? 🤨',
    captionBg: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    captionColor: '#ffffff',
    keywords: ['ua alo', 'cham hoi', 'nghi ngo', 'wtf'],
    notoCode: '1f928',
    fallbackEmoji: '🤨',
    glowColor: 'rgba(99, 102, 241, 0.35)',
  },
  {
    id: 'wings-hong-bien',
    packId: 'wings',
    title: 'Hóng biến cực căng',
    caption: 'HÓNG BIẾN... 👀',
    captionBg: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
    captionColor: '#ffffff',
    keywords: ['hong bien', 'drama', 'nhin', 'eyes'],
    notoCode: '1f440',
    fallbackEmoji: '👀',
    glowColor: 'rgba(168, 85, 247, 0.35)',
  },
  {
    id: 'wings-tan-chay',
    packId: 'wings',
    title: 'Tan chảy vì deadline',
    caption: 'TAN CHẢY LUÔN 🫠',
    captionBg: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    captionColor: '#ffffff',
    keywords: ['tan chay', 'met moi', 'melting', 'nong'],
    notoCode: '1fae0',
    fallbackEmoji: '🫠',
    glowColor: 'rgba(249, 115, 22, 0.35)',
  },
  {
    id: 'wings-quay-len',
    packId: 'wings',
    title: 'Quẩy lên chị em ơi',
    caption: 'QUẨY LÊN CHỊ EM! 💃',
    captionBg: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    captionColor: '#ffffff',
    keywords: ['quay len', 'nhay', 'dance', 'party'],
    notoCode: '1f483',
    fallbackEmoji: '💃',
    glowColor: 'rgba(236, 72, 153, 0.35)',
  },

  // =========================================================================
  // PACK 2: MÈO BỰA CÔNG SỞ (BONGO CAT, CATJAM, MÈO KHÓC, MÈO LƯỜM...)
  // =========================================================================
  {
    id: 'cat-bongo',
    packId: 'cat',
    title: 'Mèo gõ phím chạy deadline',
    caption: 'DEADLINE DÍ!! ⌨️',
    captionBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    captionColor: '#000000',
    keywords: ['meo go phim', 'bongo cat', 'deadline', 'code', 'ban phim'],
    customSvg: 'cat-bongo',
    fallbackEmoji: '🐱',
    glowColor: 'rgba(245, 158, 11, 0.35)',
  },
  {
    id: 'cat-vibing',
    packId: 'cat',
    title: 'CatJam gật đầu chill',
    caption: 'CHILL PHẾT~ 🎧',
    captionBg: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    captionColor: '#ffffff',
    keywords: ['catjam', 'meo gat dau', 'chill', 'vibing', 'nhac'],
    customSvg: 'cat-vibing',
    fallbackEmoji: '🐱',
    glowColor: 'rgba(139, 92, 246, 0.35)',
  },
  {
    id: 'cat-knife',
    packId: 'cat',
    title: 'Mèo lườm nguýt',
    caption: 'NÓI LẠI XEM NÀO? 🔪',
    captionBg: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
    captionColor: '#ffffff',
    keywords: ['meo luom', 'meo cam dao', 'gian', 'bua', 'cat knife'],
    customSvg: 'cat-knife',
    fallbackEmoji: '😾',
    glowColor: 'rgba(239, 68, 68, 0.35)',
  },
  {
    id: 'cat-ok',
    packId: 'cat',
    title: 'Mèo giơ ngón cái Uy Tín',
    caption: 'UY TÍN LUÔN! 👍',
    captionBg: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    captionColor: '#ffffff',
    keywords: ['meo ok', 'uy tin', 'like', 'duyet'],
    customSvg: 'cat-ok',
    fallbackEmoji: '😺',
    glowColor: 'rgba(16, 185, 129, 0.35)',
  },
  {
    id: 'cat-laugh',
    packId: 'cat',
    title: 'Mèo cười ra nước mắt',
    caption: 'CƯỜI XỈU =)))',
    captionBg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    captionColor: '#000000',
    keywords: ['meo cuoi', 'haha', 'cuoi xiu', 'cat laugh'],
    notoCode: '1f639',
    fallbackEmoji: '😹',
    glowColor: 'rgba(251, 191, 36, 0.35)',
  },
  {
    id: 'cat-cry',
    packId: 'cat',
    title: 'Mèo khóc lụt nhà',
    caption: 'TỔN THƯƠNG SÂU SẮC',
    captionBg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    captionColor: '#ffffff',
    keywords: ['meo khoc', 'buon', 'ton thuong', 'crying cat'],
    notoCode: '1f63f',
    fallbackEmoji: '😿',
    glowColor: 'rgba(59, 130, 246, 0.35)',
  },
  {
    id: 'cat-smirk',
    packId: 'cat',
    title: 'Mèo cười nửa miệng',
    caption: 'BIẾT TỎNG NHA 😼',
    captionBg: 'linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)',
    captionColor: '#ffffff',
    keywords: ['meo nhếch mép', 'biet tong', 'gian', 'smirk'],
    notoCode: '1f63c',
    fallbackEmoji: '😼',
    glowColor: 'rgba(168, 85, 247, 0.35)',
  },
  {
    id: 'cat-shock',
    packId: 'cat',
    title: 'Mèo hoang mang tột độ',
    caption: 'HẢ CÁI GÌ CƠ?! 🙀',
    captionBg: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
    captionColor: '#ffffff',
    keywords: ['meo hot hoang', 'shock', 'omg', 'ha'],
    notoCode: '1f640',
    fallbackEmoji: '🙀',
    glowColor: 'rgba(249, 115, 22, 0.35)',
  },
  {
    id: 'cat-love',
    packId: 'cat',
    title: 'Mèo mắt trái tim',
    caption: 'MÊ CHỮ Ê KÉO DÀI',
    captionBg: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    captionColor: '#ffffff',
    keywords: ['meo yeu', 'tha tim', 'me', 'love'],
    notoCode: '1f63b',
    fallbackEmoji: '😻',
    glowColor: 'rgba(236, 72, 153, 0.35)',
  },
  {
    id: 'cat-angry',
    packId: 'cat',
    title: 'Quàng thượng dỗi',
    caption: 'DỖI THẬT SỰ! 😾',
    captionBg: 'linear-gradient(135deg, #e11d48 0%, #9f1239 100%)',
    captionColor: '#ffffff',
    keywords: ['meo doi', 'gian', 'quang thuong'],
    notoCode: '1f63e',
    fallbackEmoji: '😾',
    glowColor: 'rgba(225, 29, 72, 0.35)',
  },
  {
    id: 'cat-kiss',
    packId: 'cat',
    title: 'Mèo thơm má',
    caption: 'CHỤT CHỤT~ 😽',
    captionBg: 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)',
    captionColor: '#ffffff',
    keywords: ['meo hon', 'chut chut', 'kiss'],
    notoCode: '1f63d',
    fallbackEmoji: '😽',
    glowColor: 'rgba(244, 114, 182, 0.35)',
  },
  {
    id: 'cat-grin',
    packId: 'cat',
    title: 'Mèo cười híp mắt',
    caption: 'HEHE CHUẨN BÀI 😸',
    captionBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    captionColor: '#ffffff',
    keywords: ['meo cuoi hip mat', 'hehe', 'vui'],
    notoCode: '1f638',
    fallbackEmoji: '😸',
    glowColor: 'rgba(16, 185, 129, 0.35)',
  },

  // =========================================================================
  // PACK 3: BÉ QUBY & MOCHI ĐÀO (LẦY LỘI & DỄ THƯƠNG)
  // =========================================================================
  {
    id: 'quby-heart-gun',
    packId: 'quby',
    title: 'Quby bắn tim liên thanh',
    caption: 'BẮN TIM NÈ!! 💕',
    captionBg: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
    captionColor: '#ffffff',
    keywords: ['quby ban tim', 'yeu', 'tha tim', 'heart'],
    customSvg: 'quby-heart-gun',
    fallbackEmoji: '🥰',
    glowColor: 'rgba(236, 72, 153, 0.35)',
  },
  {
    id: 'quby-tantrum',
    packId: 'quby',
    title: 'Quby ăn vạ khóc nhè',
    caption: 'KO CHỊU ĐÂU HUHU',
    captionBg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    captionColor: '#ffffff',
    keywords: ['quby an va', 'khoc nhe', 'huhu', 'khong chiu'],
    customSvg: 'quby-tantrum',
    fallbackEmoji: '😭',
    glowColor: 'rgba(59, 130, 246, 0.35)',
  },
  {
    id: 'quby-cheer',
    packId: 'quby',
    title: 'Quby tung hoa cổ vũ',
    caption: 'YAYYY CỐ LÊN!! 🎉',
    captionBg: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
    captionColor: '#ffffff',
    keywords: ['quby co vu', 'tung hoa', 'cheer', 'co len'],
    customSvg: 'quby-cheer',
    fallbackEmoji: '🥳',
    glowColor: 'rgba(245, 158, 11, 0.35)',
  },
  {
    id: 'quby-bow',
    packId: 'quby',
    title: 'Quby cúi đầu cảm ơn',
    caption: 'CẢM ƠN NHIỀU Ạ! 🙇',
    captionBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    captionColor: '#ffffff',
    keywords: ['quby cam on', 'cui dau', 'thank you'],
    customSvg: 'quby-bow',
    fallbackEmoji: '🙇',
    glowColor: 'rgba(16, 185, 129, 0.35)',
  },
  {
    id: 'quby-bonk',
    packId: 'quby',
    title: 'Quby gõ búa tỉnh ngủ',
    caption: 'BONK! TỈNH TÁO LÊN',
    captionBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    captionColor: '#ffffff',
    keywords: ['quby bonk', 'go dau', 'bua', 'tinh ngu'],
    customSvg: 'quby-bonk',
    fallbackEmoji: '🔨',
    glowColor: 'rgba(239, 68, 68, 0.35)',
  },
  {
    id: 'quby-coffee',
    packId: 'quby',
    title: 'Quby hút trà sữa hóng chuyện',
    caption: 'KỂ TIẾP ĐI BẠN ƠI 🧋',
    captionBg: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    captionColor: '#ffffff',
    keywords: ['quby tra sua', 'hong chuyen', 'boba', 'chill'],
    customSvg: 'quby-coffee',
    fallbackEmoji: '🧋',
    glowColor: 'rgba(139, 92, 246, 0.35)',
  },
  {
    id: 'quby-overload',
    packId: 'quby',
    title: 'Quby xỉu ngang vì đuối',
    caption: 'XỈU UP XỈU DOWN 💫',
    captionBg: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
    captionColor: '#ffffff',
    keywords: ['quby xiu', 'met qua', 'duoi', 'overload'],
    customSvg: 'quby-overload',
    fallbackEmoji: '😵',
    glowColor: 'rgba(100, 116, 139, 0.35)',
  },
  {
    id: 'quby-shy',
    packId: 'quby',
    title: 'Quby ngại ngùng đỏ mặt',
    caption: 'NGẠI GHÊ Á 👉👈',
    captionBg: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
    captionColor: '#ffffff',
    keywords: ['quby ngai', 'do mat', 'shy', 'cute'],
    customSvg: 'quby-shy',
    fallbackEmoji: '😳',
    glowColor: 'rgba(244, 114, 182, 0.35)',
  },
  {
    id: 'quby-money',
    packId: 'quby',
    title: 'Quby ôm tiền Ting Ting',
    caption: 'TING TING VỀ VÍ! 💸',
    captionBg: 'linear-gradient(135deg, #d4a84b 0%, #b45309 100%)',
    captionColor: '#000000',
    keywords: ['quby tien', 'ting ting', 'luong ve', 'thuong'],
    customSvg: 'quby-money',
    fallbackEmoji: '🤑',
    glowColor: 'rgba(212, 168, 75, 0.4)',
  },
  {
    id: 'quby-yes',
    packId: 'quby',
    title: 'Quby chốt luôn',
    caption: 'TRIỂN LUÔN! ✨',
    captionBg: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
    captionColor: '#ffffff',
    keywords: ['quby ok', 'trien luon', 'yes', 'dong y'],
    customSvg: 'quby-yes',
    fallbackEmoji: '✨',
    glowColor: 'rgba(6, 182, 212, 0.35)',
  },
  {
    id: 'quby-hug',
    packId: 'quby',
    title: 'Ôm cái cho đỡ buồn',
    caption: 'THƯƠNG THƯƠNG 🤗',
    captionBg: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)',
    captionColor: '#ffffff',
    keywords: ['om', 'thuong thuong', 'hug'],
    notoCode: '1f917',
    fallbackEmoji: '🤗',
    glowColor: 'rgba(251, 146, 60, 0.35)',
  },
  {
    id: 'quby-plead',
    packId: 'quby',
    title: 'Mắt long lanh năn nỉ',
    caption: 'NĂN NỈ ĐÓOO 🥺',
    captionBg: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
    captionColor: '#ffffff',
    keywords: ['nan ni', 'xin xo', 'mat long lanh', 'pleading'],
    notoCode: '1f97a',
    fallbackEmoji: '🥺',
    glowColor: 'rgba(168, 85, 247, 0.35)',
  },

  // =========================================================================
  // PACK 4: ẾCH PEPE / PEEPO BỰA (MEME HUYỀN THOẠI)
  // =========================================================================
  {
    id: 'pepe-monkas',
    packId: 'pepe',
    title: 'Pepe MonkaS toát mồ hôi hột',
    caption: 'CĂNG CỰC CĂNG... 💦',
    captionBg: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
    captionColor: '#ffffff',
    keywords: ['pepe', 'monkas', 'toat mo hoi', 'run', 'lo lang'],
    customSvg: 'pepe-monkas',
    fallbackEmoji: '🐸',
    glowColor: 'rgba(14, 165, 233, 0.35)',
  },
  {
    id: 'pepe-clap',
    packId: 'pepe',
    title: 'PeepoClap vỗ tay rần rần',
    caption: 'QUÁ ĐẲNG CẤP! 👏',
    captionBg: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
    captionColor: '#ffffff',
    keywords: ['pepe clap', 'peepoclap', 'vo tay', 'ez clap'],
    customSvg: 'pepe-clap',
    fallbackEmoji: '🐸',
    glowColor: 'rgba(34, 197, 94, 0.35)',
  },
  {
    id: 'pepe-cry',
    packId: 'pepe',
    title: 'PepeHands khóc thành dòng sông',
    caption: 'ĐAU LÒNG QUÁ MAN',
    captionBg: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
    captionColor: '#ffffff',
    keywords: ['pepe cry', 'pepehands', 'sadge', 'khoc'],
    customSvg: 'pepe-cry',
    fallbackEmoji: '🐸',
    glowColor: 'rgba(37, 99, 235, 0.35)',
  },
  {
    id: 'pepe-hype',
    packId: 'pepe',
    title: 'PepeHype quẩy cực sung',
    caption: 'LÊN LUÔN ANH EM! 🔥',
    captionBg: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    captionColor: '#ffffff',
    keywords: ['pepe hype', 'quay', 'party', 'len luon'],
    customSvg: 'pepe-hype',
    fallbackEmoji: '🐸',
    glowColor: 'rgba(236, 72, 153, 0.35)',
  },
  {
    id: 'pepe-run',
    packId: 'pepe',
    title: 'PeepoRun vắt chân lên cổ chạy',
    caption: 'CHẠY NGAY ĐI!! 💨',
    captionBg: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
    captionColor: '#ffffff',
    keywords: ['pepe run', 'chay ngay di', 'tron', 'deadline'],
    customSvg: 'pepe-run',
    fallbackEmoji: '🐸',
    glowColor: 'rgba(249, 115, 22, 0.35)',
  },
  {
    id: 'pepe-smart',
    packId: 'pepe',
    title: 'Pepe 200 IQ não to',
    caption: '200 IQ VŨ TRỤ 🧠',
    captionBg: 'linear-gradient(135deg, #8b5cf6 0%, #4c1d95 100%)',
    captionColor: '#ffffff',
    keywords: ['pepe 200 iq', 'thong minh', 'nao to', 'smart'],
    customSvg: 'pepe-smart',
    fallbackEmoji: '🧠',
    glowColor: 'rgba(139, 92, 246, 0.35)',
  },
  {
    id: 'pepe-clown',
    packId: 'pepe',
    title: 'Chúa hề vũ trụ',
    caption: 'CHÚA HỀ VŨ TRỤ 🤡',
    captionBg: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
    captionColor: '#ffffff',
    keywords: ['chua he', 'clown', 'doi quan', 'bua'],
    notoCode: '1f921',
    fallbackEmoji: '🤡',
    glowColor: 'rgba(239, 68, 68, 0.35)',
  },
  {
    id: 'pepe-skull',
    packId: 'pepe',
    title: 'Khô héo xỉu ngang',
    caption: 'XỈU NGANG LUÔN 💀',
    captionBg: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
    captionColor: '#ffffff',
    keywords: ['skull', 'xiu ngang', 'kho heo', 'chet cuoi'],
    notoCode: '1f480',
    fallbackEmoji: '💀',
    glowColor: 'rgba(71, 85, 105, 0.35)',
  },
  {
    id: 'pepe-ghost',
    packId: 'pepe',
    title: 'Hồn bay phách lạc',
    caption: 'BAY MÀU LUÔN 👻',
    captionBg: 'linear-gradient(135deg, #6366f1 0%, #312e81 100%)',
    captionColor: '#ffffff',
    keywords: ['ghost', 'ma', 'bay mau', 'hon bay'],
    notoCode: '1f47b',
    fallbackEmoji: '👻',
    glowColor: 'rgba(99, 102, 241, 0.35)',
  },
  {
    id: 'pepe-devil',
    packId: 'pepe',
    title: 'Tới công chuyện luôn',
    caption: 'TỚI CÔNG CHUYỆN 😈',
    captionBg: 'linear-gradient(135deg, #9333ea 0%, #581c87 100%)',
    captionColor: '#ffffff',
    keywords: ['devil', 'ac quy', 'toi cong chuyen', 'hehe'],
    notoCode: '1f47f',
    fallbackEmoji: '😈',
    glowColor: 'rgba(147, 51, 234, 0.35)',
  },
  {
    id: 'pepe-dizzy',
    packId: 'pepe',
    title: 'Lú cái đầu luôn',
    caption: 'LÚ LUÔN RỒI 😵‍💫',
    captionBg: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
    captionColor: '#ffffff',
    keywords: ['dizzy', 'lu luon', 'xoan nao', 'chong mat'],
    notoCode: '1f635_200d_1f4ab',
    fallbackEmoji: '😵‍💫',
    glowColor: 'rgba(13, 148, 136, 0.35)',
  },
  {
    id: 'pepe-frog',
    packId: 'pepe',
    title: 'Ếch xanh ngồi hóng',
    caption: 'NGỒI IM HÓNG 🐸',
    captionBg: 'linear-gradient(135deg, #16a34a 0%, #14532d 100%)',
    captionColor: '#ffffff',
    keywords: ['frog', 'ech xanh', 'ngoi im'],
    notoCode: '1f438',
    fallbackEmoji: '🐸',
    glowColor: 'rgba(22, 163, 74, 0.35)',
  },

  // =========================================================================
  // PACK 5: GOOGLE NOTO 3D ANIMATED EMOJIS (CHUYỂN ĐỘNG 3D SIÊU MƯỢT)
  // =========================================================================
  {
    id: '3d-rofl',
    packId: '3d',
    title: 'Cười lăn lộn (3D)',
    keywords: ['cuoi lan lon', 'rofl', 'haha'],
    notoCode: '1f923',
    fallbackEmoji: '🤣',
  },
  {
    id: '3d-joy',
    packId: '3d',
    title: 'Cười ra nước mắt (3D)',
    keywords: ['cuoi', 'joy', 'hihi'],
    notoCode: '1f602',
    fallbackEmoji: '😂',
  },
  {
    id: '3d-sob',
    packId: '3d',
    title: 'Khóc ròng (3D)',
    keywords: ['khoc', 'sob', 'cry'],
    notoCode: '1f62d',
    fallbackEmoji: '😭',
  },
  {
    id: '3d-mindblown',
    packId: '3d',
    title: 'Nổ não (3D)',
    keywords: ['no nao', 'mind blown'],
    notoCode: '1f92f',
    fallbackEmoji: '🤯',
  },
  {
    id: '3d-hearts',
    packId: '3d',
    title: 'Ngập tràn yêu thương (3D)',
    keywords: ['yeu', 'tha tim', 'hearts'],
    notoCode: '1f970',
    fallbackEmoji: '🥰',
  },
  {
    id: '3d-starstruck',
    packId: '3d',
    title: 'Mắt sáng lấp lánh (3D)',
    keywords: ['ngoi sao', 'star', 'wow'],
    notoCode: '1f929',
    fallbackEmoji: '🤩',
  },
  {
    id: '3d-party',
    packId: '3d',
    title: 'Tiệc tùng ăn mừng (3D)',
    keywords: ['party', 'sinh nhat', 'an mung'],
    notoCode: '1f973',
    fallbackEmoji: '🥳',
  },
  {
    id: '3d-zany',
    packId: '3d',
    title: 'Nhây bựa lè lưỡi (3D)',
    keywords: ['nhay', 'bua', 'le luoi'],
    notoCode: '1f92a',
    fallbackEmoji: '🤪',
  },
  {
    id: '3d-money',
    packId: '3d',
    title: 'Mắt sáng thấy tiền (3D)',
    keywords: ['tien', 'money', 'giau'],
    notoCode: '1f911',
    fallbackEmoji: '🤑',
  },
  {
    id: '3d-peeking',
    packId: '3d',
    title: 'Che mặt hé mắt nhìn (3D)',
    keywords: ['che mat', 'ngai', 'peek'],
    notoCode: '1fae3',
    fallbackEmoji: '🫣',
  },
  {
    id: '3d-holding-tears',
    packId: '3d',
    title: 'Rưng rưng cảm động (3D)',
    keywords: ['cam dong', 'rung rung', 'cuoi roi le'],
    notoCode: '1f972',
    fallbackEmoji: '🥲',
  },
  {
    id: '3d-rage',
    packId: '3d',
    title: 'Nổi trận lôi đình (3D)',
    keywords: ['gian', 'nong', 'rage'],
    notoCode: '1f92c',
    fallbackEmoji: '🤬',
  },
  {
    id: '3d-scream',
    packId: '3d',
    title: 'La hét thất thanh (3D)',
    keywords: ['scream', 'so hai', 'omg'],
    notoCode: '1f631',
    fallbackEmoji: '😱',
  },
  {
    id: '3d-thinking',
    packId: '3d',
    title: 'Suy tư đăm chiêu (3D)',
    keywords: ['suy nghi', 'thinking', 'hmm'],
    notoCode: '1f914',
    fallbackEmoji: '🤔',
  },
  {
    id: '3d-giggle',
    packId: '3d',
    title: 'Che miệng cười khúc khích (3D)',
    keywords: ['cuoi', 'che mieng', 'hihi'],
    notoCode: '1f92d',
    fallbackEmoji: '🤭',
  },
  {
    id: '3d-eyeroll',
    packId: '3d',
    title: 'Đảo mắt ngán ngẩm (3D)',
    keywords: ['dao mat', 'chan', 'eyeroll'],
    notoCode: '1f644',
    fallbackEmoji: '🙄',
  },
  {
    id: '3d-hot',
    packId: '3d',
    title: 'Nóng bốc hỏa (3D)',
    keywords: ['nong', 'hot', 'chay'],
    notoCode: '1f975',
    fallbackEmoji: '🥵',
  },
  {
    id: '3d-cold',
    packId: '3d',
    title: 'Lạnh đóng băng (3D)',
    keywords: ['lanh', 'cold', 'dong bang'],
    notoCode: '1f976',
    fallbackEmoji: '🥶',
  },
  {
    id: '3d-vomit',
    packId: '3d',
    title: 'Ói mửa luôn (3D)',
    keywords: ['oi', 'ghe', 'vomit'],
    notoCode: '1f92e',
    fallbackEmoji: '🤮',
  },
  {
    id: '3d-sleep',
    packId: '3d',
    title: 'Ngủ khò khò (3D)',
    keywords: ['ngu', 'sleep', 'met'],
    notoCode: '1f634',
    fallbackEmoji: '😴',
  },
  {
    id: '3d-heart-fire',
    packId: '3d',
    title: 'Trái tim rực lửa (3D)',
    keywords: ['tim', 'lua', 'heart fire'],
    notoCode: '2764_200d_1f525',
    fallbackEmoji: '❤️‍🔥',
  },
  {
    id: '3d-fire',
    packId: '3d',
    title: 'Cháy hết mình (3D)',
    keywords: ['lua', 'fire', 'chay'],
    notoCode: '1f525',
    fallbackEmoji: '🔥',
  },
  {
    id: '3d-trophy',
    packId: '3d',
    title: 'Cúp vô địch (3D)',
    keywords: ['cup', 'vo dich', 'trophy', 'top 1'],
    notoCode: '1f3c6',
    fallbackEmoji: '🏆',
  },
  {
    id: '3d-crown',
    packId: '3d',
    title: 'Vương miện Nữ Hoàng (3D)',
    keywords: ['vuong mien', 'crown', 'queen', 'king'],
    notoCode: '1f451',
    fallbackEmoji: '👑',
  },
  {
    id: '3d-clap',
    packId: '3d',
    title: 'Vỗ tay tán thưởng (3D)',
    keywords: ['vo tay', 'clap', 'khen'],
    notoCode: '1f44f',
    fallbackEmoji: '👏',
  },
  {
    id: '3d-muscle',
    packId: '3d',
    title: 'Cơ bắp quyết tâm (3D)',
    keywords: ['co bap', 'manh me', 'quyet tam'],
    notoCode: '1f4aa',
    fallbackEmoji: '💪',
  },
  {
    id: '3d-chick',
    packId: '3d',
    title: 'Gà con mới nở (3D)',
    keywords: ['ga con', 'chick', 'cute'],
    notoCode: '1f423',
    fallbackEmoji: '🐣',
  },
  {
    id: '3d-sparkles',
    packId: '3d',
    title: 'Lấp lánh diệu kỳ (3D)',
    keywords: ['lap lanh', 'sparkles'],
    notoCode: '2728',
    fallbackEmoji: '✨',
  },
];

const STICKER_MAP = new Map<string, MosChatStickerItem>(MOS_CHAT_STICKERS.map((s) => [s.id, s]));

export function getStickerById(stickerId: string | undefined | null): MosChatStickerItem | undefined {
  if (!stickerId) return undefined;
  return STICKER_MAP.get(stickerId.trim());
}

export function formatStickerToken(stickerId: string): string {
  return `[sticker:${stickerId}]`;
}

export function parsePureStickerMessage(text: string | undefined | null): MosChatStickerItem | null {
  if (!text) return null;
  const trimmed = text.trim();
  const match = trimmed.match(/^\[sticker:([a-z0-9-]+)\]$/i);
  if (!match) return null;
  return getStickerById(match[1]) || null;
}

export function parseStickerReactionKey(reactionKey: string | undefined | null): MosChatStickerItem | null {
  if (!reactionKey) return null;
  return parsePureStickerMessage(reactionKey);
}

export function formatChatPreviewWithStickers(text: string | undefined | null): string {
  if (!text) return '';
  const pure = parsePureStickerMessage(text);
  if (pure) {
    return `${pure.fallbackEmoji} [Nhãn dán: ${pure.caption || pure.title}]`;
  }
  return text.replace(/\[sticker:([a-z0-9-]+)\]/gi, (_, id: string) => {
    const found = getStickerById(id);
    return found ? `${found.fallbackEmoji} [${found.caption || found.title}]` : '[Nhãn dán]';
  });
}

function renderCustomAnimatedSvg(kind: NonNullable<MosChatStickerItem['customSvg']>) {
  switch (kind) {
    case 'cat-bongo':
      return (
        <svg viewBox="0 0 120 100" className="w-full h-full overflow-visible">
          {/* Desk */}
          <path d="M8 74 L112 74 L116 94 L4 94 Z" fill="#fde68a" stroke="#1e293b" strokeWidth="3.5" />
          {/* Laptop / Keyboard */}
          <rect x="26" y="70" width="68" height="14" rx="4" fill="#334155" stroke="#0f172a" strokeWidth="2.5" />
          <circle cx="42" cy="77" r="2.5" fill="#38bdf8" />
          <circle cx="54" cy="77" r="2.5" fill="#f43f5e" />
          <circle cx="66" cy="77" r="2.5" fill="#22c55e" />
          <circle cx="78" cy="77" r="2.5" fill="#fbbf24" />
          {/* White Bongo Cat Body */}
          <path
            d="M28 72 C26 42, 36 22, 60 22 C84 22, 94 42, 92 72 Z"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="3.5"
          />
          {/* Ears */}
          <polygon
            points="33,34 28,12 46,24"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <polygon points="34,30 31,17 43,25" fill="#fda4af" />
          <polygon
            points="87,34 92,12 74,24"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <polygon points="86,30 89,17 77,25" fill="#fda4af" />
          {/* Intense Eyes & Sweat */}
          <circle cx="47" cy="46" r="4" fill="#0f172a" />
          <circle cx="73" cy="46" r="4" fill="#0f172a" />
          <line x1="40" y1="38" x2="52" y2="41" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          <line x1="80" y1="38" x2="68" y2="41" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          {/* Cute Cat Mouth */}
          <path
            d="M54 53 Q57 57 60 53 Q63 57 66 53"
            fill="none"
            stroke="#0f172a"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          {/* Sweat drop */}
          <path d="M88 38 C88 38, 93 45, 90 49 C87 52, 84 49, 85 45 Z" fill="#38bdf8">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,-2; 0,4; 0,-2"
              dur="0.45s"
              repeatCount="indefinite"
            />
          </path>
          {/* Left Paw Slapping */}
          <g>
            <ellipse cx="38" cy="70" rx="9" ry="7" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,-10; 0,4; 0,-10"
              dur="0.18s"
              repeatCount="indefinite"
            />
          </g>
          {/* Right Paw Slapping Alternating */}
          <g>
            <ellipse cx="82" cy="70" rx="9" ry="7" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,4; 0,-10; 0,4"
              dur="0.18s"
              repeatCount="indefinite"
            />
          </g>
          {/* Speed Impact Sparks */}
          <path d="M22 62 L14 56 M98 62 L106 56" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round">
            <animate attributeName="opacity" values="1;0.2;1" dur="0.18s" repeatCount="indefinite" />
          </path>
        </svg>
      );

    case 'cat-vibing':
      return (
        <svg viewBox="0 0 120 100" className="w-full h-full overflow-visible">
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="-8 60 75; 10 60 75; -8 60 75"
              dur="0.48s"
              repeatCount="indefinite"
            />
            {/* Headphones Band */}
            <path d="M26 48 C26 14, 94 14, 94 48" fill="none" stroke="#8b5cf6" strokeWidth="6" strokeLinecap="round" />
            {/* Cat Head & Body */}
            <path
              d="M30 84 C28 46, 36 26, 60 26 C84 26, 92 46, 90 84 Z"
              fill="#ffffff"
              stroke="#1e293b"
              strokeWidth="3.5"
            />
            <polygon points="34,36 28,14 48,26" fill="#ffffff" stroke="#1e293b" strokeWidth="3.5" />
            <polygon points="86,36 92,14 72,26" fill="#ffffff" stroke="#1e293b" strokeWidth="3.5" />
            {/* Headphone Ear Cups */}
            <rect x="20" y="40" width="12" height="22" rx="6" fill="#ec4899" stroke="#1e293b" strokeWidth="2.5" />
            <rect x="88" y="40" width="12" height="22" rx="6" fill="#ec4899" stroke="#1e293b" strokeWidth="2.5" />
            {/* Closed Vibing Eyes */}
            <path d="M41 49 Q47 43 53 49" fill="none" stroke="#0f172a" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M67 49 Q73 43 79 49" fill="none" stroke="#0f172a" strokeWidth="3.2" strokeLinecap="round" />
            {/* Happy Cat Mouth */}
            <path d="M54 58 Q60 64 66 58" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="39" cy="56" rx="5" ry="3" fill="#fda4af" />
            <ellipse cx="81" cy="56" rx="5" ry="3" fill="#fda4af" />
          </g>
          {/* Floating Musical Notes */}
          <text x="14" y="28" fontSize="18" fontWeight="bold" fill="#ec4899">
            ♪
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,4; -4,-8; 0,4"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </text>
          <text x="96" y="24" fontSize="18" fontWeight="bold" fill="#38bdf8">
            ♫
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,-4; 4,6; 0,-4"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </text>
        </svg>
      );

    case 'cat-knife':
      return (
        <svg viewBox="0 0 120 100" className="w-full h-full overflow-visible">
          {/* Sassy Cat Body */}
          <path
            d="M28 84 C26 48, 36 26, 58 26 C80 26, 90 48, 88 84 Z"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="3.5"
          />
          <polygon points="32,36 26,14 46,26" fill="#ffffff" stroke="#1e293b" strokeWidth="3.5" />
          <polygon points="84,36 90,14 70,26" fill="#ffffff" stroke="#1e293b" strokeWidth="3.5" />
          {/* Angry Furrowed Brows & Side-eye */}
          <line x1="36" y1="40" x2="52" y2="46" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="80" y1="40" x2="64" y2="46" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="46" cy="49" r="4" fill="#ef4444" />
          <circle cx="70" cy="49" r="4" fill="#ef4444" />
          {/* Smug Grin */}
          <path d="M48 60 Q58 55 68 61" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          {/* Toy Prop Blade Gleaming */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="-6 88 64; 8 88 64; -6 88 64"
              dur="0.45s"
              repeatCount="indefinite"
            />
            <rect x="82" y="58" width="14" height="7" rx="3" fill="#b91c1c" stroke="#0f172a" strokeWidth="2.5" />
            <path d="M94 55 L116 42 L112 65 Z" fill="#e2e8f0" stroke="#0f172a" strokeWidth="2.5" />
            <circle cx="84" cy="62" r="7" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
          </g>
        </svg>
      );

    case 'cat-ok':
      return (
        <svg viewBox="0 0 120 100" className="w-full h-full overflow-visible">
          <path
            d="M26 84 C24 46, 34 26, 56 26 C78 26, 88 46, 86 84 Z"
            fill="#fde047"
            stroke="#1e293b"
            strokeWidth="3.5"
          />
          <polygon points="30,36 24,14 44,26" fill="#fde047" stroke="#1e293b" strokeWidth="3.5" />
          <polygon points="82,36 88,14 68,26" fill="#fde047" stroke="#1e293b" strokeWidth="3.5" />
          {/* Cool Sunglasses */}
          <rect x="33" y="41" width="20" height="12" rx="3" fill="#0f172a" />
          <rect x="59" y="41" width="20" height="12" rx="3" fill="#0f172a" />
          <line x1="53" y1="45" x2="59" y2="45" stroke="#0f172a" strokeWidth="3" />
          <path d="M46 60 Q56 68 66 60" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
          {/* Bouncing Thumbs Up */}
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,2; 0,-6; 0,2"
              dur="0.5s"
              repeatCount="indefinite"
            />
            <path
              d="M90 56 C90 44, 98 42, 98 52 L108 52 C112 52, 112 68, 106 68 L90 68 Z"
              fill="#fde047"
              stroke="#1e293b"
              strokeWidth="3"
            />
          </g>
        </svg>
      );

    case 'quby-heart-gun':
    case 'quby-tantrum':
    case 'quby-cheer':
    case 'quby-bow':
    case 'quby-bonk':
    case 'quby-coffee':
    case 'quby-overload':
    case 'quby-shy':
    case 'quby-money':
    case 'quby-yes': {
      const isTantrum = kind === 'quby-tantrum';
      const isOverload = kind === 'quby-overload';
      const isShy = kind === 'quby-shy';
      const isBonk = kind === 'quby-bonk';
      const isCoffee = kind === 'quby-coffee';
      const isMoney = kind === 'quby-money';
      return (
        <svg viewBox="0 0 120 100" className="w-full h-full overflow-visible">
          <g>
            <animateTransform
              attributeName="transform"
              type={isTantrum ? 'rotate' : 'translate'}
              values={isTantrum ? '-6 60 60; 6 60 60; -6 60 60' : '0,2; 0,-5; 0,2'}
              dur={isTantrum ? '0.22s' : '0.55s'}
              repeatCount="indefinite"
            />
            {/* Chubby Quby Round White Head & Body */}
            <path
              d="M34 86 C30 68, 38 62, 60 62 C82 62, 90 68, 86 86 Z"
              fill="#ffffff"
              stroke="#1e293b"
              strokeWidth="3.2"
            />
            <ellipse cx="60" cy="44" rx="30" ry="26" fill="#ffffff" stroke="#1e293b" strokeWidth="3.5" />
            {/* Single Little Hair Sprout on Bald Head */}
            <path d="M60 18 Q65 10 56 12" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
            {/* Rosy Pink Cheeks */}
            <ellipse cx="39" cy="49" rx="6.5" ry="4" fill="#fb7185" opacity="0.85" />
            <ellipse cx="81" cy="49" rx="6.5" ry="4" fill="#fb7185" opacity="0.85" />
            {/* Expressions */}
            {isTantrum ? (
              <>
                <path d="M42 40 L52 44 L42 48" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                <path d="M78 40 L68 44 L78 48" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                {/* Waterfall Tears */}
                <path d="M44 48 L38 78" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
                <path d="M76 48 L82 78" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
                <ellipse cx="60" cy="54" rx="9" ry="6" fill="#f43f5e" stroke="#0f172a" strokeWidth="2.5" />
              </>
            ) : isOverload ? (
              <>
                <circle cx="47" cy="42" r="5" fill="none" stroke="#0f172a" strokeWidth="2.8" />
                <circle cx="73" cy="42" r="5" fill="none" stroke="#0f172a" strokeWidth="2.8" />
                <path d="M52 55 Q60 49 68 55" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
              </>
            ) : isMoney ? (
              <>
                <text x="41" y="47" fontSize="14" fontWeight="900" fill="#15803d">
                  $
                </text>
                <text x="69" y="47" fontSize="14" fontWeight="900" fill="#15803d">
                  $
                </text>
                <path d="M50 52 Q60 62 70 52 Z" fill="#f43f5e" stroke="#0f172a" strokeWidth="2.5" />
              </>
            ) : (
              <>
                <path d="M43 42 Q48 36 53 42" fill="none" stroke="#0f172a" strokeWidth="3.2" strokeLinecap="round" />
                <path d="M67 42 Q72 36 77 42" fill="none" stroke="#0f172a" strokeWidth="3.2" strokeLinecap="round" />
                <path d="M52 50 Q60 59 68 50 Z" fill="#f43f5e" stroke="#0f172a" strokeWidth="2.5" />
              </>
            )}

            {/* Props per Quby action */}
            {kind === 'quby-heart-gun' && (
              <g>
                <text x="88" y="36" fontSize="22">
                  ❤️
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="0,0; 12,-10; 0,0"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                </text>
                <text x="10" y="32" fontSize="18">
                  💖
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="0,0; -10,-8; 0,0"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                </text>
              </g>
            )}
            {isBonk && (
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values="-25 88 55; 25 88 55; -25 88 55"
                  dur="0.3s"
                  repeatCount="indefinite"
                />
                <line x1="84" y1="62" x2="104" y2="32" stroke="#92400e" strokeWidth="4" strokeLinecap="round" />
                <rect x="92" y="20" width="22" height="14" rx="4" fill="#ef4444" stroke="#0f172a" strokeWidth="2.5" />
              </g>
            )}
            {isCoffee && (
              <g>
                <rect x="78" y="48" width="18" height="24" rx="4" fill="#fde68a" stroke="#0f172a" strokeWidth="2.5" />
                <line x1="84" y1="38" x2="72" y2="48" stroke="#ec4899" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="83" cy="66" r="2" fill="#1e293b" />
                <circle cx="89" cy="67" r="2" fill="#1e293b" />
              </g>
            )}
            {isShy && (
              <g>
                <circle cx="52" cy="68" r="6" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
                <circle cx="68" cy="68" r="6" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
              </g>
            )}
          </g>
        </svg>
      );
    }

    case 'pepe-monkas':
    case 'pepe-clap':
    case 'pepe-cry':
    case 'pepe-hype':
    case 'pepe-run':
    case 'pepe-smart': {
      const isCry = kind === 'pepe-cry';
      const isMonka = kind === 'pepe-monkas';
      const isClap = kind === 'pepe-clap';
      const isRun = kind === 'pepe-run';
      const isSmart = kind === 'pepe-smart';
      return (
        <svg viewBox="0 0 120 100" className="w-full h-full overflow-visible">
          <g>
            <animateTransform
              attributeName="transform"
              type={isRun ? 'translate' : 'rotate'}
              values={isRun ? '-5,0; 6,0; -5,0' : '-4 60 65; 4 60 65; -4 60 65'}
              dur={isClap || isRun ? '0.24s' : '0.55s'}
              repeatCount="indefinite"
            />
            {/* Iconic Green Frog Head & Bulging Eyes */}
            <circle cx="45" cy="30" r="14" fill="#4ade80" stroke="#14532d" strokeWidth="3.2" />
            <circle cx="75" cy="30" r="14" fill="#4ade80" stroke="#14532d" strokeWidth="3.2" />
            <ellipse cx="60" cy="54" rx="34" ry="26" fill="#4ade80" stroke="#14532d" strokeWidth="3.5" />
            {/* White Sclera & Pupils */}
            <circle cx="45" cy="30" r="8.5" fill="#ffffff" stroke="#14532d" strokeWidth="2" />
            <circle cx="75" cy="30" r="8.5" fill="#ffffff" stroke="#14532d" strokeWidth="2" />
            <circle cx={isMonka ? 47 : 45} cy="30" r="4" fill="#0f172a" />
            <circle cx={isMonka ? 77 : 75} cy="30" r="4" fill="#0f172a" />
            {/* Iconic Pepe Red/Brown Lips */}
            {isCry || isMonka ? (
              <path d="M40 64 Q60 54 80 64" fill="none" stroke="#b91c1c" strokeWidth="5" strokeLinecap="round" />
            ) : (
              <path d="M38 58 Q60 72 82 58" fill="#f87171" stroke="#991b1b" strokeWidth="3.5" strokeLinecap="round" />
            )}
            {/* Tears or Sweat */}
            {isCry && (
              <>
                <path d="M43 38 L38 76" stroke="#38bdf8" strokeWidth="5.5" strokeLinecap="round" />
                <path d="M77 38 L82 76" stroke="#38bdf8" strokeWidth="5.5" strokeLinecap="round" />
              </>
            )}
            {isMonka && (
              <>
                <path d="M90 36 C90 36, 96 45, 92 50 C88 53, 85 49, 86 44 Z" fill="#38bdf8" />
                <path d="M26 42 C26 42, 31 50, 28 54 C25 57, 22 53, 23 48 Z" fill="#38bdf8" />
              </>
            )}
            {isClap && (
              <g>
                <ellipse cx="32" cy="68" rx="9" ry="6" fill="#4ade80" stroke="#14532d" strokeWidth="2.8">
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="-4,0; 8,0; -4,0"
                    dur="0.2s"
                    repeatCount="indefinite"
                  />
                </ellipse>
                <ellipse cx="88" cy="68" rx="9" ry="6" fill="#4ade80" stroke="#14532d" strokeWidth="2.8">
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="4,0; -8,0; 4,0"
                    dur="0.2s"
                    repeatCount="indefinite"
                  />
                </ellipse>
              </g>
            )}
            {isSmart && (
              <rect x="35" y="23" width="50" height="14" rx="3" fill="none" stroke="#fde047" strokeWidth="3" />
            )}
          </g>
        </svg>
      );
    }
  }
}

export const MosChatStickerVisual: React.FC<{
  sticker: MosChatStickerItem;
  size?: 'picker' | 'chat' | 'reaction';
}> = ({ sticker, size = 'chat' }) => {
  const [imgFailed, setImgFailed] = useState(false);

  const notoGifUrl = sticker.notoCode
    ? `https://fonts.gstatic.com/s/e/notoemoji/latest/${sticker.notoCode}/512.gif`
    : null;

  if (size === 'reaction') {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 shrink-0 select-none">
        {notoGifUrl && !imgFailed ? (
          <img
            src={notoGifUrl}
            alt={sticker.title}
            className="w-4 h-4 object-contain"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="text-[13px] leading-none">{sticker.fallbackEmoji}</span>
        )}
      </span>
    );
  }

  const isPicker = size === 'picker';

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none transition-transform duration-200 ${
        isPicker ? 'w-full h-[78px] p-1 hover:scale-110' : 'w-[116px] h-[112px] p-1.5 hover:scale-105'
      }`}
      style={{
        filter: sticker.glowColor ? `drop-shadow(0 6px 14px ${sticker.glowColor})` : undefined,
      }}
      title={sticker.title}
    >
      <div className={`relative flex items-center justify-center ${isPicker ? 'w-12 h-12' : 'w-[82px] h-[82px]'}`}>
        {sticker.customSvg ? (
          renderCustomAnimatedSvg(sticker.customSvg)
        ) : notoGifUrl && !imgFailed ? (
          <img
            src={notoGifUrl}
            alt={sticker.title}
            loading="lazy"
            className="w-full h-full object-contain pointer-events-none"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className={`${isPicker ? 'text-[34px]' : 'text-[54px]'} leading-none animate-bounce`}>
            {sticker.fallbackEmoji}
          </span>
        )}
      </div>

      {sticker.caption && (
        <span
          className={`block font-black uppercase tracking-tight rounded-full shadow-md text-center truncate ${
            isPicker
              ? 'text-[7.5px] leading-tight px-1.5 py-0.5 -mt-1 max-w-[96%]'
              : 'text-[10px] leading-none px-2.5 py-1 -mt-1.5 whitespace-nowrap'
          }`}
          style={{
            background: sticker.captionBg || 'linear-gradient(135deg, #d4a84b, #b45309)',
            color: sticker.captionColor || '#ffffff',
            border: '1.5px solid rgba(255,255,255,0.85)',
          }}
        >
          {sticker.caption}
        </span>
      )}
    </div>
  );
};

export const MosChatStickerAndEmojiPicker: React.FC<{
  isDark: boolean;
  borderColor: string;
  surfaceRaised: string;
  wingsSignatureEmojis: readonly string[];
  popularEmojis: readonly string[];
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker: (sticker: MosChatStickerItem) => void;
  mode?: 'composer' | 'reaction';
  hasUserReacted?: (key: string) => boolean;
}> = ({
  isDark,
  borderColor,
  surfaceRaised,
  wingsSignatureEmojis,
  popularEmojis,
  onSelectEmoji,
  onSelectSticker,
  mode = 'composer',
  hasUserReacted,
}) => {
  const [activePack, setActivePack] = useState<MosChatStickerPackId>('wings');
  const [searchQuery, setSearchQuery] = useState('');
  const gridScrollRef = useRef<HTMLDivElement | null>(null);

  const filteredStickers = useMemo(() => {
    const q = removeVietnameseTones(searchQuery.trim().toLowerCase());
    if (q) {
      return MOS_CHAT_STICKERS.filter((s) => {
        const titleNorm = removeVietnameseTones(s.title.toLowerCase());
        const capNorm = removeVietnameseTones((s.caption || '').toLowerCase());
        return (
          titleNorm.includes(q) ||
          capNorm.includes(q) ||
          s.keywords.some((k) => removeVietnameseTones(k.toLowerCase()).includes(q))
        );
      });
    }
    if (activePack === 'emoji') return [];
    return MOS_CHAT_STICKERS.filter((s) => s.packId === activePack);
  }, [activePack, searchQuery]);

  return (
    <div
      data-no-chat-autofocus="true"
      onClick={(e) => e.stopPropagation()}
      className="p-2 space-y-2 select-none"
      style={{ width: 372 }}
    >
      {/* Top Category Pack Switcher Tabs (Fits all 6 packs cleanly without scrollbar) */}
      <div
        className="grid grid-cols-6 gap-1 p-1 rounded-xl"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.9)',
          border: `1px solid ${borderColor}`,
        }}
      >
        {MOS_CHAT_STICKER_PACK_TABS.map((tab) => {
          const isActive = activePack === tab.id && !searchQuery.trim();
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActivePack(tab.id);
                setSearchQuery('');
                if (gridScrollRef.current) {
                  gridScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              title={tab.label}
              className="px-1 py-1.5 rounded-lg text-[10px] font-extrabold inline-flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all leading-none"
              style={{
                background: isActive ? '#d4a84b' : 'transparent',
                color: isActive ? '#000000' : isDark ? '#cbd5e1' : '#334155',
              }}
            >
              <span className="text-[13px] leading-none">{tab.icon}</span>
              <span className="truncate max-w-full">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Search bar for Stickers / Memes */}
      {activePack !== 'emoji' && (
        <div
          className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg"
          style={{
            background: surfaceRaised,
            border: `1px solid ${borderColor}`,
          }}
        >
          <Search size={12} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm meme / sticker (VD: chốt đơn, mèo, khóc, sếp...)"
            className="w-full bg-transparent text-[11.5px] outline-none"
            style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[10px] text-slate-400 hover:text-amber-400 cursor-pointer font-bold"
            >
              Xoá
            </button>
          )}
        </div>
      )}

      {/* Pack Content: Either Classic Emoji Grid OR Animated Sticker Grid */}
      {activePack === 'emoji' && !searchQuery.trim() ? (
        <div className="space-y-2 max-h-[270px] overflow-y-auto pr-0.5">
          <div>
            <div className="px-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
              Chèn biểu tượng Wings
            </div>
            <div className="grid grid-cols-9 gap-1">
              {wingsSignatureEmojis.map((emoji) => {
                const reacted = hasUserReacted?.(emoji);
                return (
                  <button
                    key={`wings-em-${emoji}`}
                    type="button"
                    onClick={() => onSelectEmoji(emoji)}
                    className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[18px] cursor-pointer transition-transform hover:scale-125 hover:bg-black/5 dark:hover:bg-white/10"
                    style={{
                      background: reacted ? 'rgba(212, 168, 75, 0.22)' : 'transparent',
                      boxShadow: reacted ? 'inset 0 0 0 1px rgba(212, 168, 75, 0.55)' : 'none',
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${borderColor}` }} className="pt-1.5">
            <div className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Cảm xúc phổ biến
            </div>
            <div className="grid grid-cols-9 gap-1">
              {popularEmojis.map((emoji) => {
                const reacted = hasUserReacted?.(emoji);
                return (
                  <button
                    key={`pop-em-${emoji}`}
                    type="button"
                    onClick={() => onSelectEmoji(emoji)}
                    className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[18px] cursor-pointer transition-transform hover:scale-125 hover:bg-black/5 dark:hover:bg-white/10"
                    style={{
                      background: reacted ? 'rgba(212, 168, 75, 0.22)' : 'transparent',
                      boxShadow: reacted ? 'inset 0 0 0 1px rgba(212, 168, 75, 0.55)' : 'none',
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 inline-flex items-center gap-1">
              <Sparkles size={11} />
              <span>
                {searchQuery.trim()
                  ? `Kết quả tìm kiếm (${filteredStickers.length})`
                  : MOS_CHAT_STICKER_PACK_TABS.find((t) => t.id === activePack)?.label}
              </span>
            </span>
            <span className="text-[10px] text-slate-400">
              {mode === 'reaction' ? '1 chạm để thả cảm xúc' : '1 chạm gửi ngay'}
            </span>
          </div>

          {filteredStickers.length === 0 ? (
            <div className="py-8 text-center text-[11.5px] text-slate-400">
              Không tìm thấy sticker phù hợp với &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <div ref={gridScrollRef} className="grid grid-cols-4 gap-1.5 max-h-[268px] overflow-y-auto pr-0.5 py-0.5">
              {filteredStickers.map((sticker) => {
                const tokenKey = formatStickerToken(sticker.id);
                const reacted = hasUserReacted?.(tokenKey);
                return (
                  <button
                    key={sticker.id}
                    type="button"
                    onClick={() => onSelectSticker(sticker)}
                    className="rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-amber-500/10"
                    style={{
                      background: reacted
                        ? 'rgba(212, 168, 75, 0.22)'
                        : isDark
                          ? 'rgba(255, 255, 255, 0.03)'
                          : 'rgba(15, 23, 42, 0.025)',
                      border: `1px solid ${reacted ? '#d4a84b' : borderColor}`,
                    }}
                  >
                    <MosChatStickerVisual sticker={sticker} size="picker" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
