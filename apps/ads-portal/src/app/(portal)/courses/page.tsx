'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Card, Button, Input, Select, Collapse, Tag, Space, Spin, Row, Col, message, Form } from 'antd';
import {
  CopyOutlined,
  EditOutlined,
  SettingOutlined,
  BookOutlined,
  SafetyCertificateOutlined,
  GiftOutlined,
  ArrowRightOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

interface SyllabusSession {
  num: number;
  title: string;
  desc: string;
}

interface SyllabusCourse {
  title: string;
  tag: string;
  tagClass: string;
  sessions: SyllabusSession[];
}

const COURSES_SYLLABUS: Record<string, SyllabusCourse> = {
  basic: {
    title: 'SIGNATURE DARK LASH FOUNDATION (Nền Tảng Nối Mi Bóng Tối Độc Quyền)',
    tag: 'SIGNATURE FOUNDATION',
    tagClass: 'purple',
    sessions: [
      {
        num: 1,
        title: 'Kỹ thuật Giấy (Lý thuyết + Thực hành)',
        desc: 'Học lý thuyết về cấu trúc mi và luyện tập kỹ thuật cầm nhíp, đặt mi thẳng hàng, đúng góc trên giấy.',
      },
      {
        num: 2,
        title: 'Kỹ thuật Dummy (Lý thuyết + Thực hành)',
        desc: 'Luyện tập nối mi Classic trên ma-nơ-canh (dummy) để quen với cự ly mắt và định vị khoảng cách da mí.',
      },
      {
        num: 3,
        title: 'Thực hành trên Mẫu thật (Lý thuyết + Thực hành)',
        desc: 'Bắt đầu làm quen thực tế trên mẫu thật dưới sự kèm cặp 1-1 của giảng viên, học cách xử lý mi tự nhiên mọc lệch.',
      },
      {
        num: 4,
        title: 'Nối Mẫu nâng cao (Lý thuyết + Thực hành)',
        desc: 'Thực hành hoàn thiện bộ mi Classic hoàn chỉnh trên mẫu thật, đảm bảo độ bền mi từ 4-6 tuần.',
      },
      {
        num: 5,
        title: 'Thực hành Mẫu độc lập',
        desc: 'Tự tay hoàn thành toàn bộ quy trình nối mi Classic cho mẫu thật từ khâu vệ sinh mí đến nối và dưỡng mi.',
      },
      {
        num: 6,
        title: 'THI TỐT NGHIỆP BASIC (1D60)',
        desc: 'Thi thực hành nối mi Classic 1D trong vòng 60 phút, yêu cầu kiểm định chất lượng nghiêm ngặt với tỷ lệ lỗi sợi dưới 3%.',
      },
    ],
  },
  advanced: {
    title: 'DARK LASH ELITE ARTISTRY MASTERCLASS (Tinh Hoa Nối Mi Bóng Tối Nâng Cao)',
    tag: 'ELITE ARTISTRY',
    tagClass: 'cyan',
    sessions: [
      {
        num: 1,
        title: 'Kỹ thuật mi MINK (Lý thuyết + Thực hành)',
        desc: 'Tìm hiểu chất liệu mi Mink mềm mại, tự nhiên và kỹ thuật phối mi tạo độ đen dày tự nhiên.',
      },
      {
        num: 2,
        title: 'Thực hành nối mi Mink trên Mẫu',
        desc: 'Lên dáng mi Mink thực tế trên mắt mẫu thật, tinh chỉnh độ cong và chiều dài để tôn lên dáng mắt.',
      },
      {
        num: 3,
        title: 'Kỹ thuật mi GAP (Lý thuyết + Thực hành)',
        desc: 'Học công nghệ nối mi GAP độc quyền, giúp lấp đầy khoảng trống mi thưa rụng hiệu quả mà không nặng mắt.',
      },
      {
        num: 4,
        title: 'Thực hành nối mi GAP trên Mẫu',
        desc: 'Thực hành thiết kế và xử lý mắt thưa mi, mi lỗi hỏng bằng kỹ thuật nối mi GAP.',
      },
      {
        num: 5,
        title: 'Kỹ thuật MI CHẬP SỢI (Lý thuyết + Thực hành)',
        desc: 'Kỹ thuật mi chập sợi hiện đại tạo hiệu ứng sắc sảo giống như chải mascara, tạo điểm nhấn cuốn hút.',
      },
      {
        num: 6,
        title: 'Thực hành Mi chập sợi trên Mẫu',
        desc: 'Thực hành thi tốt nghiệp module Advanced với bộ mi chập sợi hoàn hảo trên mẫu thật.',
      },
    ],
  },
  fan: {
    title: 'INTERNATIONAL VOLUME & MEGA LASH MASTERCLASS (Nối Mi Volume & Mega Chuẩn Quốc Tế)',
    tag: 'GLOBAL VOLUME',
    tagClass: 'orange',
    sessions: [
      {
        num: 1,
        title: 'Kỹ thuật tạo Fan 2D (Lý thuyết + Luyện tập)',
        desc: 'Học lý thuyết về thông số mi Volume, kỹ thuật gắp và tạo chân fan 2 sợi xòe đều chân nhíp nhanh gọn.',
      },
      {
        num: 2,
        title: 'Thực hành nối mi Fan 2D trên Mẫu thật',
        desc: 'Trực tiếp lên mẫu thật dưới sự kèm cặp 1-1, học cách lấy keo vừa đủ, hạn chế bết dính và chân keo to.',
      },
      {
        num: 3,
        title: 'Kỹ thuật tạo Fan 3D (Lý thuyết + Luyện tập)',
        desc: 'Học cách cân đối khoảng cách chân fan 3 sợi để tạo hiệu ứng bông dày vừa phải trên giấy và dummy.',
      },
      {
        num: 4,
        title: 'Thực hành nối mi Fan 3D trên Mẫu thật',
        desc: 'Thực hành nối dáng mi Volume 3D tự nhiên trên mẫu thật, đảm bảo độ tơi và bền mi.',
      },
      {
        num: 5,
        title: 'Kỹ thuật tạo Fan 4D (Lý thuyết + Luyện tập)',
        desc: 'Kỹ thuật tạo fan 4 sợi chuẩn Tây. Luyện tập nhíp Volume chuyên dụng kiểm soát độ xòe cánh fan.',
      },
      {
        num: 6,
        title: 'Thực hành nối mi Fan 4D trên Mẫu thật',
        desc: 'Lên phom mi dày đậm nét hơn cho mẫu, thực hành chia khoảng cách mi đều để không bị trống lỗ mi.',
      },
      {
        num: 7,
        title: 'Kỹ thuật tạo Fan 5D (Lý thuyết + Luyện tập)',
        desc: 'Học cách tạo fan 5D tơi xốp, siêu nhẹ chân keo bằng phương pháp lắc fan trên tay hoặc nhấc fan đặt chân.',
      },
      {
        num: 8,
        title: 'Thực hành nối mi Fan 5D trên Mẫu thật',
        desc: 'Luyện tập nối mi Volume 5D dày quyến rũ trên mẫu thật, tối ưu tốc độ nối dưới 90 phút.',
      },
    ],
  },
  design: {
    title: 'DARK LASH DESIGN & STYLING MASTERCLASS (Thiết Kế & Tạo Dáng Mi Nghệ Thuật)',
    tag: 'CREATIVE DESIGN',
    tagClass: 'red',
    sessions: [
      {
        num: 1,
        title: 'Công nghệ Mi fan sẵn & Hyperlight (Lý thuyết)',
        desc: 'Tìm hiểu quy chuẩn các dáng mi thiết kế hot trend, cách phối mi fan sẵn kết hợp công nghệ Hyperlight siêu nhẹ.',
      },
      {
        num: 2,
        title: 'Thực hành dáng mi Baby Doll trên Mẫu thật',
        desc: 'Lên dáng Baby Doll ngây thơ to tròn cực hút. Kỹ thuật chia độ dài tạo hiệu ứng mắt búp bê.',
      },
      {
        num: 3,
        title: 'Thiết kế dáng mi Sexy Wings (Lý thuyết)',
        desc: 'Quy tắc chia dáng mắt mèo xếch quyến rũ thịnh hành dáng mi Tây. Cách chọn độ cong nâng dáng mắt sụp.',
      },
      {
        num: 4,
        title: 'Thực hành dáng mi Sexy Wings trên Mẫu thật',
        desc: 'Thực hành nối dáng mi Sexy Wings thực tế trên mẫu thật dưới sự kèm cặp sát sao của giảng viên.',
      },
    ],
  },
};

const DEFAULT_PRICES = {
  coursePrices: { combo: 34600000, basic: 5900000, advanced: 9900000, fan: 9900000, design: 9900000 },
  coursePromoPrices: { combo: 19900000, basic: 1900000, advanced: 7900000, fan: 7900000, design: 7900000 },
  courseKits: {
    combo: {
      name: 'MS92 Cốp Vip - Dụng Cụ Hành Nghề (Full Kit)',
      link: 'https://masteros.app/wa/my/shop/c36e9404-19d5-4864-92b1-caadbe28cd9f',
    },
    basic: {
      name: 'MS90 Cốp Basic - Người Mới Bắt Đầu (Foundation Kit)',
      link: 'https://masteros.app/wa/my/shop/2376ab5c-0e72-4646-b19c-d1076dc545c9',
    },
    advanced: { name: 'Cốp Elite nâng cao', link: '' },
    fan: { name: 'Cốp Volume & Mega', link: '' },
    design: { name: 'Cốp Design sáng tạo', link: '' },
  },
};

export default function CoursesPage() {
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState<'syllabus' | 'config'>('syllabus');

  const [form] = Form.useForm();

  const loadPricesConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_configs')
        .select('*')
        .eq('key', 'wings_course_prices')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data && data.value) {
        setPrices({
          coursePrices: data.value.coursePrices || DEFAULT_PRICES.coursePrices,
          coursePromoPrices: data.value.promoPrices || data.value.coursePromoPrices || DEFAULT_PRICES.coursePromoPrices,
          courseKits: data.value.courseKits || DEFAULT_PRICES.courseKits,
        });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPricesConfig();
  }, []);

  const handleSaveConfig = async (values: any) => {
    try {
      const payload = {
        coursePrices: {
          combo: Number(values.price_combo),
          basic: Number(values.price_basic),
          advanced: Number(values.price_advanced),
          fan: Number(values.price_fan),
          design: Number(values.price_design),
        },
        promoPrices: {
          combo: Number(values.promo_combo),
          basic: Number(values.promo_basic),
          advanced: Number(values.promo_advanced),
          fan: Number(values.promo_fan),
          design: Number(values.promo_design),
        },
        courseKits: {
          combo: { name: values.kit_name_combo, link: values.kit_link_combo },
          basic: { name: values.kit_name_basic, link: values.kit_link_basic },
          advanced: { name: values.kit_name_advanced, link: values.kit_link_advanced },
          fan: { name: values.kit_name_fan, link: values.kit_link_fan },
          design: { name: values.kit_name_design, link: values.kit_link_design },
        },
      };

      const { error } = await supabase
        .from('system_configs')
        .upsert([{ key: 'wings_course_prices', value: payload, updated_at: new Date().toISOString() }], {
          onConflict: 'key',
        });

      if (error) throw error;

      message.success('Đã lưu cấu hình học phí & cốp đồ nghề thành công!');
      setPrices({
        coursePrices: payload.coursePrices,
        coursePromoPrices: payload.promoPrices,
        courseKits: payload.courseKits,
      });
    } catch (err: any) {
      message.error('Lỗi khi lưu cấu hình: ' + err.message);
    }
  };

  const handleCopyPitch = (key: string, title: string) => {
    const originalPrice = prices.coursePrices[key as keyof typeof prices.coursePrices] || 0;
    const promoPrice = prices.coursePromoPrices[key as keyof typeof prices.coursePromoPrices] || 0;
    const kit = prices.courseKits[key as keyof typeof prices.courseKits] || { name: '', link: '' };

    const pitchText = `📚 THÔNG TIN KHÓA HỌC: ${title.toUpperCase()}
⏱️ Thời gian học: Kèm sát 1-1 trực tiếp đến khi vững tay nghề (không giới hạn buổi).
💰 Học phí gốc: ${new Intl.NumberFormat('vi-VN').format(originalPrice)} đ
🔥 Giá ưu đãi hôm nay: ${new Intl.NumberFormat('vi-VN').format(promoPrice)} đ
🎁 Tặng kèm cốp đồ: ${kit.name} ${kit.link ? `(Link tham khảo: ${kit.link})` : ''}
🛡️ CAM KẾT ĐẶC BIỆT (Bảo hành kiểu Úc): Học thử 2 buổi đầu trải nghiệm tại Quận 1, nếu cảm thấy phương pháp dạy không phù hợp Wings cam kết hoàn trả 100% học phí không lý do.

👉 Nhi có muốn đặt lịch trải nghiệm cầm nhíp thử miễn phí trước vào tuần này không nhen?`;

    navigator.clipboard.writeText(pitchText);
    message.success(`Đã copy kịch bản tư vấn khóa ${key.toUpperCase()}!`);
  };

  const renderSyllabusTab = () => (
    <div className="flex flex-col gap-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-purple-900/40 via-violet-900/30 to-slate-900 p-6 rounded-xl border border-purple-500/10">
        <div className="max-w-2xl">
          <Tag color="purple" className="mb-2">
            Wings Academy — Dark Lash Mastery
          </Tag>
          <h2 className="text-xl font-bold text-heading mb-2">Đào Tạo Nối Mi Bóng Tối Chuẩn Quốc Tế</h2>
          <p className="text-xs text-secondary leading-relaxed">
            Giáo trình độc quyền từ Wings, kèm 1-1 trực tiếp từ số 0. Áp dụng chính sách{' '}
            <strong>Bảo hành kiểu Úc</strong>: học thử 2 buổi đầu, hoàn phí 100% nếu không hài lòng.
          </p>
        </div>
      </div>

      {/* Course List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(COURSES_SYLLABUS).map(([key, c]) => {
          const originalPrice = prices.coursePrices[key as keyof typeof prices.coursePrices] || 0;
          const promoPrice = prices.coursePromoPrices[key as keyof typeof prices.coursePromoPrices] || 0;
          const kit = prices.courseKits[key as keyof typeof prices.courseKits] || { name: '', link: '' };

          return (
            <Card
              key={key}
              title={<span className="font-bold text-sm text-heading">{c.title}</span>}
              extra={<Tag color={c.tagClass}>{c.tag}</Tag>}
              className="shadow-sm border border-default"
              actions={[
                <Button key="copy" type="link" icon={<CopyOutlined />} onClick={() => handleCopyPitch(key, c.title)}>
                  Copy Pitch Tư Vấn
                </Button>,
              ]}
            >
              <div className="flex justify-between items-center bg-hover p-2.5 rounded-lg border border-default text-xs mb-4">
                <div>
                  <div className="text-secondary">
                    Học phí gốc:{' '}
                    <span className="line-through">{new Intl.NumberFormat('vi-VN').format(originalPrice)} ₫</span>
                  </div>
                  <div className="text-heading font-semibold mt-0.5">
                    Ưu đãi hôm nay:{' '}
                    <span className="text-[#b8941f] font-bold">
                      {new Intl.NumberFormat('vi-VN').format(promoPrice)} ₫
                    </span>
                  </div>
                </div>
                {kit.link && (
                  <a
                    href={kit.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 font-medium hover:underline"
                  >
                    🎁 Cốp đồ nghề
                  </a>
                )}
              </div>

              <Collapse
                size="small"
                ghost
                items={[
                  {
                    key: 'syllabus',
                    label: (
                      <span className="text-xs font-semibold text-heading">
                        📖 Lộ trình chi tiết ({c.sessions.length} bài học)
                      </span>
                    ),
                    children: (
                      <div className="flex flex-col gap-2.5 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                        {c.sessions.map((s) => (
                          <div key={s.num} className="text-xs border-b border-dashed border-default pb-2">
                            <strong className="text-heading block mb-0.5">
                              Bài {s.num}: {s.title}
                            </strong>
                            <span className="text-secondary">{s.desc}</span>
                          </div>
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header and Sync */}
      <div className="flex justify-between items-center border-b border-default pb-3">
        <div>
          <h1 className="text-xl font-bold text-heading">Wings Academy Syllabus</h1>
          <p className="text-xs text-secondary">
            Giáo trình đào tạo nối mi và thiết lập cấu hình giá học phí / cốp đồ nghề
          </p>
        </div>
        <div className="flex gap-1 bg-hover p-1 rounded-lg border border-default">
          <Button
            size="small"
            type={currentTab === 'syllabus' ? 'primary' : 'text'}
            onClick={() => setCurrentTab('syllabus')}
          >
            Giáo trình & Lộ trình
          </Button>
          <Button
            size="small"
            type={currentTab === 'config' ? 'primary' : 'text'}
            onClick={() => {
              setCurrentTab('config');
              form.setFieldsValue({
                price_combo: prices.coursePrices.combo,
                price_basic: prices.coursePrices.basic,
                price_advanced: prices.coursePrices.advanced,
                price_fan: prices.coursePrices.fan,
                price_design: prices.coursePrices.design,

                promo_combo: prices.coursePromoPrices.combo,
                promo_basic: prices.coursePromoPrices.basic,
                promo_advanced: prices.coursePromoPrices.advanced,
                promo_fan: prices.coursePromoPrices.fan,
                promo_design: prices.coursePromoPrices.design,

                kit_name_combo: prices.courseKits.combo?.name,
                kit_link_combo: prices.courseKits.combo?.link,
                kit_name_basic: prices.courseKits.basic?.name,
                kit_link_basic: prices.courseKits.basic?.link,
                kit_name_advanced: prices.courseKits.advanced?.name,
                kit_link_advanced: prices.courseKits.advanced?.link,
                kit_name_fan: prices.courseKits.fan?.name,
                kit_link_fan: prices.courseKits.fan?.link,
                kit_name_design: prices.courseKits.design?.name,
                kit_link_design: prices.courseKits.design?.link,
              });
            }}
          >
            Cấu hình Học phí & Cốp đồ
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      ) : currentTab === 'syllabus' ? (
        renderSyllabusTab()
      ) : (
        <Card
          title={
            <span className="font-bold text-sm text-heading">⚙️ Thiết lập giá học phí & Liên kết cốp đồ MasterOS</span>
          }
          className="shadow-sm border border-default"
        >
          <Form form={form} layout="vertical" onFinish={handleSaveConfig}>
            {/* Combo */}
            <div className="border-b border-default pb-4 mb-4">
              <h3 className="font-bold text-xs text-[#8b5cf6] uppercase mb-3">Combo 4 Khóa Pro</h3>
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name="price_combo" label="Học phí gốc (VND)">
                    <Input type="number" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="promo_combo" label="Học phí ưu đãi (VND)">
                    <Input type="number" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="kit_name_combo" label="Tên bộ cốp đồ">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="kit_link_combo" label="Link MasterOS Shop">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* Basic */}
            <div className="border-b border-default pb-4 mb-4">
              <h3 className="font-bold text-xs text-blue-500 uppercase mb-3">Signature Foundation</h3>
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name="price_basic" label="Học phí gốc (VND)">
                    <Input type="number" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="promo_basic" label="Học phí ưu đãi (VND)">
                    <Input type="number" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="kit_name_basic" label="Tên bộ cốp đồ">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="kit_link_basic" label="Link MasterOS Shop">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* Advanced */}
            <div className="border-b border-default pb-4 mb-4">
              <h3 className="font-bold text-xs text-cyan-500 uppercase mb-3">Elite Artistry</h3>
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name="price_advanced" label="Học phí gốc (VND)">
                    <Input type="number" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="promo_advanced" label="Học phí ưu đãi (VND)">
                    <Input type="number" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="kit_name_advanced" label="Tên bộ cốp đồ">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="kit_link_advanced" label="Link MasterOS Shop">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* Volume */}
            <div className="border-b border-default pb-4 mb-4">
              <h3 className="font-bold text-xs text-orange-500 uppercase mb-3">Global Volume</h3>
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name="price_fan" label="Học phí gốc (VND)">
                    <Input type="number" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="promo_fan" label="Học phí ưu đãi (VND)">
                    <Input type="number" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="kit_name_fan" label="Tên bộ cốp đồ">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="kit_link_fan" label="Link MasterOS Shop">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* Design */}
            <div className="pb-4 mb-4">
              <h3 className="font-bold text-xs text-red-500 uppercase mb-3">Creative Design</h3>
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name="price_design" label="Học phí gốc (VND)">
                    <Input type="number" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="promo_design" label="Học phí ưu đãi (VND)">
                    <Input type="number" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="kit_name_design" label="Tên bộ cốp đồ">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="kit_link_design" label="Link MasterOS Shop">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <Form.Item className="m-0 text-right">
              <Button type="primary" htmlType="submit" style={{ backgroundColor: '#b8941f', borderColor: '#b8941f' }}>
                Lưu toàn bộ Cấu hình
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}
    </div>
  );
}
