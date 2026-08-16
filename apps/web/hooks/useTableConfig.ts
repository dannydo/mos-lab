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

export type CanonicalColumnTitles = Readonly<Record<string, string | null>>;

export interface UseTableConfigOptions {
  /**
   * Product-owned header copy that must not be replaced by a stale saved
   * column title. `null` retains the static React title (for icon-only
   * headers) while preserving its accessible name in table configuration.
   */
  canonicalTitles?: CanonicalColumnTitles;
}

const EMPTY_CANONICAL_COLUMN_TITLES: CanonicalColumnTitles = {};

export function resolveCanonicalColumnTitle(
  key: string,
  staticTitle: string,
  configuredTitle: string | undefined,
  canonicalTitles: CanonicalColumnTitles
) {
  const canonicalTitle = canonicalTitles[key];
  if (canonicalTitle !== undefined) return canonicalTitle ?? staticTitle;
  return configuredTitle?.trim() || staticTitle;
}

export function useTableConfig<T = Record<string, unknown>>(
  tableId: string,
  staticColumns: TableColumnType<T>[],
  { canonicalTitles = EMPTY_CANONICAL_COLUMN_TITLES }: UseTableConfigOptions = {}
) {
  const [loading, setLoading] = useState(true);
  const [configVisible, setConfigVisible] = useState(false);
  const [rawConfig, setRawConfig] = useState<ColumnConfig[]>([]);

  // Keep reference to staticColumns to avoid re-renders and circular dependencies
  const staticColsRef = useRef(staticColumns);
  useEffect(() => {
    staticColsRef.current = staticColumns;
  }, [staticColumns]);

  // 1. Initial Column Metadata Constructor
  const createDefaultConfigFromStatic = useCallback(
    (staticCols: TableColumnType<T>[]): ColumnConfig[] => {
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
            } else if (props && props['aria-label'] && typeof props['aria-label'] === 'string') {
              titleText = props['aria-label'];
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

          // Clean titles for touchpoints (removed "Chạm" and "n", keep 24h, 17, 19, 21, 23, 25, 30, 30+)
          if (key.startsWith('tp_')) {
            const subKey = key.replace('tp_', '');
            if (subKey === '24h') titleText = '24h';
            else if (subKey === '30plus') titleText = '30+';
            else titleText = subKey;
          }

          const canonicalTitle = canonicalTitles[key];
          if (typeof canonicalTitle === 'string') titleText = canonicalTitle;

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
    },
    [canonicalTitles]
  );

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
            title: resolveCanonicalColumnTitle(col.key, staticDef.title, col.title, canonicalTitles),
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
  }, [tableId, createDefaultConfigFromStatic, canonicalTitles]);

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

  // Synchronize rawConfig when staticColumns change (e.g. assignedStaff added after mount)
  useEffect(() => {
    if (staticColumns.length === 0) return;
    const staticDefaults = createDefaultConfigFromStatic(staticColumns);
    const staticMap = new Map(staticDefaults.map((c) => [c.key, c]));

    setRawConfig((prevConfig) => {
      if (prevConfig.length === 0) return prevConfig;
      let hasChanges = false;

      // Filter out stale keys that no longer exist in staticColumns
      const filtered = prevConfig.filter((c) => staticMap.has(c.key));
      if (filtered.length !== prevConfig.length) hasChanges = true;

      // Insert missing static columns
      const existingKeys = new Set(filtered.map((c) => c.key));
      const updated = [...filtered];

      staticDefaults.forEach((staticDef, targetIndex) => {
        if (!existingKeys.has(staticDef.key)) {
          const insertIndex = Math.min(targetIndex, updated.length);
          updated.splice(insertIndex, 0, staticDef);
          hasChanges = true;
        }
      });

      return hasChanges ? updated : prevConfig;
    });
  }, [staticColumns, createDefaultConfigFromStatic]);

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
                let displayChildTitle =
                  typeof childConfig.title === 'string' && childConfig.title.trim() !== ''
                    ? childConfig.title
                    : (child.title as React.ReactNode);

                if (childKey.startsWith('tp_')) {
                  displayChildTitle = child.title as React.ReactNode;
                }

                return {
                  ...child,
                  title: displayChildTitle,
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
        const canonicalTitle = canonicalTitles[key];

        if (config) {
          const colIcon = config.icon !== undefined && config.icon !== '' ? config.icon : getDefaultIcon(key);
          const effectiveWidth =
            config.width !== undefined && config.width >= 40
              ? config.width
              : staticCol.width !== undefined
                ? staticCol.width
                : 120;

          if (canonicalTitle === null) {
            return {
              ...staticCol,
              title: staticCol.title,
              width: effectiveWidth,
              visible: config.visible,
              orderIndex: config.index,
              onHeaderCell: (column: TableColumnType<T>) => ({
                width: column.width as number,
                onResize: (newWidth: number) => handleColumnResize(key, newWidth),
              }),
            };
          }

          const displayTitle = resolveCanonicalColumnTitle(
            key,
            typeof staticCol.title === 'string' ? staticCol.title : '',
            config.title,
            canonicalTitles
          );

          return {
            ...staticCol,
            title: React.createElement(
              'span',
              { style: { display: 'inline-flex', alignItems: 'center' } },
              colIcon !== 'none' ? renderIconHelper(colIcon) : null,
              React.createElement('span', null, displayTitle)
            ),
            width: effectiveWidth,
            visible: config.visible,
            orderIndex: config.index,
            onHeaderCell: (column: TableColumnType<T>) => ({
              width: column.width as number,
              onResize: (newWidth: number) => handleColumnResize(key, newWidth),
            }),
          };
        }

        // Newly added column in code that was not in DB
        if (canonicalTitle === null) {
          return {
            ...staticCol,
            title: staticCol.title,
            visible: true,
            orderIndex: 9999,
            onHeaderCell: (column: TableColumnType<T>) => ({
              width: column.width as number,
              onResize: (newWidth: number) => handleColumnResize(key, newWidth),
            }),
          };
        }

        const defaultColIcon = getDefaultIcon(key);
        const displayTitle = resolveCanonicalColumnTitle(
          key,
          typeof staticCol.title === 'string' ? staticCol.title : '',
          undefined,
          canonicalTitles
        );
        return {
          ...staticCol,
          title: React.createElement(
            'span',
            { style: { display: 'inline-flex', alignItems: 'center' } },
            defaultColIcon !== 'none' ? renderIconHelper(defaultColIcon) : null,
            React.createElement('span', null, displayTitle)
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
      .sort((a, b) => ((a as SafeAny).orderIndex ?? 9999) - ((b as SafeAny).orderIndex ?? 9999));

    return merged as TableColumnType<T>[];
  }, [rawConfig, staticColumns, handleColumnResize, canonicalTitles]);

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
