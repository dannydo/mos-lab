'use client';

import React, { useState } from 'react';
import { Card, Row, Col, Slider, Badge, Tag, Table, Alert, Timeline } from 'antd';
import {
  CompassOutlined,
  AimOutlined,
  ReadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';

interface LearningRow {
  key: string;
  date: string;
  insight: string;
  action: string;
  author: string;
}

const LEARNINGS_DATA: LearningRow[] = [
  {
    key: '1',
    date: '2026-06-24',
    insight:
      'Thiết lập Saved Audience "[WA] Bạn Mai - Đổi Nghề Khởi Nghiệp" trên Facebook Ads Manager với targeting chính xác (Nữ 23-35, HCM, 6 interests phù hợp).',
    action: 'Tạo audience config wa_bạn_mai_đổi_nghề.json, áp dụng trực tiếp trên Facebook Ads.',
    author: 'Antigravity AI',
  },
  {
    key: '2',
    date: '2026-06-22',
    insight:
      'Nhận diện tệp học viên định cư nước ngoài là tệp khách hàng VIP trên TikTok của Academy. Thu nhập cao, nhạy cảm chất lượng hơn giá.',
    action: 'Thiết lập chân dung Chị Vy (32 tuổi), cập nhật góc viết Ads định vị "Học đi định cư".',
    author: 'Antigravity AI',
  },
  {
    key: '3',
    date: '2026-06-22',
    insight: 'Cả 2 mảng Wings Lashes và Wings Academy chạy chung 1 tài khoản quảng cáo ...1124 dưới tag [WL] và [WA].',
    action: 'Cấu trúc lại dự án thành 2 luồng dữ liệu độc lập (data/lashes và data/academy).',
    author: 'Antigravity AI',
  },
  {
    key: '4',
    date: '2026-06-22',
    insight:
      'Phát hiện lỗi tư vấn "Test Cơ Địa" gây phòng thủ cho khách hàng trong Facebook Inbox. Lead bị đứt gãy ngay lập tức.',
    action: 'Đề xuất reframe kịch bản sang "Trải nghiệm cầm nhíp & hướng nghiệp 1-1 miễn phí".',
    author: 'Antigravity AI',
  },
];

export default function OptimizationPage() {
  const [strands, setStrands] = useState(8);

  // Strands simulator data classification
  const getSimResults = (count: number) => {
    if (count < 5) {
      return {
        rank: 'Nhóm Cần rèn luyện thêm 🔧',
        scholarship: 'Không có học bổng',
        status: 'Khuyên làm Dummy thêm 15 phút',
        teacherText:
          'Em nối hơi run tay chút nè, không sao đâu để cô hướng dẫn cách tì tay và điều tiết nhíp. Mình tập lại dummy 15 phút xem sao nha.',
        salesText:
          'Chị Nhi ơi, giảng viên bảo tay nghề mình còn hơi run, cần luyện tập thêm để định vị. Wings tặng chị thêm 1 buổi học thử bổ trợ để tay mình vững hơn nhé.',
        activeNode: 'nudge',
      };
    }
    if (count < 10) {
      return {
        rank: 'Nhóm Đầy triển vọng ⭐',
        scholarship: 'Tặng cốp Foundation Kit',
        status: 'Tư vấn lộ trình Basic',
        teacherText:
          'Nối được 8 sợi trong 5 phút là khá tốt cho buổi đầu cầm nhíp rồi đó em! Thích ứng khoảng cách nhíp chuẩn.',
        salesText:
          'Chúc mừng Nhi đã đạt mốc Triển vọng, Wings đề xuất chị đăng ký khóa Basic (1.9M). Khóa này chị được tặng kèm bộ cốp đồ nghề Foundation để thực hành.',
        activeNode: 'direct',
      };
    }
    if (count < 20) {
      return {
        rank: 'Nhóm Tài năng vượt trội 🚀',
        scholarship: 'Học bổng 10% khóa học',
        status: 'Khuyến khích đăng ký Combo Pro',
        teacherText:
          'Quá xuất sắc! 15 sợi trong 5 phút là mốc của học viên đã học được 1 tuần đó em. Tay cực kỳ vững, mắt nhìn chiều sâu tốt.',
        salesText:
          'Với kết quả test xuất sắc này, Wings duyệt tặng Nhi voucher giảm trực tiếp 10% học phí khi đăng ký Combo Pro 4 khóa để đi nước ngoài hành nghề.',
        activeNode: 'direct',
      };
    }
    return {
      rank: 'Thiên thần bóng tối (Dark Angel) 👼',
      scholarship: 'Học bổng 20% + Cam kết việc làm',
      status: 'Mời hợp tác làm thợ chuỗi Wings',
      teacherText:
        'Nối trên 20 sợi! Em có năng khiếu thiên bẩm rồi, đặt mi 1D cực kỳ nhanh và thẳng hàng. Quá tuyệt vời!',
      salesText:
        'Chúc mừng em đạt mốc Dark Angel! Wings trân trọng mời em tham gia khóa Pro Masterclass với học bổng 20% và cam kết tiếp nhận làm thợ chính thức tại Salon.',
      activeNode: 'staff',
    };
  };

  const sim = getSimResults(strands);

  const learningsColumns = [
    { title: 'Ngày', dataIndex: 'date', key: 'date', width: 110 },
    { title: 'Insights / Bài học đúc kết', dataIndex: 'insight', key: 'insight' },
    { title: 'Hành động thực tế', dataIndex: 'action', key: 'action' },
    { title: 'Bởi', dataIndex: 'author', key: 'author', render: (text: string) => <Tag color="purple">{text}</Tag> },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-heading">Bản đồ Tối ưu hóa & Sơ đồ Sales</h1>
        <p className="text-xs text-secondary">
          Chiến lược Marketing & Sales tối ưu hóa chi phí & tỷ lệ chốt đơn cho cả 2 luồng kinh doanh Wings
        </p>
      </div>

      {/* Streams Comparison */}
      <Row gutter={[20, 20]}>
        {/* Academy Stream */}
        <Col xs={24} lg={12}>
          <Card
            title={<span className="font-bold text-base text-[#8b5cf6]">🎓 Luồng Đào Tạo: Wings Academy</span>}
            className="shadow-sm border border-purple-100"
          >
            <div className="flex flex-col gap-4">
              <div className="bg-purple-500/5 p-3 rounded-lg border border-purple-500/10">
                <span className="font-bold text-xs text-[#8b5cf6] block mb-1">📢 MARKETING STRATEGY</span>
                <ul className="text-xs text-secondary list-disc pl-4 flex flex-col gap-2 m-0">
                  <li>
                    <strong>Target:</strong> Bán kính 5-10km xung quanh Quận 1 (Học viên ngại đi học quá xa).
                  </li>
                  <li>
                    <strong>Định dạng:</strong> Sử dụng 100% video Reels & TikTok giới thiệu lớp học thực tế.
                  </li>
                  <li>
                    <strong>Chi phí:</strong> CPA tin nhắn lý tưởng ~13k VNĐ (rẻ hơn 50% so với ảnh tĩnh).
                  </li>
                </ul>
              </div>

              <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                <span className="font-bold text-xs text-emerald-500 block mb-1">💰 SALES FUNNEL</span>
                <ul className="text-xs text-secondary list-disc pl-4 flex flex-col gap-2 m-0">
                  <li>
                    <strong>Tâm lý:</strong> Thay thế từ "Test tay nghề" thành "Trải nghiệm học thử cầm nhíp miễn phí".
                  </li>
                  <li>
                    <strong>Risk-Reversal:</strong> Đưa chính sách "Bảo hành kiểu Úc" học thử 2 buổi hoàn tiền 100% để
                    chốt sales.
                  </li>
                  <li>
                    <strong>Upsell:</strong> Giới thiệu app MasterOS tích lũy điểm đổi cốp Vip đầy đủ cốp đồ.
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </Col>

        {/* Lashes Stream */}
        <Col xs={24} lg={12}>
          <Card
            title={<span className="font-bold text-base text-[#ec4899]">👁️ Luồng Dịch Vụ: Wings Lashes</span>}
            className="shadow-sm border border-pink-100"
          >
            <div className="flex flex-col gap-4">
              <div className="bg-pink-500/5 p-3 rounded-lg border border-pink-500/10">
                <span className="font-bold text-xs text-[#ec4899] block mb-1">📢 MARKETING STRATEGY</span>
                <ul className="text-xs text-secondary list-disc pl-4 flex flex-col gap-2 m-0">
                  <li>
                    <strong>Target:</strong> Bán kính 3-5km xung quanh cơ sở (Khách làm dịch vụ định kỳ).
                  </li>
                  <li>
                    <strong>Định vị:</strong> Phân khúc Cao cấp (Luxury/Premium). Không cạnh tranh giá rẻ.
                  </li>
                  <li>
                    <strong>USP:</strong> Kỹ thuật nối mi bóng tối độc quyền, keo an toàn không cay, phom cá nhân hóa.
                  </li>
                </ul>
              </div>

              <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                <span className="font-bold text-xs text-emerald-500 block mb-1">💰 SALES FUNNEL</span>
                <ul className="text-xs text-secondary list-disc pl-4 flex flex-col gap-2 m-0">
                  <li>
                    <strong>USP chính:</strong> Tư vấn nhấn mạnh 5 giá trị gia tăng cốt lõi.
                  </li>
                  <li>
                    <strong>Upsell:</strong> Menu mặc định chưa có mi dưới. Chủ động upsell mi dưới để mắt tròn và hoàn
                    chỉnh hơn.
                  </li>
                  <li>
                    <strong>Sức mua:</strong> Khai thác tối đa hạn mức chi tiêu trung bình ~2.5M của khách hàng cao cấp.
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Case Study */}
      <Card
        title={<span className="font-bold text-sm text-heading">🚨 Case Study: Tránh từ khóa gây phòng thủ</span>}
        className="shadow-sm border border-default"
      >
        <Row gutter={20}>
          <Col xs={24} md={12}>
            <div className="p-4 rounded-lg bg-red-500/5 border border-red-200">
              <span className="text-red-500 font-bold block mb-2">❌ TRƯỚC (Gây phòng thủ - Mất Lead)</span>
              <p className="text-xs text-secondary italic">
                "Bên em cần <strong>test cơ địa</strong>, xem có phù hợp không, nếu không phù hợp{' '}
                <strong>xin không tiếp nhận đào tạo</strong>..."
              </p>
              <div className="text-[10px] text-red-500 mt-2">Phản ứng: Học viên cảm thấy bị phán xét và phật lòng.</div>
            </div>
          </Col>
          <Col xs={24} md={12} className="mt-3 md:mt-0">
            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-200">
              <span className="text-emerald-500 font-bold block mb-2">✅ SAU (Trao giá trị - Tăng Tỷ Lệ Hẹn)</span>
              <p className="text-xs text-secondary italic">
                "Bên em <strong>tặng chị 1 buổi Trải nghiệm cầm nhíp & Định hướng nghề nghiệp 1-1 miễn phí</strong>. Chị
                sẽ được trực tiếp thử cầm nhíp xem có thấy thích và hợp không nhen chị!"
              </p>
              <div className="text-[10px] text-emerald-500 mt-2">
                Phản ứng: Cảm thấy được chào đón, tò mò muốn thử sức.
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Interactive Sales Funnel Simulator */}
      <Card
        title={<span className="font-bold text-sm text-heading">🔄 Giả lập nhánh rẽ Tư vấn Học viên</span>}
        className="shadow-sm border border-default"
      >
        <Row gutter={20}>
          {/* Slider and Metrics */}
          <Col xs={24} md={10}>
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-xs text-secondary font-medium">Số sợi đặt được trong 5 phút (Dummy)</span>
                <Slider
                  min={0}
                  max={45}
                  value={strands}
                  onChange={setStrands}
                  tooltip={{ formatter: (v) => `${v} sợi` }}
                />
              </div>

              <div className="p-3 bg-hover rounded-lg border border-default text-xs flex flex-col gap-2">
                <div>
                  🎯 <strong>Xếp hạng tay nghề:</strong> {sim.rank}
                </div>
                <div>
                  🎁 <strong>Chính sách ưu đãi:</strong> <Tag color="green">{sim.scholarship}</Tag>
                </div>
                <div>
                  📍 <strong>Nhánh tư vấn đề xuất:</strong> <strong>{sim.status}</strong>
                </div>
              </div>

              {/* Dialogues */}
              <div className="flex flex-col gap-3">
                <div className="bg-blue-500/5 p-3 rounded-lg border border-blue-200 text-xs">
                  <span className="font-bold text-[#3b82f6] block mb-1">👩‍🏫 GIẢNG VIÊN (TẠI LỚP)</span>
                  <p className="m-0 italic">"{sim.teacherText}"</p>
                </div>
                <div className="bg-amber-500/5 p-3 rounded-lg border border-amber-200 text-xs">
                  <span className="font-bold text-amber-500 block mb-1">👩‍💼 TƯ VẤN VIÊN (CHỐT SALES)</span>
                  <p className="m-0 italic">"{sim.salesText}"</p>
                </div>
              </div>
            </div>
          </Col>

          {/* Sơ đồ funnel */}
          <Col xs={24} md={14} className="mt-4 md:mt-0">
            <div className="p-4 bg-hover rounded-xl border border-default h-full">
              <span className="text-xs font-bold text-secondary uppercase block mb-4">Sơ đồ đường dẫn chốt Sales</span>
              <Timeline
                items={[
                  {
                    color: 'green',
                    children: (
                      <div>
                        <strong className="text-xs text-heading block">Bước 1: Trải nghiệm cầm nhíp</strong>
                        <span className="text-[10px] text-secondary">Học thử Dummy 30-45p + Làm bài test 5 phút</span>
                      </div>
                    ),
                  },
                  {
                    color: 'blue',
                    children: (
                      <div>
                        <strong className="text-xs text-heading block">Bước 2: Đánh giá {strands} sợi</strong>
                        <span className="text-[10px] text-secondary">Tuyên dương năng khiếu học viên</span>
                      </div>
                    ),
                  },
                  {
                    color: sim.activeNode === 'nudge' ? 'red' : 'gray',
                    children: (
                      <div className={sim.activeNode === 'nudge' ? 'font-bold text-red-500' : 'text-gray-400'}>
                        <strong className="text-xs block">Bước 3A: Luyện thêm dummy (Nếu &lt; 5 sợi)</strong>
                        <span className="text-[10px] block">Khích lệ vượt mốc run tay</span>
                      </div>
                    ),
                  },
                  {
                    color: sim.activeNode === 'direct' ? 'orange' : 'gray',
                    children: (
                      <div className={sim.activeNode === 'direct' ? 'font-bold text-orange-500' : 'text-gray-400'}>
                        <strong className="text-xs block">Bước 3B: Định vị khóa học & Học bổng</strong>
                        <span className="text-[10px] block">
                          Basic (1.9M) hoặc Combo Pro (9.9M) giảm {strands >= 10 ? '10%' : 'tặng cốp'}
                        </span>
                      </div>
                    ),
                  },
                  {
                    color: sim.activeNode === 'staff' ? 'purple' : 'gray',
                    children: (
                      <div className={sim.activeNode === 'staff' ? 'font-bold text-purple-500' : 'text-gray-400'}>
                        <strong className="text-xs block">Bước 3C: Chiêu mộ nhân sự (Nếu &gt;= 20 sợi)</strong>
                        <span className="text-[10px] block">Chốt combo Pro và làm nhân viên chuỗi Wings</span>
                      </div>
                    ),
                  },
                  {
                    color: 'green',
                    children: (
                      <div>
                        <strong className="text-xs text-heading block">Bước 4: Chốt cọc giữ chỗ (1.000.000 ₫)</strong>
                        <span className="text-[10px] text-secondary">
                          Áp dụng chính sách "Bảo hành kiểu Úc" học thử hoàn phí 100%
                        </span>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* Learnings Log */}
      <Card
        title={<span className="font-bold text-sm text-heading">Nhật ký bài học / Insights đúc kết</span>}
        className="shadow-sm border border-default"
        styles={{ body: { padding: 0 } }}
      >
        <Table dataSource={LEARNINGS_DATA} columns={learningsColumns} pagination={false} size="small" />
      </Card>
    </div>
  );
}
