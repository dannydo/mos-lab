'use client';

import React from 'react';
import { BookingItem } from '../../state/mockData';

interface Screen06CvDashboardReceiveProps {
  booking: BookingItem;
  onStartTask: () => void;
}

export function Screen06CvDashboardReceive({ booking, onStartTask }: Screen06CvDashboardReceiveProps) {
  return (
    <div className="flex-1 flex flex-col bg-black overflow-y-auto select-none font-sans">
      {/* 1. Header Profile & Status */}
      <div className="pt-3 pb-4 px-4 flex items-center justify-between border-b border-neutral-900">
        {/* Left badges */}
        <div className="flex items-center space-x-1.5">
          <div className="border border-amber-400/80 rounded-full px-2 py-0.5 text-[11px] font-bold text-amber-400 flex items-center space-x-1">
            <span>★ 5.0</span>
          </div>
          <div className="border border-emerald-500/80 rounded-full px-2 py-0.5 text-[11px] font-bold text-emerald-400 flex items-center space-x-1">
            <span>✓ 24 ca</span>
          </div>
        </div>

        {/* Center Staff Avatar & Name */}
        <div className="flex flex-col items-center">
          <div className="w-13 h-13 rounded-full bg-[#FFB400] text-black font-black text-xl flex items-center justify-center shadow-md">
            TL
          </div>
          <span className="text-white font-bold text-sm mt-1 border-b-2 border-red-500 pb-0.5">Thảo Ly</span>
        </div>

        {/* Right Status */}
        <div className="w-10 h-10 rounded-full border border-amber-400/80 flex items-center justify-center text-amber-400 font-bold text-xs">
          Now
        </div>
      </div>

      {/* 2. Main Content Body */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Active Task Card (Bordered in Gold) */}
        <div className="bg-[#1C1C1E] border border-[#FFB400] rounded-2xl p-4 space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="bg-[#FF9500] text-black text-[11px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-tight">
              CA LÀM VIỆC MỚI TIẾP NHẬN
            </span>
            <span className="text-[#34C759] text-xs font-bold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#34C759] inline-block" />
              <span>{booking.assignedBed || 'Giường 03'}</span>
            </span>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {booking.customerName}{' '}
              <span className="text-sm font-normal text-neutral-400">· {booking.customerPhone}</span>
            </h2>
            <div className="text-sm font-semibold text-[#FFB400] mt-0.5">
              Dịch vụ: {booking.serviceName} (
              {booking.servicePrice ? booking.servicePrice.toLocaleString('vi-VN') : '550.000'} đ)
            </div>
          </div>

          {/* Consultation Notes Box */}
          <div className="bg-[#2C2C2E] rounded-xl p-3 space-y-1.5 text-xs">
            <div className="text-neutral-200 leading-relaxed">
              <strong className="text-white">Thông số tư vấn:</strong> Dáng {booking.attributes?.style || 'Flawless'} ·
              Cong {booking.attributes?.curl || 'C'} · Dài {booking.attributes?.length || '10-12mm'} · Dày{' '}
              {booking.attributes?.thickness || '0.07mm'} siêu nhẹ
            </div>
            <div className="text-[#FF9500] leading-relaxed">
              <strong>Nốt CC:</strong>{' '}
              {booking.customerNote || 'Mắt mí lót nhẹ, dán gel pad êm ái, khách thích tự nhiên.'}
            </div>
          </div>

          {/* Big CTA Button */}
          <button
            onClick={onStartTask}
            className="w-full py-3.5 px-4 rounded-xl bg-[#FFB400] hover:bg-amber-400 active:scale-[0.99] text-black font-extrabold text-sm tracking-wider flex items-center justify-center space-x-2 transition-transform shadow-md uppercase"
          >
            <span>▶ MỞ TIẾN TRÌNH & BẮT ĐẦU CA LÀM</span>
          </button>
        </div>

        {/* Stats Summary Card */}
        <div className="bg-[#1C1C1E] rounded-2xl p-4 border border-neutral-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Doanh số ca tháng 1</span>
            <span className="text-[#FFB400] font-bold text-sm tabular-nums">14.850.000 đ</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Tỷ lệ hài lòng (5 sao)</span>
            <span className="text-[#34C759] font-bold text-sm tabular-nums">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
