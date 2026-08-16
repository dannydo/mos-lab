'use client';

import React from 'react';
import { Form } from 'antd';
import type { FormItemProps, FormProps } from 'antd';
import { ResponsiveFormField, ResponsiveFormGrid } from './ResponsiveFormGrid';
import type { ResponsiveFormColumns } from './ResponsiveFormGrid';

export interface EntityFormProps<Values = Record<string, unknown>> extends Omit<
  FormProps<Values>,
  'children' | 'className'
> {
  children: React.ReactNode;
  columns?: ResponsiveFormColumns;
  className?: string;
  gridClassName?: string;
}

/** A vertical Ant Design form already wired to the shared responsive grid. */
export function EntityForm<Values = Record<string, unknown>>({
  children,
  columns = 2,
  className = '',
  gridClassName = '',
  layout = 'vertical',
  ...formProps
}: EntityFormProps<Values>) {
  return (
    <Form<Values> {...formProps} layout={layout} className={`entity-form ${className}`.trim()}>
      <ResponsiveFormGrid columns={columns} className={gridClassName}>
        {children}
      </ResponsiveFormGrid>
    </Form>
  );
}

export interface EntityFormFieldProps extends Omit<FormItemProps, 'children' | 'className'> {
  children: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  itemClassName?: string;
}

/** A responsive Form.Item slot. Only `fullWidth` is needed for a field to span the grid. */
export function EntityFormField({
  children,
  fullWidth = false,
  className = '',
  itemClassName = '',
  ...itemProps
}: EntityFormFieldProps) {
  return (
    <ResponsiveFormField fullWidth={fullWidth} className={className}>
      <Form.Item {...itemProps} className={`entity-form-item ${itemClassName}`.trim()}>
        {children}
      </Form.Item>
    </ResponsiveFormField>
  );
}

export default EntityForm;
