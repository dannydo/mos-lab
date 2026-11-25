'use client';

import React from 'react';
import { Card, Row, Col, Select, Button, Tag, Typography, theme as antTheme } from 'antd';
import { CalculatorOutlined, FieldTimeOutlined } from '@ant-design/icons';
import { useTheme } from '../../../../../context/ThemeContext';
import { CvSpeedPrediction, ConfidenceLevel, LashServiceMode } from '@mos-lab/shared';
import { useCcMobilePortrait } from '~/app/dashboard/cc/components/useCcMobilePortrait';

const { Text } = Typography;

const LASH_STYLES = ['Classic', 'Mink', 'Volume', 'Ultralight', 'Hyperlight', 'Ivylight', 'Under Mink'];

const LASH_COUNTS = [30, 60, 70, 80, 90, 100, 120, 140];

export interface CvSpeedPredictorWidgetProps {
  cvOptions: Array<{ value: number; label: string }>;
  predCvId: number | null;
  predStyle: string;
  predCount: number;
  predMode: LashServiceMode;
  prediction: CvSpeedPrediction | null;
  loading: boolean;
  onCvIdChange: (id: number | null) => void;
  onStyleChange: (style: string) => void;
  onCountChange: (count: number) => void;
  onModeChange: (mode: LashServiceMode) => void;
  onPredict: () => void;
}

