'use client';

import React, { useState } from 'react';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { IosUserRole } from '../ui-kit/IosTabBar';
import { thermalPrinterService, PrinterConnectionType } from '../../services/thermalPrinterService';
import {
  UserCheck,
  Printer,
  Wifi,
  RefreshCw,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Database,
  Smartphone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface ScreenSettingsRoleSwitchProps {
  currentRole: IosUserRole;
  onRoleChange: (role: IosUserRole) => void;
  onBack: () => void;
}

export function ScreenSettingsRoleSwitch({ currentRole, onRoleChange, onBack }: ScreenSettingsRoleSwitchProps) {
  const [printerType, setPrinterType] = useState<PrinterConnectionType>('BLUETOOTH');
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [ipAddress, setIpAddress] = useState('192.168.1.200');
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const roles: Array<{ id: IosUserRole; name: string; desc: string; icon: any }> = [
    {
      id: 'CC',
      name: 'Tư Vấn Viên (Client Consultant)',
      desc: 'Tiếp đón khách, Check-in, Bán Combo & POS',
      icon: Sparkles,
    },
    {
      id: 'CV',
      name: 'Chuyên Viên (Technician)',
      desc: 'Ca làm của tôi, Bấm giờ thi công mi, Chụp Before/After',
      icon: UserCheck,
    },
    {
      id: 'STORE',
      name: 'Quản Lý Cửa Hàng (Store Manager)',
      desc: 'Theo dõi sàn salon, Hiệu suất giường, Chốt ca',
      icon: Sliders,
    },
    {
      id: 'INVENTORY',
      name: 'Quản Lý Kho (Inventory Manager)',
      desc: 'Tồn kho khay mi, Keo nối, Cấp phát vật tư',
      icon: Database,
    },
  ];

  const handleTestPrint = async () => {
    setIsPrinting(true);
    setPrintStatus('Đang gửi lệnh in ESC/POS...');

    thermalPrinterService.setPaperWidth(paperWidth);
    thermalPrinterService.setConnectionType(printerType, ipAddress);

    const testReceipt = {
      orderId: 'TEST-8888',
      customerName: 'Khách Kiểm Thử Máy In',
      staffName: 'Diễm Hương (CV+)',
      storeName: 'Wings Lashes Q.1',
      storeAddress: '123 Lê Thánh Tôn, Bến Nghé, Q.1',
      storePhone: '1900 8888',
      dateStr: new Date().toLocaleString('vi-VN'),
      services: [
        { name: 'Flawless 3D Design', price: 450000, qty: 1 },
        { name: 'Serum Dưỡng Mi Wings Pro', price: 280000, qty: 1 },
      ],
      subtotal: 730000,
      discount: 0,
      tipAmount: 50000,
      total: 780000,
      paymentMethod: 'Chuyển khoản VietQR',
    };

    const res = await thermalPrinterService.printReceipt(testReceipt);
    setIsPrinting(false);
    setPrintStatus(res.message);
    setTimeout(() => setPrintStatus(null), 4000);
  };

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      <IosNavigationBar title="Cài Đặt & Chuyển Vai Trò" leftAction={{ label: 'Xong', onClick: onBack }} />

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Role Switcher Section */}
        <div>
          <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
            Chuyển Đổi Không Gian Làm Việc (Role Switcher)
          </h3>

          <div className="bg-white rounded-xl border border-[#E5E5EA] divide-y divide-[#E5E5EA] overflow-hidden shadow-xs">
            {roles.map((r) => {
              const Icon = r.icon;
              const isSelected = currentRole === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => onRoleChange(r.id)}
                  className="p-3.5 flex items-center justify-between hover:bg-[#F9F9FB] transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-black text-[#FFB400]' : 'bg-[#F2F2F7] text-[#8E8E93]'
                      }`}
                    >
                      <Icon className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1C1C1E]">{r.name}</div>
                      <div className="text-[11px] text-[#8E8E93] mt-0.5">{r.desc}</div>
                    </div>
                  </div>

                  {isSelected && <CheckCircle2 className="w-5 h-5 text-[#FF9500] stroke-[2.5]" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Thermal Printer Settings Section */}
        <div>
          <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
            Cấu Hình Máy In Nhiệt (Thermal Printer ESC/POS)
          </h3>

          <div className="bg-white rounded-xl border border-[#E5E5EA] p-3.5 space-y-3 shadow-xs">
            {/* Connection Type */}
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
                    onClick={() => setPrinterType(m.id as any)}
                    className={`py-2 px-1 rounded-lg text-xs font-semibold border transition-all ${
                      printerType === m.id
                        ? 'bg-black text-[#FFB400] border-black shadow-xs'
                        : 'bg-[#F2F2F7] text-[#8E8E93] border-transparent hover:text-black'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Paper Width */}
            <div className="pt-2 border-t border-[#E5E5EA] flex items-center justify-between">
              <span className="text-xs font-medium text-[#1C1C1E]">Khổ giấy máy in</span>
              <div className="flex space-x-2">
                {(['80mm', '58mm'] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => setPaperWidth(w)}
                    className={`px-3 py-1 rounded-md text-xs font-bold border transition-colors ${
                      paperWidth === w
                        ? 'bg-[#FF9500] text-black border-[#FF9500]'
                        : 'bg-white text-[#8E8E93] border-[#E5E5EA]'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* LAN IP Input if LAN_IP */}
            {printerType === 'LAN_IP' && (
              <div className="pt-2 border-t border-[#E5E5EA]">
                <label className="text-xs font-medium text-[#8E8E93] block mb-1">Địa chỉ IP máy in mạng LAN</label>
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="w-full bg-[#F2F2F7] rounded-lg px-3 py-2 text-xs font-mono text-[#1C1C1E] focus:outline-none"
                  placeholder="192.168.1.200"
                />
              </div>
            )}

            {/* Test Print Button */}
            <div className="pt-2">
              <button
                onClick={handleTestPrint}
                disabled={isPrinting}
                className="w-full py-2.5 rounded-xl bg-black text-[#FFB400] font-bold text-xs shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4 stroke-[2]" />
                {isPrinting ? 'Đang gửi lệnh in...' : 'In Thử Hóa Đơn Nhiệt ESC/POS Mẫu'}
              </button>
              {printStatus && (
                <div className="mt-2 text-center text-xs font-medium text-emerald-600 animate-fadeIn">
                  {printStatus}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Offline & App Info Section */}
        <div>
          <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 px-1">
            Bộ Nhớ Đệm & Trạng Thái Ứng Dụng
          </h3>

          <div className="bg-white rounded-xl border border-[#E5E5EA] divide-y divide-[#E5E5EA] overflow-hidden shadow-xs text-xs">
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-[#FF9500]" />
                <span className="font-medium text-[#1C1C1E]">Trạng thái IndexedDB</span>
              </div>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Đang kích hoạt
              </span>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-[#1C1C1E]">Capacitor Hybrid Shell</span>
              </div>
              <span className="text-[#8E8E93] font-medium">Sẵn sàng đóng gói iOS</span>
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-purple-500" />
                <span className="font-medium text-[#1C1C1E]">Phiên bản Clone Bit-by-Bit</span>
              </div>
              <span className="font-mono text-[#8E8E93]">v2.0-master-hybrid</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
