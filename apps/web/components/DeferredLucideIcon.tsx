'use client';

import React, { useEffect, useState } from 'react';
import dynamicIconImports from 'lucide-react/dynamicIconImports';

interface DeferredLucideIconProps extends Record<string, unknown> {
  name: string;
}

const lucideComponentsCache: Record<string, React.ComponentType<SafeAny>> = {};

type LucideImport = () => Promise<{ default: React.ComponentType<SafeAny> }>;

const resolveLucideImport = (name: string): { cleanName: string; importFn?: LucideImport } => {
  const cleanName = name.replace(/^lucide:/i, '').trim();
  let importFn = (dynamicIconImports as SafeAny)[cleanName] as LucideImport | undefined;

  if (!importFn) {
    const kebab = cleanName
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
    importFn = (dynamicIconImports as SafeAny)[kebab] as LucideImport | undefined;
  }

  if (!importFn) {
    const normalizedName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchedName = Object.keys(dynamicIconImports).find(
      (candidate) => candidate.replace(/[^a-z0-9]/g, '') === normalizedName
    );
    if (matchedName) importFn = (dynamicIconImports as SafeAny)[matchedName] as LucideImport | undefined;
  }

  return { cleanName, importFn };
};

export const DeferredLucideIcon: React.FC<DeferredLucideIconProps> = ({ name, ...iconProps }) => {
  const { cleanName, importFn } = resolveLucideImport(name);
  const [Icon, setIcon] = useState<React.ComponentType<SafeAny> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = cleanName.toLowerCase();
    const cachedIcon = lucideComponentsCache[cacheKey];

    if (cachedIcon) {
      setIcon(() => cachedIcon);
      return () => {
        cancelled = true;
      };
    }

    if (!importFn) {
      setIcon(null);
      return () => {
        cancelled = true;
      };
    }

    void importFn()
      .then(({ default: ResolvedIcon }) => {
        if (cancelled) return;
        lucideComponentsCache[cacheKey] = ResolvedIcon;
        setIcon(() => ResolvedIcon);
      })
      .catch(() => {
        if (!cancelled) setIcon(null);
      });

    return () => {
      cancelled = true;
    };
  }, [cleanName, importFn]);

  return Icon ? React.createElement(Icon, iconProps) : null;
};
