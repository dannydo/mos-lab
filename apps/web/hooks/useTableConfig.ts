'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { TableColumnType } from 'antd';
import { ColumnConfig } from '@mos-lab/shared';
import { apiClient } from '../lib/api-client';
import { message } from 'antd';
import { useTheme } from '../context/ThemeContext';
import {
  AVAILABLE_ICONS,
  getDefaultIcon,
  renderIconHelper,
  getDynamicLucideIcon,
  getCustomIconComponent,
} from '../components/IconSystem';

export { AVAILABLE_ICONS, getDefaultIcon, renderIconHelper, getDynamicLucideIcon, getCustomIconComponent };

export function useTableConfig<T = Record<string, unknown>>(tableId: string, staticColumns: TableColumnType<T>[]) {
  const { themeMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [configVisible, setConfigVisible] = useState(false);
  const [rawConfig, setRawConfig] = useState<ColumnConfig[]>([]);

  // Keep reference to staticColumns to avoid re-renders and circular dependencies
  const staticColsRef = useRef(staticColumns);
  staticColsRef.current = staticColumns;

  // 1. Initial Column Metadata Constructor
  const createDefaultConfigFromStatic = useCallback((staticCols: TableColumnType<T>[]): ColumnConfig[] => {
    return staticCols.map((col) => {
      const key = String(col.key || col.dataIndex || '');
      const titleText = typeof col.title === 'string' ? col.title : String(col.key || col.dataIndex || 'Cột');
      return {
        key,
        title: titleText,
        originalTitle: titleText,
        width: typeof col.width === 'number' ? col.width : undefined,
        visible: true,
        icon: '', // empty means fallback to getDefaultIcon
      };
    });
  }, []);

  // 2. Fetch and merge table configurations
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.tableConfig.get(tableId);
      if (res.userConfig && res.userConfig.length > 0) {
        setRawConfig(res.userConfig);
      } else if (res.defaultConfig && res.defaultConfig.length > 0) {
        setRawConfig(res.defaultConfig);
      } else {
        // Fallback to static columns
        setRawConfig(createDefaultConfigFromStatic(staticColsRef.current));
      }
    } catch (error) {
      console.error('Failed to load table config:', error);
      // Fallback to static columns
      setRawConfig(createDefaultConfigFromStatic(staticColsRef.current));
    } finally {
      setLoading(false);
    }
  }, [tableId, createDefaultConfigFromStatic]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // 3. Save configuration wrapper
  const saveConfig = async (newColumns: ColumnConfig[], saveAsDefault = false) => {
    try {
      const res = await apiClient.tableConfig.save(tableId, newColumns, saveAsDefault);
      if (res.success) {
        message.success(res.message);
        setRawConfig(newColumns);
      }
    } catch (error) {
      console.error('Failed to save table config:', error);
      const err = error as { response?: { data?: { message?: string } } };
      const errMsg = (err as SafeAny).response?.data?.message || 'Không thể lưu cấu hình bảng';
      message.error(errMsg);
      throw error;
    }
  };

  // 4. Reset configuration wrapper
  const resetConfig = async () => {
    try {
      const res = await apiClient.tableConfig.reset(tableId);
      if (res.success) {
        message.success(res.message);
        // Reload settings
        await loadConfig();
      }
    } catch (error) {
      console.error('Failed to reset table config:', error);
      message.error('Không thể reset cấu hình bảng');
      throw error;
    }
  };

  // 5. Column resizing on-the-fly directly from table drags
  const handleColumnResize = useCallback(
    async (key: string, width: number) => {
      setRawConfig((prev) => {
        const updated = prev.map((col) => {
          if (col.key === key) {
            return { ...col, width };
          }
          return col;
        });

        // Save to server asynchronously without blocking/loading state
        apiClient.tableConfig.save(tableId, updated, false).catch((err) => {
          console.error('Failed to auto-save column width:', err);
        });

        return updated;
      });
    },
    [tableId]
  );

  // 6. Merge rawConfig metadata with static column definitions (functions, renders, align)
  const mergedColumns = useMemo(() => {
    if (rawConfig.length === 0) {
      return staticColumns;
    }

    const configMap = new Map(rawConfig.map((col, index) => [col.key, { ...col, index }]));

    const merged = staticColumns
      .map((staticCol) => {
        const key = (staticCol.key || staticCol.dataIndex) as string;
        const config = configMap.get(key);

        if (config) {
          const colIcon = config.icon !== undefined && config.icon !== '' ? config.icon : getDefaultIcon(key);
          return {
            ...staticCol,
            title: React.createElement(
              'span',
              { style: { display: 'inline-flex', alignItems: 'center' } },
              colIcon !== 'none' ? renderIconHelper(colIcon) : null,
              React.createElement('span', null, config.title || (staticCol.title as React.ReactNode))
            ),
            width: config.width !== undefined ? config.width : staticCol.width,
            visible: config.visible,
            orderIndex: config.index,
            onHeaderCell: (column: TableColumnType<T>) => ({
              width: column.width as number,
              onResize: (newWidth: number) => handleColumnResize(key, newWidth),
            }),
          };
        }

        // Newly added column in code that was not in DB
        const defaultColIcon = getDefaultIcon(key);
        return {
          ...staticCol,
          title: React.createElement(
            'span',
            { style: { display: 'inline-flex', alignItems: 'center' } },
            defaultColIcon !== 'none' ? renderIconHelper(defaultColIcon) : null,
            React.createElement('span', null, staticCol.title as React.ReactNode)
          ),
          visible: true,
          orderIndex: 9999,
          onHeaderCell: (column: TableColumnType<T>) => ({
            width: column.width as number,
            onResize: (newWidth: number) => handleColumnResize(key, newWidth),
          }),
        };
      })
      .filter((col) => col.visible !== false)
      .sort((a, b) => (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999));

    return merged as TableColumnType<T>[];
  }, [rawConfig, staticColumns, handleColumnResize, themeMode]);

  return {
    loading,
    columns: mergedColumns,
    rawConfig,
    configVisible,
    openConfig: () => setConfigVisible(true),
    closeConfig: () => setConfigVisible(false),
    saveConfig,
    resetConfig,
  };
}
