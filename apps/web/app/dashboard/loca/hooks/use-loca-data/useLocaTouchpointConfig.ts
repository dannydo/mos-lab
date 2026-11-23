'use client';

import { useState, useCallback, useEffect, useMemo, type RefObject } from 'react';
import { apiClient } from '~/lib/api-client';
import { DEFAULT_RESET_TOUCHPOINTS } from './constants';
import { readInitialActiveTouchpointKey, readInitialCustomTouchpoints } from './locaStorageHelpers';
import type { CustomTouchpoint, TabConfigs, UseLocaDataOptions } from './types';

export interface UseLocaTouchpointConfigParams {
  defaultConfigs: TabConfigs;
  optionsRef: RefObject<UseLocaDataOptions | undefined>;
}

export function useLocaTouchpointConfig({ defaultConfigs, optionsRef }: UseLocaTouchpointConfigParams) {
  const [customTouchpoints, setCustomTouchpoints] = useState<CustomTouchpoint[]>(readInitialCustomTouchpoints);
  const [activeTouchpointKey, setActiveTouchpointKeyState] = useState<string>(readInitialActiveTouchpointKey);
  const [configs, setConfigs] = useState<TabConfigs>(defaultConfigs);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const setActiveTouchpointKey = useCallback((key: string) => {
    setActiveTouchpointKeyState(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_activeTouchpointKey', key);
      const url = new URL(window.location.href);
      if (url.searchParams.get('touchpoint') !== key) {
        url.searchParams.set('touchpoint', key);
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    }
  }, []);

  const updateCustomTouchpoint = useCallback((index: number, daysMin: number, daysMax: number) => {
    setCustomTouchpoints((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], daysMin, daysMax };
      }
      return next;
    });
  }, []);

  // Sync customTouchpoints to localStorage and URL search params safely in useEffect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_custom_touchpoints', JSON.stringify(customTouchpoints));
      const url = new URL(window.location.href);
      let updated = false;
      customTouchpoints.forEach((item, idx) => {
        const paramKey = `ctp${idx}`;
        const paramVal = `${item.daysMin}-${item.daysMax}`;
        if (url.searchParams.get(paramKey) !== paramVal) {
          url.searchParams.set(paramKey, paramVal);
          updated = true;
        }
      });
      if (updated) {
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    }
  }, [customTouchpoints]);

  // Stabilize customTouchpoints reference for dependency tracking
  const customTouchpointsKey = useMemo(() => JSON.stringify(customTouchpoints), [customTouchpoints]);

  const handleOpenSettings = () => {
    const currentConfigs = configs['LOCA_ALL'] || [];
    optionsRef.current?.settingsForm?.setFieldsValue({ touchpoints: currentConfigs });
    setSettingsModalVisible(true);
  };

  const handleSaveConfig = async () => {
    if (!optionsRef.current?.settingsForm) return;
    try {
      const values = await optionsRef.current.settingsForm.validateFields();
      const updatedConfigs = {
        LOCA_ALL: values.touchpoints,
      };

      await apiClient.loca.updateConfig(updatedConfigs);
      optionsRef.current.onSuccess?.('Đã xuất bản cấu hình mốc chạm LoCa thành công!');
      setConfigs(updatedConfigs);
      setSettingsModalVisible(false);
      setActiveTouchpointKey('ALL');
      if (optionsRef.current.onCloseDrawer) {
        optionsRef.current.onCloseDrawer();
      }
    } catch (err) {
      console.error('Save configs failed:', err);
      optionsRef.current.onError?.((err as SafeAny).response?.data?.message || 'Lưu cấu hình thất bại.');
    }
  };

  const resetConfigDefaults = async () => {
    const defaultResetConfigs: TabConfigs = {
      LOCA_ALL: DEFAULT_RESET_TOUCHPOINTS,
    };
    await apiClient.loca.updateConfig(defaultResetConfigs);
    setConfigs(defaultResetConfigs);
    optionsRef.current?.settingsForm?.setFieldsValue({ touchpoints: defaultResetConfigs['LOCA_ALL'] });
  };

  return {
    customTouchpoints,
    customTouchpointsKey,
    activeTouchpointKey,
    configs,
    settingsModalVisible,
    setConfigs,
    setActiveTouchpointKey,
    updateCustomTouchpoint,
    setSettingsModalVisible,
    handleOpenSettings,
    handleSaveConfig,
    resetConfigDefaults,
  };
}
