'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Menu } from 'antd';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SafeAny } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { getSidebarGroups, getSelectedMenuKey, SidebarItemConfig } from '../../config/sidebar.config';

interface SidebarNavProps {
  collapsed: boolean;
  themeMode: string;
  token: SafeAny;
  userRole?: string;
}

export default function SidebarNav({ collapsed, themeMode, token, userRole }: SidebarNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const assignedStaffId = searchParams.get('assignedStaffId');

  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<SafeAny[]>([]);
  const [showCustomCampaigns, setShowCustomCampaigns] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_sidebar_show_custom_campaigns');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const fetchActiveCampaigns = useCallback(() => {
    apiClient.campaigns
      .list({ status: 'ACTIVE' })
      .then((res: SafeAny) => {
        const list = Array.isArray(res) ? res : res?.items || res?.data || [];
        setActiveCampaigns(list);
      })
      .catch((err) => {
        console.error('Fetch active campaigns for sidebar error:', err);
      });
  }, []);

  useEffect(() => {
    const handleToggle = () => {
      const saved = localStorage.getItem('mos_sidebar_show_custom_campaigns');
      setShowCustomCampaigns(saved !== null ? saved === 'true' : true);
      fetchActiveCampaigns();
    };

    window.addEventListener('storage', handleToggle);
    window.addEventListener('mos_sidebar_toggle', handleToggle);
    return () => {
      window.removeEventListener('storage', handleToggle);
      window.removeEventListener('mos_sidebar_toggle', handleToggle);
    };
  }, [fetchActiveCampaigns]);

  useEffect(() => {
    fetchActiveCampaigns();
  }, [fetchActiveCampaigns]);

  useEffect(() => {
    const savedOpenKeys = localStorage.getItem('mos_menu_openKeys');
    let keys: string[] = savedOpenKeys ? JSON.parse(savedOpenKeys) : [];
    if (pathname.includes('/dashboard/customers') || pathname.includes('/dashboard/referrals')) {
      if (!keys.includes('customers-parent')) keys.push('customers-parent');
    }
    if (pathname.includes('/dashboard/nyc')) {
      if (!keys.includes('nyc-parent')) keys.push('nyc-parent');
    }
    setOpenKeys(keys);
  }, [pathname]);

  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
    localStorage.setItem('mos_menu_openKeys', JSON.stringify(keys));
  };

  const selectedKey = getSelectedMenuKey(pathname, assignedStaffId);
  const sidebarGroups = getSidebarGroups(userRole, activeCampaigns, showCustomCampaigns);

  const createMenuItem = (item: SidebarItemConfig): SafeAny => {
    if (item.children && item.children.length > 0) {
      return {
        key: item.key,
        icon: item.icon,
        label: item.label,
        children: item.children.map(createMenuItem),
      };
    }

    return {
      key: item.key,
      icon: item.icon,
      label: item.path ? (
        <span
          onMouseEnter={() => item.path && router.prefetch(item.path)}
          style={{ display: 'inline-block', width: '100%' }}
        >
          {item.key.startsWith('nyc-campaign-') ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span>{item.label}</span>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  marginLeft: '6px',
                }}
              />
            </span>
          ) : (
            item.label
          )}
        </span>
      ) : (
        item.label
      ),
      onClick: () => {
        if (item.path) {
          router.push(item.path);
        }
      },
    };
  };

  const menuItems: SafeAny[] = sidebarGroups.map((group) => ({
    type: 'group',
    key: group.groupKey,
    label: (
      <div
        className={`sidebar-group-title text-[10px] font-bold tracking-wider uppercase select-none transition-all duration-200 ${
          collapsed ? 'hidden' : 'py-1 px-1'
        }`}
        style={{
          color: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.05em',
          marginTop: '6px',
        }}
      >
        {group.groupTitle}
      </div>
    ),
    children: group.items.map(createMenuItem),
  }));

  return (
    <nav aria-label="Main Navigation" className="sidebar-nav-container">
      <Menu
        theme={themeMode === 'dark' ? 'dark' : 'light'}
        mode="inline"
        selectedKeys={[selectedKey]}
        openKeys={openKeys}
        onOpenChange={handleOpenChange}
        items={menuItems}
        style={{
          background: themeMode === 'dark' ? '#000000' : token.colorBgContainer,
          paddingTop: '4px',
          borderRight: 0,
        }}
        className="antd-custom-menu"
      />
    </nav>
  );
}
