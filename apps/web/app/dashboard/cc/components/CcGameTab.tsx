'use client';

import React from 'react';
import { Card, Row, Col, Progress, Tag, Button, Typography, theme } from 'antd';
import { RocketOutlined, FireOutlined, CrownOutlined } from '@ant-design/icons';
import { useCcMobilePortrait } from './useCcMobilePortrait';

const { Text, Title } = Typography;

export default function CcGameTab() {
  const { token } = theme.useToken();
  const { showMobilePortrait } = useCcMobilePortrait();

  const games = [
    {
      id: 1,
      title: '🔥 Thách Thức Bứt Phá Doanh Số Tuần 37',
      period: 'Tuần này',
      target: '50 lượt khách',
      current: 42,
      reward: 'Thưởng Nóng 1.500.000 đ',
      color: '#ff4d4f',
    },
    {
      id: 2,
      title: '⚡ Chuyên Viên Siêu Tốc & Tư Vấn Thần Tốc',
      period: 'Tháng 07/2026',
      target: '200 bộ mi Flawless',
      current: 168,
      reward: 'Cúp Vàng CC & 3.000.000 đ',
      color: '#faad14',
    },
    {
      id: 3,
      title: '🎯 Thách Thức Khách Hàng Thân Thiết (Retain Master)',
      period: 'Tùy hứng',
      target: '30 lượt Refill/tháng',
      current: 28,
      reward: 'Voucher 500k + 1.000 Pts',
      color: '#1890ff',
    },
  ];

  if (showMobilePortrait) {
    return (
      <div className="space-y-3" data-testid="cc-game-mobile-view">
        {/* Apple Wallet 1.5x Wheel Cap Card */}
        <section className="rounded-2xl p-3.5 bg-white/95 border border-amber-500/35 shadow-xs dark:bg-white/[0.045] dark:border-amber-500/30 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <FireOutlined className="text-amber-500 text-base shrink-0" />
              <span className="text-[14px] font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
                Trần Vòng Xoay 1.5×
              </span>
            </div>
            <Tag color="warning" className="font-bold text-[10px] m-0 shrink-0">
              83.3% TRẦN
            </Tag>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-white/[0.08]">
            <div className="pr-2 min-w-0">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Daily Bonus</div>
              <div className="text-[13.5px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">1.0M đ</div>
            </div>
            <div className="px-2 min-w-0">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Hạn mức 1.5×</div>
              <div className="text-[13.5px] font-bold tabular-nums text-amber-600 dark:text-amber-400">1.5M đ</div>
            </div>
            <div className="pl-2 min-w-0">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Thực nhận</div>
              <div className="text-[13.5px] font-bold tabular-nums text-sky-600 dark:text-sky-400">1.25M đ</div>
            </div>
          </div>

          <Progress
            percent={83.3}
            size="small"
            strokeColor={token.colorWarning}
            showInfo={false}
            className="m-0 block leading-none [&_.ant-progress-inner]:!h-[4px] [&_.ant-progress-bg]:!h-[4px]"
          />
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Tổng thưởng Vòng xoay tối đa không vượt quá 1.5 lần CC Daily Bonus trong tháng.
          </div>
        </section>

        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
          Thử thách đang mở · {games.length}
        </div>

        <div className="space-y-2">
          {games.map((g) => {
            const percent = Math.min(100, Math.round((g.current / parseInt(g.target)) * 100)) || 84;
            return (
              <div
                key={g.id}
                className="rounded-2xl p-3.5 bg-white/95 border border-slate-200/80 shadow-xs dark:bg-white/[0.045] dark:border-white/[0.08] space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <Tag color={g.color} className="font-semibold text-[11px] m-0">
                    {g.period}
                  </Tag>
                  <span className="text-xs font-bold tabular-nums text-amber-600 dark:text-amber-400">{percent}%</span>
                </div>
                <div className="text-[14px] font-bold leading-snug text-slate-900 dark:text-slate-50">{g.title}</div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Tiến độ: <strong className="tabular-nums text-slate-800 dark:text-slate-200">{g.current}</strong> /{' '}
                    {g.target}
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{g.reward}</span>
                </div>
                <Progress
                  percent={percent}
                  size="small"
                  showInfo={false}
                  strokeColor={g.color}
                  className="m-0 block leading-none [&_.ant-progress-inner]:!h-[4px] [&_.ant-progress-bg]:!h-[4px]"
                />
                <Button type="primary" block size="middle">
                  Tham Gia &amp; Nhận Thưởng
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Title level={4} style={{ color: token.colorText, margin: 0 }}>
          <RocketOutlined className="text-amber-500 mr-2" /> Thử Thách Gamification &amp; Vòng Xoay Minigame Dành Cho CC
        </Title>
        <Text type="secondary">
          Vượt mốc thử thách theo ngày, tuần, tháng để rinh giải thưởng nóng &amp; tích lũy huy hiệu
        </Text>
      </div>

      {/* WHEEL BONUS CAP 1.5X VISUALIZATION CARD */}
      <Card
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: '#d4a84b' }}
        className="mb-6 shadow-sm rounded-xl border-l-4 border-l-amber-500"
      >
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FireOutlined className="text-amber-500 text-lg" />
              <span className="font-bold text-base" style={{ color: token.colorText }}>
                🎡 Hạn Mức Thưởng Vòng Xoay Tháng (Trần 1.5x CC Daily Bonus)
              </span>
              <Tag color="gold" className="font-bold text-xs m-0">
                1.5X RULE
              </Tag>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Quy tắc khống chế: Tổng thưởng Vòng xoay tối đa không vượt quá{' '}
              <strong className="text-amber-400">1.5 lần</strong> tổng CC Daily Bonus của cá nhân trong tháng.
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-gray-400">Daily Bonus Tháng</div>
              <div className="font-bold text-emerald-400 tabular-nums text-sm">1.000.000 đ</div>
            </div>

            <div className="text-right border-l border-slate-700/30 pl-4">
              <div className="text-xs text-gray-400">Hạn Mức Vòng Xoay (1.5x)</div>
              <div className="font-bold text-amber-400 tabular-nums text-sm">1.500.000 đ</div>
            </div>

            <div className="text-right border-l border-slate-700/30 pl-4">
              <div className="text-xs text-gray-400">Đã Quay / Thực Nhận</div>
              <div className="font-bold text-blue-400 tabular-nums text-sm">1.250.000 đ</div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-700/20">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-gray-400">
              Tiến độ hạn mức Vòng xoay:{' '}
              <strong className="tabular-nums text-amber-400">1.250.000 đ / 1.500.000 đ</strong>
            </span>
            <Tag color="warning" className="font-bold text-[11px] m-0 border-amber-500/40">
              ⚠️ SẮP CHẠM TRẦN (83.3%)
            </Tag>
          </div>
          <Progress percent={83.3} strokeColor="#faad14" showInfo={false} className="m-0" />
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {games.map((g) => {
          const percent = Math.min(100, Math.round((g.current / parseInt(g.target)) * 100)) || 84;
          return (
            <Col xs={24} md={8} key={g.id}>
              <Card
                variant="outlined"
                style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
                className="shadow-sm rounded-xl hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center mb-3">
                  <Tag color={g.color} className="font-semibold">
                    {g.period}
                  </Tag>
                  <CrownOutlined className="text-amber-500 text-lg" />
                </div>
                <div className="font-bold text-base mb-2" style={{ color: token.colorText }}>
                  {g.title}
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  Phần thưởng: <span className="font-bold text-emerald-500">{g.reward}</span>
                </div>

                <div className="mb-2 flex justify-between text-xs">
                  <span>
                    Tiến độ: <strong className="tabular-nums">{g.current}</strong> / {g.target}
                  </span>
                  <span className="tabular-nums font-bold" style={{ color: g.color }}>
                    {percent}%
                  </span>
                </div>
                <Progress percent={percent} showInfo={false} strokeColor={g.color} className="mb-4" />

                <Button type="primary" block style={{ background: g.color, borderColor: g.color }}>
                  Tham Gia &amp; Nhận Thưởng
                </Button>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
