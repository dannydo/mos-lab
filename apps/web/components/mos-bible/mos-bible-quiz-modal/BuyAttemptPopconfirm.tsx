'use client';

import React from 'react';
import { Popconfirm } from 'antd';
import { MAX_PURCHASED_ATTEMPTS_PER_DAY } from './constants';

export interface BuyAttemptPopconfirmProps {
  purchasedAttemptsToday: number;
  onConfirm: () => void;
  children: React.ReactNode;
}

export function BuyAttemptPopconfirm({ purchasedAttemptsToday, onConfirm, children }: BuyAttemptPopconfirmProps) {
  return (
    <Popconfirm
      title="Dùng 1 🍌 mua thêm 1 lượt chơi?"
      description={`Hôm nay bạn còn ${MAX_PURCHASED_ATTEMPTS_PER_DAY - purchasedAttemptsToday}/${MAX_PURCHASED_ATTEMPTS_PER_DAY} lượt mua. Trả lời đúng từ 3 câu hoàn vốn 1 🍌, đúng 5 câu lãi 2 🍌!`}
      okText="Đồng ý mua 🍌"
      cancelText="Hủy"
      okButtonProps={{ className: 'bg-amber-600 hover:bg-amber-500' }}
      onConfirm={onConfirm}
    >
      {children}
    </Popconfirm>
  );
}
