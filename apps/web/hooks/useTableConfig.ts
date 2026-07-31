'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { TableColumnType } from 'antd';
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

export function useTableConfig<T = Record<string, unknown>>(tableId: string, staticColumns: TableColumnType<T>[]) {
  const [loading, setLoading] = useState(true);
  const [configVisible, setConfigVisible] = useState(false);
  const [rawConfig, setRawConfig] = useState<ColumnConfig[]>([]);

  // Keep reference to staticColumns to avoid re-renders and circular dependencies
  const staticColsRef = useRef(staticColumns);
  useEffect(() => {
    staticColsRef.current = staticColumns;
  }, [staticColumns]);

  // 1. Initial Column Metadata Constructor
  const createDefaultConfigFromStatic = useCallback((staticCols: TableColumnType<T>[]): ColumnConfig[] => {
    const list: ColumnConfig[] = [];
    const extractCols = (col: TableColumnType<T>) => {
      if ((col as SafeAny).children && Array.isArray((col as SafeAny).children)) {
        (col as SafeAny).children.forEach(extractCols);
      } else {
        const key = String(col.key || col.dataIndex || '');
        if (!key) return;

        let titleText = '';
        if (typeof col.title === 'string') {
          titleText = col.title;
        } else if (React.isValidElement(col.title)) {
          const props = (col.title as SafeAny).props;
          if (props && props.title && typeof props.title === 'string') {
            titleText = props.title;
          } else if (props && props.children && typeof props.children === 'string') {
            titleText = props.children;
          } else if (props && props.children && Array.isArray(props.children)) {
            const strChild = props.children.find((c: SafeAny) => typeof c === 'string');
            titleText = strChild || key;
          } else {
            titleText = key;
          }
        } else {
          titleText = key;
        }

        // Clean titles for touchpoints
        if (key.startsWith('tp_')) {
          const subKey = key.replace('tp_', '');
          if (subKey === '24h') titleText = 'Chạm 24h';
          else if (subKey === '30plus') titleText = 'Chạm 30n+';
          else titleText = `Chạm ${subKey}n`;
        }

        list.push({
          key,
          title: titleText,
          originalTitle: titleText,
          width: typeof col.width === 'number' ? col.width : undefined,
          visible: true,
          icon: '',
        });
      }
    };

    staticCols.forEach(extractCols);
    return list;
  }, []);

  // 2. Fetch and merge table configurations
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const staticDefaults = createDefaultConfigFromStatic(staticColsRef.current);
      const staticMap = new Map(staticDefaults.map((c) => [c.key, c]));
      const res = await apiClient.tableConfig.get(tableId);

      let fetchedConfig: ColumnConfig[] = [];
      if (res.userConfig && res.userConfig.length > 0) {
        fetchedConfig = res.userConfig;
      } else if (res.defaultConfig && res.defaultConfig.length > 0) {
        fetchedConfig = res.defaultConfig;
      }

      if (fetchedConfig.length > 0) {
        // Filter out stale keys that are no longer in staticColumns
        const activeFetchedConfig = fetchedConfig.filter((col) => staticMap.has(col.key));
        const existingKeys = new Set(activeFetchedConfig.map((c) => c.key));

        const updatedConfig: ColumnConfig[] = activeFetchedConfig.map((col) => {
          const staticDef = staticMap.get(col.key)!;
          const width =
            col.key === 'actions' && col.width === 200 ? 95 : col.width !== undefined ? col.width : staticDef.width;
          return {
            ...col,
            title: col.title || staticDef.title,
            originalTitle: staticDef.originalTitle,
            width,
          };
        });

        // Insert missing static columns in their natural staticDefaults index order
        staticDefaults.forEach((staticDef, targetIndex) => {
          if (!existingKeys.has(staticDef.key)) {
            const insertIndex = Math.min(targetIndex, updatedConfig.length);
            updatedConfig.splice(insertIndex, 0, staticDef);
          }
        });

        setRawConfig(updatedConfig);
      } else {
        setRawConfig(staticDefaults);
      }
    } catch (error) {
      console.error('Failed to load table config:', error);
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
        if ((staticCol as SafeAny).children && Array.isArray((staticCol as SafeAny).children)) {
          const visibleChildren = (staticCol as SafeAny).children
            .map((child: TableColumnType<T>) => {
              const childKey = String(child.key || child.dataIndex || '');
              const childConfig = configMap.get(childKey);
              if (childConfig) {
                return {
                  ...child,
                  width: childConfig.width !== undefined ? childConfig.width : child.width,
                  visible: childConfig.visible,
                  orderIndex: childConfig.index,
                };
              }
              return { ...child, visible: true, orderIndex: 9999 };
            })
            .filter((c: SafeAny) => c.visible !== false)
            .sort((a: SafeAny, b: SafeAny) => (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999));

          if (visibleChildren.length === 0) {
            return { ...staticCol, visible: false };
          }
          const firstChildIndex = (visibleChildren[0] as SafeAny)?.orderIndex;
          return {
            ...staticCol,
            children: visibleChildren,
            visible: true,
            orderIndex: typeof firstChildIndex === 'number' ? firstChildIndex : 8000,
          };
        }

        const key = (staticCol.key || staticCol.dataIndex) as string;
        const config = configMap.get(key);
        const isActions = key === 'actions';

        if (config) {
          const colIcon = config.icon !== undefined && config.icon !== '' ? config.icon : getDefaultIcon(key);
          const effectiveWidth =
            config.width !== undefined && config.width >= 40
              ? config.width
              : staticCol.width !== undefined
                ? staticCol.width
                : 120;
          return {
            ...staticCol,
            title: React.createElement(
              'span',
              { style: { display: 'inline-flex', alignItems: 'center' } },
              colIcon !== 'none' ? renderIconHelper(colIcon) : null,
              React.createElement('span', null, (staticCol.title as React.ReactNode) || config.title)
            ),
            width: effectiveWidth,
            visible: config.visible,
            orderIndex: isActions ? 99999 : config.index,
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
          orderIndex: isActions ? 99999 : 9999,
          onHeaderCell: (column: TableColumnType<T>) => ({
            width: column.width as number,
            onResize: (newWidth: number) => handleColumnResize(key, newWidth),
          }),
        };
      })
      .filter((col) => col.visible !== false)
      .sort((a, b) => ((a as SafeAny).orderIndex ?? 9999) - ((b as SafeAny).orderIndex ?? 9999));

    return merged as TableColumnType<T>[];
  }, [rawConfig, staticColumns, handleColumnResize]);

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
