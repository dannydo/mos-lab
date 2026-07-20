'use client';

import React from 'react';
import { Card, Row, Col, Progress, Tag, Avatar } from 'antd';
import { UserOutlined, SmileOutlined, FrownOutlined, AimOutlined } from '@ant-design/icons';

const PERSONAS = [
  {
    id: 'vy',
    name: 'Chị Vy',
    subtitle: 'Nhóm Học viên Định cư Nước ngoài',
    avatarLetter: 'Vy',
    stream: 'Academy',
    age: '28 - 42 tuổi',
    location: 'TP.HCM (Quận 1 & lân cận)',
    goal: 'Học đi nước ngoài làm việc',
    bio: 'Sắp xuất cảnh sang các nước phát triển (Úc, Mỹ, Canada). Cần học nghề nối mi thần tốc để sang nước ngoài làm việc kiếm thu nhập cao (~$50 - $100/giờ), nhanh chóng ổn định cuộc sống mới.',
    metrics: [
      { label: 'Độ gấp rút (Urgency)', val: 95, color: '#ef4444' },
      { label: 'Khả năng đi xa (Mobility)', val: 35, valText: '35% (Chỉ học bán kính 5-10km)', color: '#f59e0b' },
      { label: 'Độ nhạy cảm giá (Price Sensitivity)', val: 25, valText: '25% (Sẵn sàng chi cao)', color: '#10b981' },
    ],
    painPoints: [
      { title: 'Thời gian quá cận kề', desc: 'Sợ học kéo dài không kịp ngày bay. Cần khóa học thần tốc chất lượng.' },
      { title: 'Chứng chỉ & Pháp lý nước ngoài', desc: 'Lo lắng chứng chỉ không được quốc tế chấp nhận.' },
      { title: 'Ngại di chuyển xa', desc: 'Ngại đi xa, chỉ muốn học trong bán kính 5-10km từ nhà (Khu vực Q1/Q3).' },
    ],
    strategy: [
      {
        title: 'Đánh mạnh cam kết',
        desc: 'Thông điệp "Học nhanh thần tốc - Cam kết vững tay nghề - Chứng chỉ quốc tế".',
      },
      {
        title: 'Quy trình thực tế',
        desc: 'Đào tạo đặt mi 1D (Classic, Ivy Clover, Hyper Promade...) gắp đặt ăn ngay.',
      },
      {
        title: 'Bảo hành rủi ro',
        desc: 'Đưa chính sách "Bảo hành kiểu Úc" hoàn trả học phí 2 buổi đầu nếu không hài lòng.',
      },
    ],
  },
  {
    id: 'mai',
    name: 'Bạn Mai',
    subtitle: 'Nhóm Mẹ bỉm sữa / Đổi nghề tự lập',
    avatarLetter: 'Mai',
    stream: 'Academy',
    age: '22 - 32 tuổi',
    location: 'TP.HCM',
    goal: 'Muốn tự chủ thu nhập & thời gian',
    bio: 'Đang làm văn phòng áp lực hoặc là mẹ bỉm sữa muốn có một công việc tự do, thu nhập cao hơn để tự lập và có thời gian chăm lo gia đình.',
    metrics: [
      { label: 'Độ gấp rút (Urgency)', val: 60, color: '#f59e0b' },
      { label: 'Khả năng đi xa (Mobility)', val: 50, valText: '50% (Tối đa 10km)', color: '#f59e0b' },
      {
        label: 'Độ nhạy cảm giá (Price Sensitivity)',
        val: 85,
        valText: '85% (Cần trả góp/quà tặng)',
        color: '#ef4444',
      },
    ],
    painPoints: [
      {
        title: 'Sợ không khéo tay / tay run',
        desc: 'Lo sợ mắt mờ, tay run không nối được (Cần test cơ địa trước khi học).',
      },
      {
        title: 'Học phí ban đầu',
        desc: 'Ngân sách ban đầu hạn chế, nhạy cảm với các chi phí phát sinh hoặc cốp đồ nghề.',
      },
      { title: 'Đầu ra & Việc làm', desc: 'Sợ tốt nghiệp xong thất nghiệp, không có khách hoặc không biết mở tiệm.' },
    ],
    strategy: [
      { title: 'Cam kết cầm tay chỉ việc', desc: 'Thông điệp "Học nghề từ số 0 - Không khéo tay vẫn học được".' },
      {
        title: 'Hỗ trợ tài chính',
        desc: 'Tư vấn chính sách học phí linh hoạt, trả góp hoặc ưu đãi cốp đồ nghề Foundation Kit.',
      },
      {
        title: 'Bảo hành & Việc làm',
        desc: 'Tặng bảo hành kiểu Úc hoàn tiền 2 buổi, cam kết hỗ trợ việc làm/mở tiệm sau khóa học.',
      },
    ],
  },
];

