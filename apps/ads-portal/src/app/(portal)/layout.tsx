'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Flame,
  MessageSquare,
  Compass,
  Map,
  BookOpen,
  GraduationCap,
  DollarSign,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Wallet,
  Search,
  Bell,
  Sparkles,
} from 'lucide-react';
import { Button, Tooltip, Input, Badge } from 'antd';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tổng quan Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { id: 'crm', label: 'CRM Khách hàng', path: '/crm', icon: Users },
  { id: 'lead-manager', label: 'Lead Manager', path: '/lead-manager', icon: Briefcase },
  { id: 'hot-leads', label: 'Hot Leads', path: '/hot-leads', icon: Flame },
  { id: 'follow-up', label: 'Follow-up', path: '/follow-up', icon: MessageSquare },
  { id: 'personas', label: 'Chân dung Khách hàng', path: '/personas', icon: Compass },
  { id: 'optimization', label: 'Bản đồ Tối ưu hóa', path: '/optimization', icon: Map },
  { id: 'playbook', label: 'Kịch bản & Playbook', path: '/playbook', icon: BookOpen },
  { id: 'billing', label: 'Đối soát Kế toán', path: '/billing', icon: Wallet },
  { id: 'courses', label: 'Thông tin Khóa học', path: '/courses', icon: GraduationCap },
  { id: 'commission', label: 'Hoa hồng', path: '/commission', icon: DollarSign },
  { id: 'staff', label: 'Quản lý Nhân sự', path: '/staff', icon: UserCog },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { themeMode, toggleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeItem =
    NAV_ITEMS.find((item) => pathname.startsWith(item.path) || (item.path === '/dashboard' && pathname === '/')) ||
    NAV_ITEMS[0];

  return (
    <div className="flex min-h-screen bg-layout transition-colors duration-200">
      {/* Sidebar navigation */}
      <aside
        className={`fixed top-0 left-0 h-screen z-40 flex flex-col border-r transition-all duration-300 glass-card ${
          collapsed ? 'w-[70px]' : 'w-[260px]'
        }`}
        style={{
          backgroundColor: mounted && themeMode === 'dark' ? '#0d1222' : '#ffffff',
          borderColor: mounted && themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
        }}
      >
        {/* Brand logo header */}
        <div className="flex items-center justify-between p-4 h-[64px] border-b border-default relative">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#b8941f] to-[#d4af37] flex items-center justify-center text-white font-bold shrink-0 shadow-xs">
              W
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-wider text-heading leading-none">WINGS</span>
                <span className="text-[9px] uppercase font-bold text-[#b8941f] tracking-widest mt-0.5">
                  Ad Portal Pro
                </span>
              </div>
            )}
          </div>

          <Tooltip title={collapsed ? 'Mở rộng Sidebar' : 'Thu gọn Sidebar'}>
            <Button
              type="text"
              onClick={() => setCollapsed(!collapsed)}
              className="absolute -right-3 top-4 z-50 w-6 h-6 rounded-full border border-default bg-container flex items-center justify-center p-0 text-secondary hover:text-primary shadow-xs"
              style={{
                backgroundColor: mounted && themeMode === 'dark' ? '#0d1222' : '#ffffff',
                borderColor: mounted && themeMode === 'dark' ? 'rgba(255,255,255,0.12)' : '#cbd5e1',
              }}
            >
              {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </Button>
          </Tooltip>
        </div>

        {/* Navigation items list */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto custom-scrollbar flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.path) || (item.path === '/dashboard' && pathname === '/');

            return (
              <Tooltip key={item.id} title={collapsed ? item.label : ''} placement="right">
                <Link
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-[#b8941f]/15 text-[#b8941f] border border-[#b8941f]/30 font-bold shadow-xs'
                      : 'text-secondary hover:bg-hover hover:text-heading'
                  }`}
                  style={{
                    color: isActive ? '#b8941f' : undefined,
                  }}
                >
                  <Icon
                    size={17}
                    className={`shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-[#b8941f]' : 'text-secondary'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </Tooltip>
            );
          })}
        </nav>

        {/* Footer controls (Theme toggle & status) */}
        <div className="p-3 border-t border-default flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between gap-2 overflow-hidden">
            {!collapsed && (
              <div className="flex items-center gap-2 text-[11px] font-medium text-secondary shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Online</span>
              </div>
            )}
            <Tooltip title="Chuyển đổi giao diện Sáng / Tối">
              <Button
                type="default"
                size="small"
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-2 py-1 h-7 rounded-md shrink-0 text-xs font-semibold border-default"
                icon={mounted ? themeMode === 'dark' ? <Sun size={13} /> : <Moon size={13} /> : <Sun size={13} />}
              >
                {mounted && !collapsed && (themeMode === 'dark' ? 'Sáng' : 'Tối')}
              </Button>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Main content frame */}
      <main
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{
          marginLeft: collapsed ? '70px' : '260px',
        }}
      >
        {/* Top Global Floating Header */}
        <header
          className="sticky top-0 z-30 h-[64px] border-b flex items-center justify-between px-6 glass-card backdrop-blur-md transition-colors"
          style={{
            backgroundColor: mounted && themeMode === 'dark' ? 'rgba(13, 18, 34, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: mounted && themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
          }}
        >
          {/* Breadcrumb & Active Title */}
          <div className="flex items-center gap-2.5">
            <activeItem.icon size={18} className="text-[#b8941f]" />
            <h1 className="font-extrabold text-sm tracking-tight text-heading uppercase">{activeItem.label}</h1>
          </div>

          {/* Global Utility Actions */}
          <div className="flex items-center gap-3">
            <Tooltip title="Thông báo hệ thống">
              <div className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-secondary transition-colors relative">
                <Badge dot color="#b8941f">
                  <Bell size={16} />
                </Badge>
              </div>
            </Tooltip>

            <Tooltip title="Trạng thái AI">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#b8941f]/10 border border-[#b8941f]/30 text-[#b8941f] text-xs font-bold">
                <Sparkles size={13} />
                <span>AI Active</span>
              </div>
            </Tooltip>
          </div>
        </header>

        {/* Full-width Main Viewport */}
        <div id="main-content" tabIndex={-1} className="flex-1 p-4 md:p-6 w-full max-w-full focus:outline-none">
          {children}
        </div>
      </main>
    </div>
  );
}
