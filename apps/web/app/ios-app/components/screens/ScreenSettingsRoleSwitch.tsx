'use client';

import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { IosUserRole } from '../ui-kit/IosTabBar';
import { IosBranchConfig } from '../../state/useIosAppState';
import { CvFeather2Badge, CvFeather1Badge } from '../ui-kit/CvFeatherLabels';
import { thermalPrinterService, PrinterConnectionType } from '../../services/thermalPrinterService';
import {
  UserCheck,
  Printer,
  CheckCircle2,
  Sliders,
  Database,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Award,
  Building2,
} from 'lucide-react';

interface ScreenSettingsRoleSwitchProps {
  currentRole: IosUserRole;
  canSwitchRole?: boolean;
  onRoleChange: (role: IosUserRole) => void;
  onBack: () => void;
  currentBranch?: IosBranchConfig;
  selectedStoreId?: number;
  onSelectBranch?: (storeId: number) => void;
  availableBranches?: IosBranchConfig[];
  isAdmin?: boolean;
}

export function ScreenSettingsRoleSwitch({
  currentRole,
  canSwitchRole = false,
  onRoleChange,
  onBack,
  currentBranch,
  selectedStoreId = 6,
  onSelectBranch,
  availableBranches = [],
  isAdmin = false,
}: ScreenSettingsRoleSwitchProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [printerType, setPrinterType] = useState<PrinterConnectionType>('BLUETOOTH');
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [ipAddress, setIpAddress] = useState('192.168.1.200');
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const roles: Array<{ id: IosUserRole; name: React.ReactNode; desc: React.ReactNode; icon: any }> = [
    {
      id: 'CVL',
      name: (
        <span className="inline-flex items-center gap-1">
          <CvFeather1Badge />
          <span>· Chuyên Viên Tự Chủ (Thảo Ly)</span>
        </span>
      ),
      desc: (
        <>
          Xem khách kế tiếp (Đầu tua) & khách book của mình, tự Check-in, Tư vấn gói Combo, bán Dưỡng mi & tự Checkout
          (Hưởng 90% Tip + Thưởng bậc thang <CvFeather1Badge />)
        </>
      ),
      icon: Sparkles,
    },
    {
      id: 'CVLL',
      name: (
        <span className="inline-flex items-center gap-1">
          <CvFeather2Badge />
          <span>· Chuyên Viên Tự Chủ Cấp Cao</span>
        </span>
      ),
      desc: 'Xem khách của mình & toàn chi nhánh để hỗ trợ Check-in / Tư vấn / Checkout chéo giùm CV khác (Ai Checkout người đó hưởng)',
      icon: Award,
    },
    {
      id: 'CC',
      name: 'Tư Vấn Viên (Client Consultant · Diễm Hương)',
      desc: 'Xem tất cả khách chờ đón, đang làm & đã xong tại chi nhánh đang làm việc; tiếp đón, Check-in, Bán Combo & POS theo quy chế CC',
      icon: Sparkles,
    },
    {
      id: 'STORE',
      name: 'Quản Lý Cửa Hàng (Admin / Super Admin)',
      desc: 'Theo dõi sàn salon, Hiệu suất giường, Chốt ca (Chế độ kiểm thử Admin)',
      icon: Sliders,
    },
    {
      id: 'INVENTORY',
      name: 'Quản Lý Kho (Admin / Super Admin)',
      desc: 'Tồn kho khay mi, Keo nối, Cấp phát vật tư (Chế độ kiểm thử Admin)',
      icon: Database,
    },
  ];

  const visibleRoles = canSwitchRole ? roles : roles.filter((r) => r.id === currentRole);

  const handleTestPrint = async () => {
    setIsPrinting(true);
    setPrintStatus('Đang gửi lệnh in ESC/POS...');

    thermalPrinterService.setPaperWidth(paperWidth);
    thermalPrinterService.setConnectionType(printerType, ipAddress);

    const testReceipt = {
      orderId: 'TEST-8888',
      customerName: 'Khách Kiểm Thử Máy In',
      staffName: 'Thảo Ly (CVL)',
      storeName: 'Wings Lashes Q.1',
      storeAddress: '159A Đề Thám, P. Cô Giang, Q.1',
      storePhone: '1800 8154',
      dateStr: new Date().toLocaleString('vi-VN'),
      services: [
        { name: 'Flawless Mink', price: 770000, qty: 1 },
        { name: 'Combo 5 lần Flawless Mink', price: 4500000, qty: 1 },
        { name: 'Dưỡng Mi Yeppeum Korea', price: 1100000, qty: 1 },
      ],
      subtotal: 6370000,
      discount: 0,
      tipAmount: 100000,
      total: 6470000,
      paymentMethod: 'Chuyển khoản VietQR',
    };

    const res = await thermalPrinterService.printReceipt(testReceipt);
    setIsPrinting(false);
    setPrintStatus(res.message);
    setTimeout(() => setPrintStatus(null), 4000);
  };

  return (
    <div className={`flex flex-col h-full bg-[var(--background)] text-[var(--mos-text)]`}>
      <IosNavigationBar title="Cài Đặt & Chuyển Vai Trò" leftAction={{ label: 'Xong', onClick: onBack }} />

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Role Switcher Section */}
        <div>
          <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
            {canSwitchRole
              ? 'Chuyển Đổi Vai Trò Vận Hành (Admin Role Switcher)'
              : 'Vai Trò Vận Hành Của Bạn (Đã Khoá Theo Tài Khoản)'}
          </h3>

          <div
            className={`${
              isDark
                ? 'bg-[#1C1C1E] border-neutral-800 divide-neutral-800'
                : 'bg-white border-[#E5E5EA] divide-[#E5E5EA]'
            } rounded-xl border divide-y overflow-hidden shadow-xs`}
          >
            {visibleRoles.map((r) => {
              const Icon = r.icon;
              const isSelected = currentRole === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => {
                    if (canSwitchRole) onRoleChange(r.id);
                  }}
                  className={`p-3.5 flex items-center justify-between transition-colors ${
                    canSwitchRole
                      ? isDark
                        ? 'hover:bg-neutral-800/60 cursor-pointer'
                        : 'hover:bg-[#F9F9FB] cursor-pointer'
                      : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#FFB400] text-black'
                          : isDark
                            ? 'bg-neutral-800 text-neutral-400'
                            : 'bg-[#F2F2F7] text-[#8E8E93]'
                      }`}
                    >
                      <Icon className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <div className={`text-xs font-bold text-[var(--mos-text)]`}>{r.name}</div>
                      <div className="text-[11px] text-[#8E8E93] mt-0.5 leading-snug">{r.desc}</div>
                    </div>
                  </div>

                  {isSelected && <CheckCircle2 className="w-5 h-5 text-[#FF9500] stroke-[2.5] shrink-0 ml-2" />}
                </div>
              );
            })}
          </div>
          {!canSwitchRole && (
            <p className="text-[11px] text-[#8E8E93] mt-1.5 px-1">
              🔒 Chỉ tài khoản Admin / Super Admin mới được phép chuyển đổi giữa các vai trò kiểm thử.
            </p>
          )}
        </div>

        {/* Thermal Printer Settings Section */}
        <div>
          <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
            Cấu Hình Máy In Nhiệt (Thermal Printer ESC/POS)
          </h3>

          <div
            className={`${'bg-[var(--mos-surface)] border-[var(--mos-surface-border)]'} rounded-xl border p-3.5 space-y-3 shadow-xs`}
          >
            <div>
              <label className="text-xs font-medium text-[#8E8E93] block mb-1">Phương thức kết nối</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'BLUETOOTH', label: 'Bluetooth' },
                  { id: 'LAN_IP', label: 'Wi-Fi / LAN IP' },
                  { id: 'AIRPRINT', label: 'AirPrint / PDF' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPrinterType(m.id as PrinterConnectionType)}
                    className={`py-2 px-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      printerType === m.id
                        ? 'bg-[#FFB400] text-black border-[#FFB400] shadow-xs'
                        : isDark
                          ? 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                          : 'bg-[#F2F2F7] text-[#8E8E93] border-transparent hover:text-black'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`pt-2 border-t ${
                isDark ? 'border-neutral-800' : 'border-[#E5E5EA]'
              } flex items-center justify-between`}
            >
              <span className={`text-xs font-medium ${isDark ? 'text-neutral-200' : 'text-[#1C1C1E]'}`}>
                Khổ giấy máy in
              </span>
              <div className="flex space-x-2">
                {(['80mm', '58mm'] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setPaperWidth(w)}
                    className={`px-3 py-1 rounded-md text-xs font-bold border transition-colors cursor-pointer ${
                      paperWidth === w
                        ? 'bg-[#FF9500] text-black border-[#FF9500]'
                        : isDark
                          ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                          : 'bg-white text-[#8E8E93] border-[#E5E5EA]'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleTestPrint}
                disabled={isPrinting}
                className="w-full py-2.5 rounded-xl bg-[#FFB400] text-black font-bold text-xs shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 stroke-[2]" />
                {isPrinting ? 'Đang gửi lệnh in...' : 'In Thử Hóa Đơn Nhiệt ESC/POS Mẫu'}
              </button>
              {printStatus && (
                <div className="mt-2 text-center text-xs font-medium text-emerald-500 animate-fadeIn">
                  {printStatus}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* App Info Section */}
        <div>
          <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 px-1 flex items-center gap-1">
            <span>Quy Chế Ghi Nhận Thưởng</span>
            <CvFeather1Badge />
            <span>&</span>
            <CvFeather2Badge />
            <span>(Điều Răn CV-002 & TIP-001)</span>
          </h3>

          <div
            className={`${
              isDark
                ? 'bg-[#1C1C1E] border-neutral-800 divide-neutral-800'
                : 'bg-white border-[#E5E5EA] divide-[#E5E5EA]'
            } rounded-xl border divide-y overflow-hidden shadow-xs text-xs`}
          >
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-[#FF9500]" />
                <span className={`font-medium text-[var(--mos-text)]`}>Chia Tip Tư Vấn (In / Out)</span>
              </div>
              <span className="text-emerald-500 font-bold">Theo ca trực Check-in / Out</span>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-blue-500" />
                <span className={`font-medium text-[var(--mos-text)]`}>Thưởng Combo & Dưỡng mi</span>
              </div>
              <span className="text-[#FF9500] font-bold">Ai Checkout người đó nhận</span>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-purple-500" />
                <span className={`font-medium text-[var(--mos-text)] flex items-center gap-1`}>
                  <span>Thang thưởng</span>
                  <CvFeather1Badge />
                  <span>(Khác CC)</span>
                </span>
              </div>
              <span className={`font-semibold ${isDark ? 'text-neutral-200' : 'text-[#1C1C1E]'} tabular-nums`}>
                Combo 50K–200K · Serum 1K–100K
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
