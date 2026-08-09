'use client';

import React, { useState, useEffect } from 'react';
import { Row, Col, message } from 'antd';
import { apiClient } from '../../../../../lib/api-client';
import { CvSpeedMatrix, CvSpeedRanking, CvSpeedDetail, CvSpeedPrediction, LashServiceMode } from '@mos-lab/shared';
import { CvSpeedMatrixSection } from './CvSpeedMatrixSection';
import { CvSpeedRankingSection } from './CvSpeedRankingSection';
import { CvSpeedDetailModal } from './CvSpeedDetailModal';
import { CvSpeedPredictorWidget } from './CvSpeedPredictorWidget';

export function CvSpeedTab() {
  // Matrix State
  const [matrixServiceMode, setMatrixServiceMode] = useState<LashServiceMode>('normal_clean');
  const [matrixLashStyle, setMatrixLashStyle] = useState<string>('ALL');
  const [searchCvName, setSearchCvName] = useState<string>('');
  const [matrixData, setMatrixData] = useState<CvSpeedMatrix | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [matrixPage, setMatrixPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cv_speed_matrix_page');
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });

  // Ranking State
  const [rankingStyle, setRankingStyle] = useState('Classic');
  const [rankingCount, setRankingCount] = useState<number>(60);
  const [rankingMode, setRankingMode] = useState<LashServiceMode>('normal_clean');
  const [rankingData, setRankingData] = useState<CvSpeedRanking[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingPage, setRankingPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cv_speed_ranking_page');
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });

  // CV Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [cvDetail, setCvDetail] = useState<CvSpeedDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Predictor State
  const [predCvId, setPredCvId] = useState<number | null>(null);
  const [predStyle, setPredStyle] = useState('Classic');
  const [predCount, setPredCount] = useState<number>(60);
  const [predMode, setPredMode] = useState<LashServiceMode>('normal_clean');
  const [prediction, setPrediction] = useState<CvSpeedPrediction | null>(null);
  const [predictLoading, setPredictLoading] = useState(false);

  // Active CVs list for dropdowns
  const [cvOptions, setCvOptions] = useState<Array<{ value: number; label: string }>>([]);

  // Load Matrix Data
  const fetchMatrix = async () => {
    setMatrixLoading(true);
    try {
      const res = await apiClient.kpi.cvSpeed.getMatrix({ serviceMode: matrixServiceMode });
      setMatrixData(res);
      if (res?.data && res.data.length > 0) {
        const opts = res.data.map((r) => ({ value: r.staffId, label: r.staffName }));
        setCvOptions(opts);
        if (!predCvId && opts.length > 0) {
          setPredCvId(opts[0].value);
        }
      }
    } catch {
      message.error('Không thể tải ma trận tốc độ CV.');
    } finally {
      setMatrixLoading(false);
    }
  };

  // Load Ranking Data
  const fetchRanking = async () => {
    setRankingLoading(true);
    try {
      const res = await apiClient.kpi.cvSpeed.getRanking({
        lashStyle: rankingStyle,
        lashCount: rankingCount,
        serviceMode: rankingMode,
      });
      setRankingData(res);
    } catch {
      message.error('Không thể tải bảng xếp hạng tốc độ CV.');
    } finally {
      setRankingLoading(false);
    }
  };

  // Load CV Detail Modal
  const openDetailModal = async (staffId: number) => {
    setSelectedStaffId(staffId);
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await apiClient.kpi.cvSpeed.getDetail(staffId);
      setCvDetail(res);
    } catch {
      message.error('Không thể tải thông tin chi tiết CV.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Predictor trigger
  const handlePredict = async () => {
    if (!predCvId) {
      message.warning('Vui lòng chọn Kỹ thuật viên!');
      return;
    }
    setPredictLoading(true);
    try {
      const res = await apiClient.kpi.cvSpeed.predict({
        staffId: predCvId,
        lashStyle: predStyle,
        serviceMode: predMode,
        lashCount: predCount,
      });
      setPrediction(res);
    } catch {
      message.error('Không thể dự đoán thời gian nối mi.');
    } finally {
      setPredictLoading(false);
    }
  };

  // Trigger Seed
  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await apiClient.kpi.cvSpeed.seed();
      message.success(`Đã tính toán xong ${res.profilesProcessed} hồ sơ cho ${res.cvsCount} KTV.`);
      fetchMatrix();
      fetchRanking();
    } catch {
      message.error('Lỗi khi tính toán lại dữ liệu mẫu.');
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [matrixServiceMode]);

  useEffect(() => {
    fetchRanking();
  }, [rankingStyle, rankingCount, rankingMode]);

  const handleMatrixPageChange = (page: number) => {
    setMatrixPage(page);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cv_speed_matrix_page', page.toString());
    }
  };

  const handleRankingPageChange = (page: number) => {
    setRankingPage(page);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cv_speed_ranking_page', page.toString());
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* SECTION 1: OVERVIEW SPEED MATRIX */}
      <CvSpeedMatrixSection
        matrixData={matrixData}
        loading={matrixLoading}
        seeding={seeding}
        serviceMode={matrixServiceMode}
        lashStyle={matrixLashStyle}
        searchCvName={searchCvName}
        matrixPage={matrixPage}
        onServiceModeChange={setMatrixServiceMode}
        onLashStyleChange={setMatrixLashStyle}
        onSearchChange={setSearchCvName}
        onPageChange={handleMatrixPageChange}
        onSeed={handleSeed}
        onOpenDetail={openDetailModal}
      />

      {/* SECTION 2 & 4: RANKING & PREDICTOR WIDGET ROW */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <CvSpeedRankingSection
            rankingData={rankingData}
            loading={rankingLoading}
            rankingStyle={rankingStyle}
            rankingCount={rankingCount}
            rankingMode={rankingMode}
            rankingPage={rankingPage}
            onStyleChange={setRankingStyle}
            onCountChange={setRankingCount}
            onModeChange={setRankingMode}
            onPageChange={handleRankingPageChange}
            onOpenDetail={openDetailModal}
          />
        </Col>

        <Col xs={24} lg={10}>
          <CvSpeedPredictorWidget
            cvOptions={cvOptions}
            predCvId={predCvId}
            predStyle={predStyle}
            predCount={predCount}
            predMode={predMode}
            prediction={prediction}
            loading={predictLoading}
            onCvIdChange={setPredCvId}
            onStyleChange={setPredStyle}
            onCountChange={setPredCount}
            onModeChange={setPredMode}
            onPredict={handlePredict}
          />
        </Col>
      </Row>

      {/* SECTION 3: CV DETAIL MODAL */}
      <CvSpeedDetailModal
        open={detailModalOpen}
        loading={detailLoading}
        staffId={selectedStaffId}
        cvDetail={cvDetail}
        onCancel={() => setDetailModalOpen(false)}
      />
    </div>
  );
}