export default function PersonasPage() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-xl font-bold text-heading">Chân dung Khách hàng (Personas)</h1>
        <p className="text-xs text-secondary">Phân loại học viên chính và định hướng truyền thông chốt đơn phù hợp</p>
      </div>

      <Row gutter={[20, 20]}>
        {PERSONAS.map((p) => (
          <Col xs={24} lg={12} key={p.id}>
            <Card
              className="shadow-sm border border-default h-full"
              title={
                <div className="flex items-center gap-3 py-1">
                  <Avatar
                    size="large"
                    style={{
                      backgroundColor: p.id === 'vy' ? '#8b5cf6' : '#ec4899',
                      color: '#fff',
                      fontWeight: 'bold',
                    }}
                  >
                    {p.avatarLetter}
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-bold text-base text-heading">{p.name}</span>
                    <span className="text-xs text-secondary font-normal">{p.subtitle}</span>
                  </div>
                </div>
              }
              extra={<Tag color="purple">{p.stream}</Tag>}
            >
              <div className="flex flex-wrap gap-1.5 mb-4">
                <Tag color="default">👩 {p.age}</Tag>
                <Tag color="default">📍 {p.location}</Tag>
                <Tag color="default">🎯 {p.goal}</Tag>
              </div>

              <div className="text-sm leading-relaxed text-secondary mb-5 italic bg-hover p-3 rounded-lg border border-default">
                "{p.bio}"
              </div>

              {/* Metrics */}
              <div className="flex flex-col gap-3 mb-6">
                <span className="font-bold text-xs uppercase tracking-wider text-secondary">Chỉ số đặc trưng</span>
                {p.metrics.map((m, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex justify-between font-medium text-heading mb-1">
                      <span>{m.label}</span>
                      <span>{m.valText || `${m.val}%`}</span>
                    </div>
                    <Progress percent={m.val} strokeColor={m.color} showInfo={false} size={{ height: 6 }} />
                  </div>
                ))}
              </div>

              {/* Pain points and Strategy details */}
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <div className="flex flex-col gap-2.5">
                    <span className="font-bold text-xs uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                      <FrownOutlined /> Rào cản & Nỗi đau
                    </span>
                    <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
                      {p.painPoints.map((item, idx) => (
                        <li key={idx} className="text-xs leading-relaxed">
                          <strong className="text-heading block">{item.title}</strong>
                          <span className="text-secondary">{item.desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Col>
                <Col xs={24} sm={12} className="border-t sm:border-t-0 sm:border-l border-default pt-4 sm:pt-0 sm:pl-4">
                  <div className="flex flex-col gap-2.5">
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                      <SmileOutlined /> Chiến lược Tư vấn
                    </span>
                    <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
                      {p.strategy.map((item, idx) => (
                        <li key={idx} className="text-xs leading-relaxed">
                          <strong className="text-heading block">{item.title}</strong>
                          <span className="text-secondary">{item.desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
