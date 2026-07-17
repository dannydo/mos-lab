'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ColumnConfig } from '@mos-lab/shared';
import { apiClient } from '../lib/api-client';
import { message } from 'antd';
import {
  AVAILABLE_ICONS,
  getDefaultIcon,
  renderIconHelper,
  getDynamicLucideIcon,
  getCustomIconComponent,
} from '../components/IconSystem';

export { AVAILABLE_ICONS, getDefaultIcon, renderIconHelper, getDynamicLucideIcon, getCustomIconComponent };

export function useTableConfig(tableId: string, staticColumns: any[]) {
  const [loading, setLoading] = useState(true);
  const [configVisible, setConfigVisible] = useState(false);
  const [rawConfig, setRawConfig] = useState<ColumnConfig[]>([]);
  const [mergedColumns, setMergedColumns] = useState<any[]>([]);

  // Keep reference to staticColumns to avoid re-renders and circular dependencies
  const staticColsRef = useRef(staticColumns);
  staticColsRef.current = staticColumns;

  // 1. Initial Column Metadata Constructor
  const createDefaultConfigFromStatic = useCallback((staticCols: any[]): ColumnConfig[] => {
    return staticCols.map((col) => {
      const key = (col.key || col.dataIndex) as string;
      const titleText = typeof col.title === 'string' ? col.title : col.key || col.dataIndex || 'Cột';
      return {
        key,
        title: titleText,
        originalTitle: titleText,
        width: col.width,
        visible: true,
        icon: '', // empty means fallback to getDefaultIcon
      };
    });
  }, []);

  // 2. Fetch and merge table configurations
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.tableConfig.get(tableId);
      const activeConfig = response.userConfig || response.defaultConfig;

      let finalConfig: ColumnConfig[];
      if (activeConfig && activeConfig.length > 0) {
        // Merge code-defined columns with database configuration (handles newly added columns in code)
        const activeConfigMap = new Map(activeConfig.map((c) => [c.key, c]));
        const defaultConfig = createDefaultConfigFromStatic(staticColsRef.current);

        // Map existing columns or append new ones
        const mergedList = defaultConfig.map((defCol) => {
          const savedCol = activeConfigMap.get(defCol.key);
          if (savedCol) {
            return {
              ...defCol,
              title: savedCol.title || defCol.title,
              width: savedCol.width !== undefined ? savedCol.width : defCol.width,
              visible: savedCol.visible !== false,
              icon: savedCol.icon !== undefined ? savedCol.icon : '',
            };
          }
          return defCol; // Column only in code
        });

        // Preserving the sorting order from saved configuration
        const savedOrder = activeConfig.map((c) => c.key);
        mergedList.sort((a, b) => {
          const aIndex = savedOrder.indexOf(a.key);
          const bIndex = savedOrder.indexOf(b.key);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });

        finalConfig = mergedList;
      } else {
        finalConfig = createDefaultConfigFromStatic(staticColsRef.current);
      }

      setRawConfig(finalConfig);
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
    } catch (error: any) {
      console.error('Failed to save table config:', error);
      const errMsg = error.response?.data?.message || 'Không thể lưu cấu hình bảng';
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
  useEffect(() => {
    if (rawConfig.length === 0) {
      setMergedColumns(staticColsRef.current);
      return;
    }

    const configMap = new Map(rawConfig.map((col, index) => [col.key, { ...col, index }]));

    const merged = staticColsRef.current
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
              React.createElement('span', null, config.title || staticCol.title)
            ),
            width: config.width !== undefined ? config.width : staticCol.width,
            visible: config.visible,
            orderIndex: config.index,
            onHeaderCell: (column: any) => ({
              width: column.width,
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
            React.createElement('span', null, staticCol.title)
          ),
          visible: true,
          orderIndex: 9999,
          onHeaderCell: (column: any) => ({
            width: column.width,
            onResize: (newWidth: number) => handleColumnResize(key, newWidth),
          }),
        };
      })
      .filter((col) => col.visible !== false)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    setMergedColumns(merged);
  }, [rawConfig, handleColumnResize]);

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
