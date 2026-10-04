'use client';

import React, { useState } from 'react';
import { IosUserRole } from '../ui-kit/IosTabBar';
import { Sparkles, ScanFace, ChevronDown, Lock, Phone, UserCheck, ShieldCheck, ArrowRight } from 'lucide-react';

interface ScreenLoginProps {
  onLoginSuccess: (user: { id: number; name: string; phone: string; role: IosUserRole; storeName: string }) => void;
}

export function ScreenLogin({ onLoginSuccess }: ScreenLoginProps) {
  const [phoneNumber, setPhoneNumber] = useState('0937554430');
  const [password, setPassword] = useState('123456');
  const [selectedRole, setSelectedRole] = useState<IosUserRole>('CC');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Danh sách tài khoản mẫu thực tế theo vai trò
  const demoAccounts: Array<{
    role: IosUserRole;
    name: string;
    phone: string;
    store: string;
    roleLabel: string;
  }> = [
    {
      role: 'CC',
      name: 'Thùy Trang (CC)',
      phone: '0908123456',
      store: 'Chi Nhánh Đề Thám, Q.1',
      roleLabel: 'Tư Vấn Viên',
    },
    {
      role: 'CV',
      name: 'Diễm Hương (CV+)',
      phone: '0937554430',
      store: 'Chi Nhánh Đề Thám, Q.1',
      roleLabel: 'Chuyên Viên Tự Chủ',
    },
    {
      role: 'STORE',
      name: 'Ngọc Lan (Store Manager)',
      phone: '0912345678',
      store: 'Chi Nhánh Đề Thám, Q.1',
      roleLabel: 'Quản Lý Cửa Hàng',
    },
    {
      role: 'INVENTORY',
      name: 'Minh Quân (Kho)',
      phone: '0977889900',
      store: 'Tổng Kho & Chi Nhánh Q.1',
      roleLabel: 'Quản Lý Kho',
    },
  ];

  const handleQuickLogin = (account: (typeof demoAccounts)[0]) => {
    setIsLoading(true);
    setErrorMessage(null);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess({
        id: account.role === 'CV' ? 202 : 101,
        name: account.name,
        phone: account.phone,
        role: account.role,
        storeName: account.store,
      });
    }, 400);
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại hoặc mã nhân sự');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      setIsLoading(false);
      const matched = demoAccounts.find((a) => a.role === selectedRole) || demoAccounts[0];
      onLoginSuccess({
        id: 101,
        name: matched.name,
        phone: phoneNumber,
        role: selectedRole,
        storeName: 'Chi Nhánh Đề Thám, Q.1',
      });
    }, 600);
  };

  return (
    <div className="w-full h-full min-h-[100dvh] bg-black text-white flex flex-col justify-between px-6 pt-[calc(env(safe-area-inset-top,0px)+24px)] pb-[calc(env(safe-area-inset-bottom,0px)+20px)] select-none">
      {/* Top Section: Logo & Brand Header */}
      <div className="flex flex-col items-center text-center mt-6">
        {/* Wings Luxury Golden Crown Logo */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-[#2A2A2E] to-[#141416] border border-[#FFB400]/40 flex items-center justify-center shadow-[0_8px_32px_rgba(255,180,0,0.15)] mb-4">
          <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center border border-[#FFB400]/60">
            <span className="text-2xl font-black text-[#FFB400] tracking-tighter">W</span>
          </div>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">WE ARE WINGS</h1>
        <p className="text-xs text-neutral-400 mt-1 max-w-[260px] leading-relaxed">
          Đăng nhập hệ thống vận hành Salon Wings Lashes
        </p>
      </div>

      {/* Center Section: Login Form */}
      <div className="w-full max-w-[360px] mx-auto my-auto space-y-4">
        <form onSubmit={handleManualLogin} className="space-y-3">
          {/* Phone Number Input with +84 Flag */}
          <div className="flex items-center bg-[#1C1C1E] border border-neutral-800 rounded-xl px-3 py-3 focus-within:border-[#FFB400] transition-colors">
            {/* Vietnam Flag Badge */}
            <div className="flex items-center gap-1.5 pr-3 border-r border-neutral-700 text-xs font-semibold text-neutral-300 shrink-0">
              <span className="text-base leading-none">🇻🇳</span>
              <span className="tabular-nums">+84</span>
            </div>
            {/* Phone Input */}
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="987654321"
              className="w-full bg-transparent text-white text-sm font-medium pl-3 focus:outline-none placeholder-neutral-500 tabular-nums"
            />
          </div>

          {/* Password / OTP Input */}
          <div className="flex items-center bg-[#1C1C1E] border border-neutral-800 rounded-xl px-3 py-3 focus-within:border-[#FFB400] transition-colors">
            <Lock className="w-4 h-4 text-neutral-500 shrink-0 mr-2" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu hoặc mã PIN"
              className="w-full bg-transparent text-white text-sm font-medium focus:outline-none placeholder-neutral-500"
            />
          </div>

          {/* Role Selector Pill Tabs */}
          <div>
            <label className="text-[11px] font-semibold text-neutral-400 block mb-1.5 px-0.5">Vai trò đăng nhập:</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'CC', label: 'Tư Vấn' },
                  { id: 'CV', label: 'Chuyên Viên' },
                  { id: 'STORE', label: 'Quản Lý' },
                  { id: 'INVENTORY', label: 'Kho' },
                ] as const
              ).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id)}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    selectedRole === r.id
                      ? 'bg-[#FF9500] text-black shadow-sm'
                      : 'bg-[#1C1C1E] text-neutral-400 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {errorMessage && <div className="text-xs text-red-400 text-center font-medium py-1">{errorMessage}</div>}

          {/* Submit Button & FaceID */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#FFB400] to-[#FF9500] text-black font-extrabold text-sm shadow-[0_4px_16px_rgba(255,180,0,0.3)] active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Tiếp tục (Continue)</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>

            {/* Native iOS Face ID Button */}
            <button
              type="button"
              onClick={() => handleQuickLogin(demoAccounts.find((a) => a.role === selectedRole) || demoAccounts[0])}
              className="w-13 h-13 rounded-xl bg-[#1C1C1E] border border-neutral-800 hover:border-[#FFB400] text-[#FFB400] flex items-center justify-center active:scale-95 transition-all shadow-sm"
              title="Đăng nhập nhanh bằng Face ID"
            >
              <ScanFace className="w-6 h-6 stroke-[1.8]" />
            </button>
          </div>
        </form>

        {/* Quick Demo Logins Section */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
              Đăng nhập nhanh 1 chạm (Demo)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                onClick={() => handleQuickLogin(acc)}
                className="bg-[#1C1C1E] border border-neutral-800 hover:border-neutral-700 p-2.5 rounded-xl text-left active:scale-97 transition-all flex items-center gap-2"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    acc.role === 'CC'
                      ? 'bg-amber-500/20 text-amber-400'
                      : acc.role === 'CV'
                        ? 'bg-rose-500/20 text-rose-400'
                        : acc.role === 'STORE'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {acc.role}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-white truncate">{acc.name}</div>
                  <div className="text-[9px] text-neutral-400 truncate">{acc.roleLabel}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="text-center pt-4">
        <p className="text-[11px] text-neutral-500 font-mono">Wings Lashes CRM Mobile · iOS Clone v2.0</p>
      </div>
    </div>
  );
}
