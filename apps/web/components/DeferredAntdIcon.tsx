'use client';

import React from 'react';
import * as AntdIcons from '@ant-design/icons';

interface DeferredAntdIconProps extends Record<string, unknown> {
  name: string;
}

export const DeferredAntdIcon: React.FC<DeferredAntdIconProps> = ({ name, ...iconProps }) => {
  const directIcon = (AntdIcons as SafeAny)[name];
  const outlinedIcon = name.endsWith('Outlined') ? undefined : (AntdIcons as SafeAny)[`${name}Outlined`];
  const IconComponent = directIcon || outlinedIcon;

  if (!IconComponent || (typeof IconComponent !== 'function' && typeof IconComponent !== 'object')) return null;
  return React.createElement(IconComponent, iconProps);
};
