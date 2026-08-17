'use client';

import React, { forwardRef } from 'react';
import { Button, Input } from 'antd';
import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';
import type { InputRef } from 'antd';
import { AppIcon } from './AppIcon';

export interface SearchFieldProps extends Omit<ComponentProps<typeof Input.Search>, 'variant'> {
  /** Accessible name for the icon-only submit action. */
  searchButtonLabel?: string;
  /** A filter narrows visible data as the user types and deliberately has no submit action. */
  behavior?: 'submit' | 'filter';
}

/**
 * Standard search affordance for list screens.
 *
 * The renderer stays Ant Design, while the Assembly Kit owns responsive target
 * sizing so an icon-only submit action is never smaller than the active density
 * profile (44 px on phones).
 */
export const SearchField = React.memo(
  forwardRef<InputRef, SearchFieldProps>(function SearchField(
    { className, searchButtonLabel = 'Tìm kiếm', behavior = 'submit', enterButton, onSearch, loading, ...inputProps },
    ref
  ) {
    if (behavior === 'filter') {
      return (
        <Input
          {...inputProps}
          ref={ref}
          prefix={inputProps.prefix ?? <AppIcon icon={Search} size="sm" />}
          className={['mos-search-field', className].filter(Boolean).join(' ')}
        />
      );
    }

    const resolvedEnterButton = enterButton ?? (
      <Button type="primary" aria-label={searchButtonLabel} icon={<AppIcon icon={Search} size="action" />} />
    );

    return (
      <Input.Search
        {...inputProps}
        ref={ref}
        loading={loading}
        onSearch={onSearch}
        enterButton={resolvedEnterButton}
        className={['mos-search-field', className].filter(Boolean).join(' ')}
      />
    );
  })
);

SearchField.displayName = 'SearchField';

export default SearchField;
