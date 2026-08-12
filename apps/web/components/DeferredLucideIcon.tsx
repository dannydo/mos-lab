'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import dynamicIconImports from 'lucide-react/dynamicIconImports';

interface DeferredLucideIconProps extends Record<string, unknown> {
  name: string;
}

const lucideComponentsCache: Record<string, React.ComponentType<SafeAny>> = {};

const resolveLucideImport = (name: string) => {
  const cleanName = name.replace(/^lucide:/i, '').trim();
  let importFn = (dynamicIconImports as SafeAny)[cleanName];

  if (!importFn) {
    const kebab = cleanName
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
    importFn = (dynamicIconImports as SafeAny)[kebab];
  }

  if (!importFn) {
    const normalizedName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchedName = Object.keys(dynamicIconImports).find(
      (candidate) => candidate.replace(/[^a-z0-9]/g, '') === normalizedName
    );
    if (matchedName) importFn = (dynamicIconImports as SafeAny)[matchedName];
  }

  return { cleanName, importFn };
};

export const DeferredLucideIcon: React.FC<DeferredLucideIconProps> = ({ name, ...iconProps }) => {
  const { cleanName, importFn } = resolveLucideImport(name);
  if (!importFn) return null;

  const cacheKey = cleanName.toLowerCase();
  if (!lucideComponentsCache[cacheKey]) {
    lucideComponentsCache[cacheKey] = dynamic(importFn, {
      ssr: false,
      loading: () => null,
    });
  }

  return React.createElement(lucideComponentsCache[cacheKey], iconProps);
};