export function CvSpeedPredictorWidget({
  cvOptions,
  predCvId,
  predStyle,
  predCount,
  predMode,
  prediction,
  loading,
  onCvIdChange,
  onStyleChange,
  onCountChange,
  onModeChange,
  onPredict,
}: CvSpeedPredictorWidgetProps) {
  const { themeMode } = useTheme();
  const { token } = antTheme.useToken();
  const { showMobilePortrait } = useCcMobilePortrait();

  const renderConfidenceTag = (level: ConfidenceLevel, layer: number) => {
    const color = level === 'high' ? 'green' : level === 'medium' ? 'gold' : 'volcano';
    return (
      <Tag color={color} className="tabular-nums">
        Layer {layer} ({level.toUpperCase()})
      </Tag>
    );
  };

  if (showMobilePortrait) {
    return (
      <section
        aria-label="Công cụ dự đoán thời gian Booking"
        className="rounded-2xl p-3.5 bg-white/95 dark:bg-white/[0.045] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-3"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-50">
          <CalculatorOutlined className="text-amber-500" />
          <span>Dự Đoán Thời Gian Booking (ETA)</span>
        </div>

        <div className="space-y-3">
          <div>
            <Text type="secondary" className="text-[11px] font-semibold block mb-1">
              CHỌN CHUYÊN VIÊN (CV):
            </Text>
            <Select
              id="predictor-cv-select"
              value={predCvId}
              onChange={onCvIdChange}
              className="w-full"
              options={cvOptions}
              placeholder="Chọn Chuyên Viên (CV)"
              showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </div>

          <Row gutter={8}>
            <Col span={12}>
              <Text type="secondary" className="text-[11px] font-semibold block mb-1">
                DÁNG MI:
              </Text>
              <Select
                id="predictor-style-select"
                value={predStyle}
                onChange={onStyleChange}
                className="w-full"
                options={LASH_STYLES.map((s) => ({ value: s, label: s }))}
              />
            </Col>
            <Col span={12}>
              <Text type="secondary" className="text-[11px] font-semibold block mb-1">
                SỐ SỢI:
              </Text>
              <Select
                id="predictor-count-select"
                value={predCount}
                onChange={onCountChange}
                className="w-full"
                options={LASH_COUNTS.map((c) => ({ value: c, label: `${c} sợi` }))}
              />
            </Col>
          </Row>

          <div>
            <Text type="secondary" className="text-[11px] font-semibold block mb-1">
              CHẾ ĐỘ DỊCH VỤ:
            </Text>
            <Select
              id="predictor-mode-select"
              value={predMode}
              onChange={onModeChange}
              className="w-full"
              options={[
                { value: 'normal_clean', label: 'Khách mới / Mi sạch (Normal Clean)' },
                { value: 'normal_removal', label: 'Khách có mi cũ (Normal Removal)' },
                { value: 'retain', label: 'Dặm mi (Retain)' },
              ]}
            />
          </div>

          <Button
            type="primary"
            icon={<FieldTimeOutlined />}
            size="large"
            loading={loading}
            onClick={onPredict}
            block
            className="font-semibold flex items-center justify-center rounded-xl"
          >
            Dự Đoán Thời Gian Hoàn Thành
          </Button>

          {prediction && (
            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/90 dark:bg-white/[0.03] flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Text type="secondary" className="text-[11px] block">
                    DỰ ĐOÁN TỔNG THỜI GIAN:
                  </Text>
                  <span className="text-2xl font-extrabold tabular-nums text-amber-600 dark:text-amber-400">
                    {prediction.predictedMinutes.total} phút
                  </span>
                </div>
                <div className="text-right">
                  {renderConfidenceTag(prediction.confidence, prediction.modelLayer)}
                  <Text type="secondary" className="text-[11px] block mt-1 tabular-nums">
                    Benchmark: {prediction.benchmarkMinutes}p
                  </Text>
                </div>
              </div>

              <div className="border-t border-slate-200/75 dark:border-white/[0.07] pt-2 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>1. Vệ sinh mi:</span>
                  <span className="font-semibold tabular-nums">{prediction.predictedMinutes.cleaning} phút</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>2. Nối mi chính:</span>
                  <span className="font-semibold tabular-nums">{prediction.predictedMinutes.extension} phút</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>3. Chuẩn bị &amp; QC:</span>
                  <span className="font-semibold tabular-nums">{prediction.predictedMinutes.prepQc} phút</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <Card
      title={
        <span style={{ color: token.colorText }} className="flex items-center gap-2 font-bold">
          <CalculatorOutlined style={{ color: token.colorPrimary }} /> Công Cụ Dự Đoán Thời Gian Booking (ETA)
        </span>
      }
      variant="outlined"
      style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
    >
      <div className="flex flex-col gap-4">
        <div>
          <Text type="secondary" className="text-xs font-semibold block mb-1">
            CHỌN CHUYÊN VIÊN (CV):
          </Text>
          <Select
            id="predictor-cv-select"
            value={predCvId}
            onChange={onCvIdChange}
            style={{ width: '100%' }}
            options={cvOptions}
            placeholder="Chọn Chuyên Viên (CV)"
            showSearch
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          />
        </div>

        <Row gutter={8}>
          <Col span={12}>
            <Text type="secondary" className="text-xs font-semibold block mb-1">
              DÁNG MI:
            </Text>
            <Select
              id="predictor-style-select"
              value={predStyle}
              onChange={onStyleChange}
              style={{ width: '100%' }}
              options={LASH_STYLES.map((s) => ({ value: s, label: s }))}
            />
          </Col>
          <Col span={12}>
            <Text type="secondary" className="text-xs font-semibold block mb-1">
              SỐ SỢI:
            </Text>
            <Select
              id="predictor-count-select"
              value={predCount}
              onChange={onCountChange}
              style={{ width: '100%' }}
              options={LASH_COUNTS.map((c) => ({ value: c, label: `${c} sợi` }))}
            />
          </Col>
        </Row>

        <div>
          <Text type="secondary" className="text-xs font-semibold block mb-1">
            CHẾ ĐỘ DỊCH VỤ:
          </Text>
          <Select
            id="predictor-mode-select"
            value={predMode}
            onChange={onModeChange}
            style={{ width: '100%' }}
            options={[
              { value: 'normal_clean', label: 'Khách mới / Mi sạch (Normal Clean)' },
              { value: 'normal_removal', label: 'Khách có mi cũ (Normal Removal)' },
              { value: 'retain', label: 'Dặm mi (Retain)' },
            ]}
          />
        </div>

        <Button
          type="primary"
          icon={<FieldTimeOutlined />}
          size="large"
          loading={loading}
          onClick={onPredict}
          block
          className="mt-2 font-semibold flex items-center justify-center"
        >
          Dự Đoán Thời Gian Hoàn Thành
        </Button>

        {prediction && (
          <div
            className="p-4 rounded-lg border mt-2 flex flex-col gap-3 transition-all"
            style={{
              backgroundColor: themeMode === 'dark' ? '#1f1f1f' : '#fafafa',
              borderColor: token.colorBorderSecondary,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <Text type="secondary" className="text-xs block">
                  DỰ ĐOÁN TỔNG THỜI GIAN:
                </Text>
                <span className="text-3xl font-extrabold tabular-nums" style={{ color: token.colorPrimary }}>
                  {prediction.predictedMinutes.total} phút
                </span>
              </div>
              <div className="text-right">
                {renderConfidenceTag(prediction.confidence, prediction.modelLayer)}
                <Text type="secondary" className="text-xs block mt-1 tabular-nums">
                  Benchmark chuẩn: {prediction.benchmarkMinutes}p
                </Text>
              </div>
            </div>

            <div className="border-t pt-2 mt-1" style={{ borderColor: token.colorBorderSecondary }}>
              <Text type="secondary" className="text-xs font-semibold block mb-2">
                BÓC TÁCH 4 GIAI ĐOẠN (PHASE BREAKDOWN):
              </Text>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span style={{ color: token.colorText }}>1. Vệ sinh mi (Cleaning):</span>
                  <span className="font-semibold tabular-nums" style={{ color: token.colorText }}>
                    {prediction.predictedMinutes.cleaning} phút
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span style={{ color: token.colorText }}>2. Nối mi chính (Extension):</span>
                  <span className="font-semibold tabular-nums" style={{ color: token.colorText }}>
                    {prediction.predictedMinutes.extension} phút
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span style={{ color: token.colorText }}>3. Chuẩn bị & QC kiểm tra (Prep & QC):</span>
                  <span className="font-semibold tabular-nums" style={{ color: token.colorText }}>
                    {prediction.predictedMinutes.prepQc} phút
                  </span>
                </div>
                <div
                  className="flex justify-between items-center text-xs border-t pt-1 font-bold"
                  style={{ borderColor: token.colorBorderSecondary }}
                >
                  <span style={{ color: token.colorText }}>4. Tổng thời gian (Total):</span>
                  <span className="tabular-nums" style={{ color: token.colorPrimary }}>
                    {prediction.predictedMinutes.total} phút
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
