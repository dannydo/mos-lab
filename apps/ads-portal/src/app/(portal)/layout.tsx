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
  LogOut,
  Wallet,
} from 'lucide-react';
import { Button, Tooltip } from 'antd';

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

  return (
    <div className="flex min-h-screen bg-layout transition-colors duration-200">
      {/* Sidebar navigation */}
      <aside
        className={`fixed top-0 left-0 h-screen z-40 flex flex-col border-r border-default transition-all duration-300 bg-container ${
          collapsed ? 'w-[70px]' : 'w-[260px]'
        }`}
        style={{
          backgroundColor: mounted && themeMode === 'dark' ? '#0d1222' : '#ffffff',
          borderColor: mounted && themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
        }}
      >
        {/* Brand logo header */}
        <div className="flex items-center justify-between p-4 h-[70px] border-b border-default relative">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold shrink-0">
              W
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-wider text-heading leading-none">WINGS</span>
                <span className="text-[10px] uppercase font-semibold text-secondary tracking-widest mt-0.5">
                  Ad Portal
                </span>
              </div>
            )}
          </div>

          <Button
            type="text"
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-5 z-50 w-6 h-6 rounded-full border border-default bg-container flex items-center justify-center p-0 text-secondary hover:text-primary"
            style={{
              backgroundColor: mounted && themeMode === 'dark' ? '#0d1222' : '#ffffff',
              borderColor: mounted && themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
            }}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </Button>
        </div>

        {/* Navigation items list */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto custom-scrollbar flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.path) || (item.path === '/dashboard' && pathname === '/');

            return (
              <Tooltip key={item.id} title={collapsed ? item.label : ''} placement="right">
                <Link
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-primary-subtle text-primary border border-primary-glow/10 font-semibold'
                      : 'text-secondary hover:bg-hover hover:text-heading'
                  }`}
                  style={{
                    color: isActive ? '#b8941f' : undefined,
                    backgroundColor: isActive
                      ? mounted && themeMode === 'dark'
                        ? 'rgba(184, 148, 31, 0.12)'
                        : 'rgba(184, 148, 31, 0.08)'
                      : undefined,
                  }}
                >
                  <Icon
                    size={18}
                    className={`shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-primary' : 'text-secondary'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </Tooltip>
            );
          })}
        </nav>

        {/* Footer controls (Theme toggle & status) */}
        <div className="p-4 border-t border-default flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between gap-2 overflow-hidden">
            {!collapsed && (
              <div className="flex items-center gap-2 text-xs text-secondary shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Hệ thống online</span>
              </div>
            )}
            <Button
              type="default"
              size="small"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-2 py-1 h-8 rounded-lg shrink-0"
              icon={mounted ? themeMode === 'dark' ? <Sun size={14} /> : <Moon size={14} /> : <Sun size={14} />}
            >
              {mounted && !collapsed && (themeMode === 'dark' ? 'Sáng' : 'Tối')}
            </Button>
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
        <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
