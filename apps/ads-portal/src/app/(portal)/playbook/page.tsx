'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Card, Button, Input, Modal, Select, Tag, Space, Spin, List, message, Form } from 'antd';
import {
  CopyOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  BookOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';

interface Playbook {
  id: string;
  title: string;
  category: string;
  description: string;
  content: string;
}

const DEFAULT_PLAYBOOKS: Playbook[] = [
  {
    id: 'pb-lashes-service',
    title: 'Tư vấn Dịch vụ Nối mi Cao cấp (Wings Lashes)',
    category: 'Wings Lashes',
    description:
      'Kịch bản tư vấn dịch vụ nối mi cao cấp cho khách lẻ, nhấn mạnh phom mi thiết kế riêng và keo độc quyền không cay mắt.',
    content: `💬 KỊCH BẢN CHI TIẾT:
1. Chào đón & khai thác phom dáng: "Dạ chào chị, chị đang muốn nối phom mi tự nhiên nhẹ nhàng đi làm hằng ngày, hay phom mi thiết kế dày, sắc nét tạo điểm nhấn cho mắt ạ?"
2. USPs dịch vụ Wings:
   - Thiết kế phom mi độc quyền cá nhân hóa (Baby Doll tròn mắt, Sexy Wings kéo dài đuôi mắt, Wispy bay bổng...) ôm trọn dáng mắt thật của chị.
   - Sử dụng dòng keo nối cao cấp độc quyền hạn chế tối đa cay mắt hay kích ứng vùng nhạy cảm, cực nhẹ mắt, không cộm ngứa.
   - Kỹ thuật đặt chân mi chuẩn khoảng cách, không gây rụng mi thật.
3. Chốt lịch: "Dạ hôm nay bên em đang trống chuyên viên thiết kế phom lúc 15h và 17h, em book lịch thiết kế phom dáng mắt riêng cho chị nha."`,
  },
  {
    id: 'pb-upsell-lower-lashes',
    title: 'Kịch bản Upsell Nối Mi Dưới (Combo Trọn Gói 2.5M)',
    category: 'Wings Lashes',
    description:
      'Kịch bản khơi gợi nhu cầu hoàn thiện phom mắt bằng dịch vụ mi dưới đi kèm dành cho khách phân khúc cao cấp.',
    content: `💬 KỊCH BẢN CHI TIẾT:
"Dạ chị ơi, khi thiết kế phom mi trên xong, để tổng thể dáng mắt của mình lung linh và cân đối nhất, em khuyên chân thành mình nên đi kèm dịch vụ thiết kế mi dưới đi cùng nha chị. Khách hàng cao cấp bên em đa số đều nối trọn bộ combo cả trên và dưới (khoảng 2.5M) để phom mắt có độ mở to tròn tự nhiên nhất. Nếu chỉ nối mi trên mà bỏ trống mi dưới thì mắt nhìn nghiêng sẽ hơi mất cân đối nhẹ đó ạ. Hôm nay em đang có ưu đãi thiết kế trọn gói combo cho mình luôn nha chị."`,
  },
  {
    id: 'pb-aftercare',
    title: 'Quy trình Chăm sóc Mi Nối tại nhà (Aftercare)',
    category: 'Wings Lashes',
    description: 'Hướng dẫn khách hàng giữ gìn mi nối bền đẹp, tránh tiếp xúc nước lúc đầu và chải mi đúng cách.',
    content: `💬 KỊCH BẢN CHI TIẾT:
- Tránh nước 4-6h đầu: "Dạ chị lưu ý giúp em trong 4-6 giờ đầu sau khi nối mình hạn chế để mi tiếp xúc trực tiếp với nước hoặc hơi nước nóng để keo khô hoàn toàn và đạt độ bền tối đa nha chị."
- Chải mi đúng cách: "Hằng ngày sau khi rửa mặt xong, chị dùng chổi chải mi chuyên dụng chải nhẹ nhàng từ giữa thân mi ra ngọn (tránh chải sát gốc keo) để mi luôn tơi đều và giữ đúng phom dáng thiết kế."
- Hạn chế mascara & tẩy trang dầu: "Mình tránh dùng mascara vuốt đè lên mi nối và không sử dụng các sản phẩm tẩy trang dạng dầu sát vùng mắt vì dầu sẽ làm phân hủy liên kết keo nối nhanh hơn ạ."`,
  },
  {
    id: 'pb-objection-price-service',
    title: 'Xử lý Từ chối - Khách chê Giá dịch vụ cao',
    category: 'Xử lý từ chối',
    description: 'Thuyết phục khách hàng bằng giá trị an toàn mi thật, phom thiết kế riêng và trải nghiệm Luxury.',
    content: `💬 KỊCH BẢN CHI TIẾT:
"Dạ em rất hiểu cảm giác của chị khi so sánh giá nối mi bên em với mặt bằng chung. Giá bên em cao hơn vì Wings không nối mi công nghiệp rập khuôn ạ. Mỗi bộ mi tại Wings đều là một tác phẩm được thiết kế riêng theo dáng mắt của chị, sử dụng keo nối cao cấp độc quyền hoàn toàn không cay mắt và bảo vệ 100% mi thật không bị rụng hay cộm ngứa. Nối mi giá rẻ rất dễ bị bết keo gây rụng mi thật và viêm bờ mi, sau đó đi chữa trị rất tốn kém ạ. Trải nghiệm dịch vụ cao cấp và sự an toàn cho đôi mắt của chị chính là giá trị lớn nhất mà Wings cam kết mang lại ạ."`,
  },
  {
    id: 'pb-objection-price-course',
    title: 'Xử lý Từ chối - Học viên chê Học phí cao',
    category: 'Xử lý từ chối',
    description: 'Giải thích giá trị của kỹ năng đặt mi 1D độc quyền, học nhanh kiếm tiền ngay từ khóa cơ bản.',
    content: `💬 KỊCH BẢN CHI TIẾT:
"Dạ em hiểu học phí là khoản đầu tư lớn ban đầu mình cần cân nhắc kỹ. Tuy nhiên, khóa học Basic của Wings đào tạo trực tiếp kỹ thuật đặt mi 1D chuẩn quốc tế, giúp học viên nối được ngay các dòng mi cao cấp như Classic 1D, mi Clover hay mi chập sợi ngay từ khi tốt nghiệp. Thu nhập thợ mi cứng từ 15-20 triệu/tháng chỉ sau 1-2 tháng ra nghề là hoàn toàn bình thường. Đầu tư một lần vững tay nghề cả đời, còn hơn học rẻ nhưng tay run, không dám nhận mẫu đó ạ."`,
  },
];

export default function PlaybookPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Modal Edit/Add
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [form] = Form.useForm();

  const loadPlaybooks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_configs')
        .select('*')
        .eq('key', 'wings_sales_playbooks')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data && Array.isArray(data.value)) {
        setPlaybooks(data.value);
      } else {
        // Fallback to static defaults
        setPlaybooks(DEFAULT_PLAYBOOKS);
      }
    } catch (err: any) {
      console.error(err);
      message.error('Lỗi khi tải playbooks: ' + err.message);
      setPlaybooks(DEFAULT_PLAYBOOKS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaybooks();
  }, []);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Đã copy kịch bản mẫu vào bộ nhớ tạm! ✓');
  };

  const handleSavePlaybook = async (values: any) => {
    try {
      let updatedList = [...playbooks];
      if (editingPlaybook) {
        // Edit path
        updatedList = playbooks.map((p) => (p.id === editingPlaybook.id ? { ...p, ...values } : p));
      } else {
        // Add new
        const newPlaybook: Playbook = {
          id: `pb-${Date.now()}`,
          ...values,
        };
        updatedList.unshift(newPlaybook);
      }

      const { error } = await supabase
        .from('system_configs')
        .upsert([{ key: 'wings_sales_playbooks', value: updatedList, updated_at: new Date().toISOString() }], {
          onConflict: 'key',
        });

      if (error) throw error;

      message.success('Đã lưu kịch bản playbook thành công!');
      setPlaybooks(updatedList);
      setModalVisible(false);
      form.resetFields();
      setEditingPlaybook(null);
    } catch (err: any) {
      message.error('Lỗi khi lưu kịch bản: ' + err.message);
    }
  };

  // Extract distinct categories
  const categories = ['All', ...Array.from(new Set(playbooks.map((p) => p.category)))];

  const getFilteredPlaybooks = () => {
    return playbooks.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchSearch =
        p.title.toLowerCase().includes(searchText.toLowerCase()) ||
        p.description.toLowerCase().includes(searchText.toLowerCase()) ||
        p.content.toLowerCase().includes(searchText.toLowerCase());
      return matchCat && matchSearch;
    });
  };

  const filtered = getFilteredPlaybooks();

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-default pb-3">
        <div>
          <h1 className="text-xl font-bold text-heading">Wings Sales Playbook</h1>
          <p className="text-xs text-secondary">
            Kịch bản mẫu chốt sales, xử lý từ chối và quy trình chăm sóc khách hàng chuẩn hóa
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ backgroundColor: '#b8941f', borderColor: '#b8941f' }}
          onClick={() => {
            setEditingPlaybook(null);
            form.resetFields();
            setModalVisible(true);
          }}
        >
          Tạo kịch bản mới
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Tìm kịch bản..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full sm:w-80"
          allowClear
        />
        <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
          {categories.map((cat) => (
            <Button
              key={cat}
              size="small"
              type={selectedCategory === cat ? 'primary' : 'default'}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <Card
              key={p.id}
              title={<span className="font-bold text-sm text-heading">{p.title}</span>}
              extra={<Tag color="gold">{p.category}</Tag>}
              className="shadow-sm border border-default"
              actions={[
                <Button key="copy" type="link" icon={<CopyOutlined />} onClick={() => handleCopyText(p.content)}>
                  Copy mẫu
                </Button>,
                <Button
                  key="edit"
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditingPlaybook(p);
                    form.setFieldsValue(p);
                    setModalVisible(true);
                  }}
                >
                  Sửa
                </Button>,
              ]}
            >
              <div className="text-xs text-secondary mb-3 italic">{p.description}</div>
              <div className="p-3 bg-hover rounded-lg border border-default whitespace-pre-line text-xs font-mono max-h-[250px] overflow-y-auto custom-scrollbar">
                {p.content}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        title={editingPlaybook ? 'Cập nhật kịch bản Playbook' : 'Tạo kịch bản Playbook mới'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        okText="Lưu lại"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleSavePlaybook}>
          <Form.Item name="title" label="Tiêu đề kịch bản" rules={[{ required: true, message: 'Nhập tiêu đề!' }]}>
            <Input placeholder="Ví dụ: Xử lý từ chối - Khách chê đắt" />
          </Form.Item>

          <Form.Item
            name="category"
            label="Phân loại / Danh mục"
            rules={[{ required: true, message: 'Chọn hoặc nhập danh mục!' }]}
          >
            <Select
              mode="tags"
              maxCount={1}
              placeholder="Chọn hoặc gõ danh mục mới"
              options={categories.filter((c) => c !== 'All').map((c) => ({ value: c, label: c }))}
            />
          </Form.Item>

          <Form.Item name="description" label="Mô tả ngắn gọn" rules={[{ required: true, message: 'Nhập mô tả!' }]}>
            <Input placeholder="Kịch bản dùng khi..." />
          </Form.Item>

          <Form.Item
            name="content"
            label="Nội dung kịch bản mẫu"
            rules={[{ required: true, message: 'Nhập nội dung kịch bản!' }]}
          >
            <Input.TextArea rows={8} placeholder="Nhập nội dung tư vấn chi tiết..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
