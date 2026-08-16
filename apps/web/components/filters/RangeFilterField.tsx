import React from 'react';
import { Row, Col, Form, InputNumber } from 'antd';

interface RangeFilterFieldProps {
  minLabel: React.ReactNode;
  maxLabel: React.ReactNode;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  minValue: number | undefined;
  maxValue: number | undefined;
  onChangeMin: (val: number | undefined) => void;
  onChangeMax: (val: number | undefined) => void;
  min?: number;
  max?: number;
  formatter?: (val: SafeAny) => string;
  parser?: (val: SafeAny) => SafeAny;
  themeMode: string;
}

export const RangeFilterField: React.FC<RangeFilterFieldProps> = ({
  minLabel,
  maxLabel,
  minPlaceholder,
  maxPlaceholder,
  minValue,
  maxValue,
  onChangeMin,
  onChangeMax,
  min = 0,
  max,
  formatter,
  parser,
  themeMode,
}) => {
  const labelStyle = { fontSize: '12px', color: themeMode === 'dark' ? '#aaa' : '#555' };

  return (
    <Row gutter={12}>
      <Col span={12}>
        <Form.Item label={<span style={labelStyle}>{minLabel}</span>}>
          <InputNumber
            aria-label={typeof minLabel === 'string' ? minLabel : 'Giá trị tối thiểu'}
            style={{ width: '100%', borderRadius: '6px' }}
            controls={false}
            min={min}
            max={max}
            placeholder={minPlaceholder}
            value={minValue}
            onChange={(val) => onChangeMin(val ?? undefined)}
            formatter={formatter}
            parser={parser}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label={<span style={labelStyle}>{maxLabel}</span>}>
          <InputNumber
            aria-label={typeof maxLabel === 'string' ? maxLabel : 'Giá trị tối đa'}
            style={{ width: '100%', borderRadius: '6px' }}
            controls={false}
            min={min}
            max={max}
            placeholder={maxPlaceholder}
            value={maxValue}
            onChange={(val) => onChangeMax(val ?? undefined)}
            formatter={formatter}
            parser={parser}
          />
        </Form.Item>
      </Col>
    </Row>
  );
};
export default RangeFilterField;
