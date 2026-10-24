'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { DrawerProps } from 'antd';
import {
  Space,
  Button,
  Select,
  Input,
  Tag,
  Switch,
  Modal,
  Form,
  message,
  Popconfirm,
  Badge,
  Spin,
  Empty,
  Tooltip,
} from 'antd';
import {
  Volume2,
  VolumeX,
  Plus,
  RotateCcw,
  Sparkles,
  Search,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  Play,
  Square,
  HelpCircle,
} from 'lucide-react';
import {
  TelesaleTvQuoteItem,
  TelesaleTvQuoteEventType,
  TelesaleTvPersonaKey,
  TelesaleTvPersonaDto,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { resolveApiBaseUrl } from '../../../../lib/api-base-url';
import { AdaptiveDrawer } from '../../../../components/ui';
import { useTheme } from '../../../../context/ThemeContext';

export interface TelesaleTvQuotesDrawerProps {
  open: boolean;
  onClose: () => void;
  zIndex?: number;
  getContainer?: string | HTMLElement | (() => HTMLElement) | false;
}

const EVENT_TYPE_CONFIG: Record<
  TelesaleTvQuoteEventType,
  { label: string; color: string; bgLight: string; bgDark: string; borderLight: string; borderDark: string }
> = {
  BOOK: {
    label: 'Book Mới',
    color: 'blue',
    bgLight: 'bg-blue-50',
    bgDark: 'bg-blue-950/40',
    borderLight: 'border-blue-200',
    borderDark: 'border-blue-800',
  },
  CHECKIN: {
    label: 'Check-in Salon',
    color: 'emerald',
    bgLight: 'bg-emerald-50',
    bgDark: 'bg-emerald-950/40',
    borderLight: 'border-emerald-200',
    borderDark: 'border-emerald-800',
  },
  COMBO: {
    label: 'Chốt Combo',
    color: 'purple',
    bgLight: 'bg-purple-50',
    bgDark: 'bg-purple-950/40',
    borderLight: 'border-purple-200',
    borderDark: 'border-purple-800',
  },
  TIP: {
    label: 'Khách Có Tip',
    color: 'amber',
    bgLight: 'bg-amber-50',
    bgDark: 'bg-amber-950/40',
    borderLight: 'border-amber-200',
    borderDark: 'border-amber-800',
  },
  DONE: {
    label: 'Hoàn Tất Done',
    color: 'cyan',
    bgLight: 'bg-cyan-50',
    bgDark: 'bg-cyan-950/40',
    borderLight: 'border-cyan-200',
    borderDark: 'border-cyan-800',
  },
  STREAK: {
    label: 'Chuỗi Nổ Đơn',
    color: 'orange',
    bgLight: 'bg-orange-50',
    bgDark: 'bg-orange-950/40',
    borderLight: 'border-orange-200',
    borderDark: 'border-orange-800',
  },
  MORNING: {
    label: 'Mở Bát Sáng',
    color: 'rose',
    bgLight: 'bg-rose-50',
    bgDark: 'bg-rose-950/40',
    borderLight: 'border-rose-200',
    borderDark: 'border-rose-800',
  },
};

const PERSONA_OPTIONS: Array<{
  key: TelesaleTvPersonaKey;
  label: string;
  icon: string;
  voice: string;
  rate: string;
  pitch: string;
}> = [
  {
    key: 'MC_HOI_CHO',
    label: 'MC Hội Chợ / BLV',
    icon: '🎪',
    voice: 'vi-VN-NamMinhNeural',
    rate: '+15%',
    pitch: '+6Hz',
  },
  { key: 'DRAMA_QUEEN', label: 'Cụ Tổ Drama', icon: '🎭', voice: 'vi-VN-HoaiMyNeural', rate: '+6%', pitch: '+14Hz' },
  { key: 'THAY_BOI', label: 'Thầy Bói Phán Số', icon: '🔮', voice: 'vi-VN-NamMinhNeural', rate: '-8%', pitch: '-8Hz' },
  { key: 'GEN_Z', label: 'Gen Z Chúa Tể Meme', icon: '📱', voice: 'vi-VN-HoaiMyNeural', rate: '+10%', pitch: '+4Hz' },
  { key: 'TONG_TAI', label: 'Tổng Tài Sến Sẩm', icon: '🕶️', voice: 'vi-VN-NamMinhNeural', rate: '+0%', pitch: '-4Hz' },
];

const VARIABLE_TAGS = [
  { tag: '[Tên]', label: 'Tên nhân viên (VD: Thanh Vũ)', desc: 'Tên bạn telesales nổ đơn' },
  { tag: '[Gói Combo]', label: 'Gói combo (VD: Combo Siêu Sợi)', desc: 'Tên dịch vụ combo chốt được' },
  { tag: '[Giá Combo]', label: 'Giá combo (VD: trị giá 850.000đ)', desc: 'Giá trị tiền của gói combo' },
  { tag: '[Tiền Tip]', label: 'Tiền tip (VD: 50.000đ)', desc: 'Số tiền khách tip' },
  { tag: '[Chuyên Viên]', label: 'Tên Chuyên Viên (VD: Chuyên Viên Thúy Kiều)', desc: 'Chuyên Viên kỹ thuật' },
  { tag: '[Tên Khách]', label: 'Tên khách (VD: Chị Mai)', desc: 'Khách hàng liên quan' },
];

export const TelesaleTvQuotesDrawer: React.FC<TelesaleTvQuotesDrawerProps> = ({
  open,
  onClose,
  zIndex = 100010,
  getContainer,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quotes, setQuotes] = useState<TelesaleTvQuoteItem[]>([]);
  const [personas, setPersonas] = useState<TelesaleTvPersonaDto[]>([]);

  // Filters
  const [selectedPersona, setSelectedPersona] = useState<string>('ALL');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Audio Preview State
  const [playingQuoteId, setPlayingQuoteId] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);

  // Form Modal State (Add / Edit)
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<TelesaleTvQuoteItem | null>(null);
  const [form] = Form.useForm();
  const templateInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Load Quotes from Backend
  const loadQuotes = async () => {
    setLoading(true);
    try {
      const data = await apiClient.telesaleTarget.getCelebrationQuotes();
      setQuotes(data.quotes || []);
      setPersonas(data.personas || []);
    } catch (err: any) {
      message.error(err?.message || 'Không thể tải kho câu thoại cổ vũ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadQuotes();
    } else {
      stopAudio();
    }
    return () => {
      stopAudio();
    };
  }, [open]);

  // Stop currently playing preview audio
  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (currentBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(currentBlobUrlRef.current);
      } catch {}
      currentBlobUrlRef.current = null;
    }
    setPlayingQuoteId(null);
    setAudioLoading(false);
  };

  // Preview TTS Audio for a quote
  const handlePlayPreview = async (quote: TelesaleTvQuoteItem) => {
    if (playingQuoteId === quote.id) {
      stopAudio();
      return;
    }

    stopAudio();
    setPlayingQuoteId(quote.id);
    setAudioLoading(true);

    try {
      // Find persona audio specs
      const p = PERSONA_OPTIONS.find((opt) => opt.key === quote.personaKey) || PERSONA_OPTIONS[0];

      // Render placeholders with realistic demo data
      const sampleText = quote.template
        .replace(/\[Tên\]/g, 'Thanh Vũ')
        .replace(/\[Gói Combo\]/g, 'Combo Nâng Mi Siêu Sợi')
        .replace(/\[Giá Combo\]/g, 'trị giá 850.000 đồng')
        .replace(/\[Tiền Tip\]/g, '50.000 đồng')
        .replace(/\[Chuyên Viên\]/g, 'Chuyên Viên Thúy Kiều')
        .replace(/\[Tên Khách\]/g, 'Chị Ngọc');

      const params = new URLSearchParams({
        text: sampleText,
        voice: p.voice,
        rate: p.rate,
        pitch: p.pitch,
      });

      const baseUrl = resolveApiBaseUrl();
      const audioUrl = `${baseUrl}/kpi/telesale-target/live-celebration-audio?${params.toString()}`;

      // Fetch via CORS as blob to avoid Chrome ORB (Opaque Response Blocking)
      const res = await fetch(audioUrl, {
        mode: 'cors',
        signal: AbortSignal.timeout(25000),
      });

      if (!res.ok) {
        throw new Error(`Audio fetch failed: ${res.status}`);
      }

      const audioBlob = await res.blob();
      const blobUrl = URL.createObjectURL(audioBlob);
      currentBlobUrlRef.current = blobUrl;

      const audio = new Audio(blobUrl);
      currentAudioRef.current = audio;

      audio.oncanplaythrough = () => {
        setAudioLoading(false);
      };

      audio.onended = () => {
        stopAudio();
      };

      audio.onerror = () => {
        message.warning('Không thể phát âm thanh nghe thử (mạng hoặc hệ thống TTS bận)');
        stopAudio();
      };

      await audio.play();
      setAudioLoading(false);
    } catch (e: any) {
      message.warning('Không thể phát âm thanh nghe thử (mạng hoặc hệ thống TTS bận)');
      stopAudio();
    }
  };

  // Toggle Active State
  const handleToggleActive = async (id: string, nextActive: boolean) => {
    const updated = quotes.map((q) =>
      q.id === id ? { ...q, isActive: nextActive, updatedAt: new Date().toISOString() } : q
    );
    setQuotes(updated);

    try {
      await apiClient.telesaleTarget.saveCelebrationQuotes(updated);
      message.success(nextActive ? 'Đã bật câu thoại' : 'Đã tắt câu thoại');
    } catch (err: any) {
      message.error('Không thể lưu trạng thái câu thoại');
      loadQuotes();
    }
  };

  // Delete Quote
  const handleDeleteQuote = async (id: string) => {
    const updated = quotes.filter((q) => q.id !== id);
    setQuotes(updated);

    try {
      await apiClient.telesaleTarget.saveCelebrationQuotes(updated);
      message.success('Đã xóa câu thoại');
    } catch (err: any) {
      message.error('Không thể xóa câu thoại');
      loadQuotes();
    }
  };

  // Reset to default library
  const handleResetToDefaults = async () => {
    setSaving(true);
    try {
      const resetConfig = await apiClient.telesaleTarget.resetCelebrationQuotes(
        selectedPersona !== 'ALL' ? selectedPersona : undefined
      );
      setQuotes(resetConfig.quotes || []);
      message.success(
        selectedPersona !== 'ALL'
          ? `Đã khôi phục câu mẫu gốc cho nhân cách ${selectedPersona}`
          : 'Đã khôi phục toàn bộ kho câu thoại mẫu gốc'
      );
    } catch (err: any) {
      message.error('Không thể khôi phục câu thoại mặc định');
    } finally {
      setSaving(false);
    }
  };

  // Open Create / Edit Form
  const handleOpenForm = (quote?: TelesaleTvQuoteItem) => {
    if (quote) {
      setEditingQuote(quote);
      form.setFieldsValue({
        personaKey: quote.personaKey,
        eventType: quote.eventType,
        template: quote.template,
        isActive: quote.isActive,
      });
    } else {
      setEditingQuote(null);
      form.setFieldsValue({
        personaKey: selectedPersona !== 'ALL' ? selectedPersona : 'MC_HOI_CHO',
        eventType: selectedEventType !== 'ALL' ? selectedEventType : 'BOOK',
        template: '',
        isActive: true,
      });
    }
    setFormModalOpen(true);
  };

  // Insert variable into template textarea
  const handleInsertVariable = (tag: string) => {
    const currentVal = form.getFieldValue('template') || '';
    form.setFieldsValue({
      template: currentVal ? `${currentVal} ${tag}` : tag,
    });
  };

  // Submit Form
  const handleSaveForm = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const now = new Date().toISOString();
      let updated: TelesaleTvQuoteItem[];

      if (editingQuote) {
        updated = quotes.map((q) =>
          q.id === editingQuote.id
            ? {
                ...q,
                personaKey: values.personaKey,
                eventType: values.eventType,
                template: values.template.trim(),
                isActive: values.isActive,
                isCustom: true,
                updatedAt: now,
              }
            : q
        );
      } else {
        const newQuote: TelesaleTvQuoteItem = {
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          personaKey: values.personaKey,
          eventType: values.eventType,
          template: values.template.trim(),
          isActive: values.isActive,
          isCustom: true,
          createdAt: now,
          updatedAt: now,
        };
        updated = [newQuote, ...quotes];
      }

      await apiClient.telesaleTarget.saveCelebrationQuotes(updated);
      setQuotes(updated);
      message.success(editingQuote ? 'Đã cập nhật câu thoại' : 'Đã thêm câu thoại mới thành công');
      setFormModalOpen(false);
    } catch (err: any) {
      if (err?.errorFields) return; // Validation error
      message.error(err?.message || 'Không thể lưu câu thoại');
    } finally {
      setSaving(false);
    }
  };

  // Filtered quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (selectedPersona !== 'ALL' && q.personaKey !== selectedPersona) return false;
      if (selectedEventType !== 'ALL' && q.eventType !== selectedEventType) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return q.template.toLowerCase().includes(query);
      }
      return true;
    });
  }, [quotes, selectedPersona, selectedEventType, searchQuery]);

  // Statistics
  const activeCount = useMemo(() => quotes.filter((q) => q.isActive).length, [quotes]);
  const customCount = useMemo(() => quotes.filter((q) => q.isCustom).length, [quotes]);

  return (
    <>
      <AdaptiveDrawer
        open={open}
        onClose={onClose}
        width={780}
        zIndex={zIndex}
        getContainer={getContainer}
        closable={{ placement: 'end' }}
        title={
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 text-lg">📣</span>
            <div>
              <div className="text-base font-bold flex items-center gap-2">
                <span>Quản Lý Thông Điệp Cổ Vũ TV</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-semibold">
                  {quotes.length} câu
                </span>
              </div>
              <p className="text-xs font-normal text-zinc-400 dark:text-zinc-500 m-0">
                Tùy chỉnh kho câu chúc, gáy vang và phát loa tự động theo 5 nhân cách MC
              </p>
            </div>
          </div>
        }
        className={isDark ? 'dark-theme' : 'light-theme'}
      >
        <div className="flex flex-col gap-4">
          {/* Top Bar: Stats & Global Actions */}
          <div
            className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className={isDark ? 'text-zinc-300' : 'text-slate-700'}>
                  Đang bật: <strong>{activeCount}</strong>/{quotes.length}
                </span>
              </div>
              {customCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className={isDark ? 'text-zinc-300' : 'text-slate-700'}>
                    Tự tạo: <strong>{customCount}</strong> câu
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Popconfirm
                title="Khôi phục câu mẫu gốc?"
                description={
                  selectedPersona !== 'ALL'
                    ? `Bạn có chắc muốn đặt lại kho câu gốc cho nhân cách ${selectedPersona}?`
                    : 'Đặt lại toàn bộ kho câu thoại mặc định?'
                }
                onConfirm={handleResetToDefaults}
                okText="Khôi phục"
                cancelText="Hủy"
                overlayStyle={{ zIndex: zIndex + 20 }}
              >
                <Button size="small" icon={<RotateCcw className="w-3.5 h-3.5" />} loading={saving} className="text-xs">
                  Khôi phục gốc
                </Button>
              </Popconfirm>

              <Button
                type="primary"
                size="small"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => handleOpenForm()}
                className="text-xs bg-emerald-600 hover:bg-emerald-500"
              >
                Thêm câu mới
              </Button>
            </div>
          </div>

          {/* Persona Tabs (5 Personas + All) */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedPersona('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                selectedPersona === 'ALL'
                  ? 'bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                  : isDark
                    ? 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              🎲 Tất cả ({quotes.length})
            </button>
            {PERSONA_OPTIONS.map((p) => {
              const count = quotes.filter((q) => q.personaKey === p.key).length;
              const isSelected = selectedPersona === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setSelectedPersona(p.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-black font-semibold shadow-sm'
                      : isDark
                        ? 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                  <span className={`text-[10px] px-1 rounded ${isSelected ? 'bg-black/20 text-black' : 'opacity-60'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filters & Search Row */}
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedEventType}
              onChange={setSelectedEventType}
              className="w-44 text-xs"
              options={[
                { label: '🎯 Tất cả sự kiện', value: 'ALL' },
                { label: '📘 Book Mới', value: 'BOOK' },
                { label: '🚪 Check-in Salon', value: 'CHECKIN' },
                { label: '👑 Chốt Combo', value: 'COMBO' },
                { label: '💰 Khách Có Tip', value: 'TIP' },
                { label: '✅ Hoàn Tất Done', value: 'DONE' },
                { label: '🔥 Chuỗi Nổ Đơn', value: 'STREAK' },
                { label: '🌅 Mở Bát Sáng', value: 'MORNING' },
              ]}
            />

            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Tìm kiếm nội dung câu nói..."
                prefix={<Search className="w-3.5 h-3.5 text-zinc-400" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                className="text-xs"
              />
            </div>

            <div className="text-xs text-zinc-400">
              Hiển thị: <strong>{filteredQuotes.length}</strong> câu
            </div>
          </div>

          {/* Quotes List Cards */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-xs text-zinc-400">Đang tải kho câu thoại cổ vũ...</span>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="py-16 text-center">
              <Empty description="Không tìm thấy câu thoại nào phù hợp bộ lọc" />
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {filteredQuotes.map((quote) => {
                const persona = PERSONA_OPTIONS.find((p) => p.key === quote.personaKey) || PERSONA_OPTIONS[0];
                const eventConfig = EVENT_TYPE_CONFIG[quote.eventType] || EVENT_TYPE_CONFIG.BOOK;
                const isPlaying = playingQuoteId === quote.id;

                return (
                  <div
                    key={quote.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      quote.isActive
                        ? isDark
                          ? 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                        : isDark
                          ? 'bg-zinc-950/60 border-zinc-900 opacity-60'
                          : 'bg-slate-50 border-slate-100 opacity-60'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Tag className="m-0 text-xs px-2 py-0.5 rounded-full border-0 font-medium bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                          {persona.icon} {persona.label}
                        </Tag>

                        <Tag
                          className={`m-0 text-xs px-2 py-0.5 rounded-full border ${
                            isDark
                              ? `${eventConfig.bgDark} ${eventConfig.borderDark} text-zinc-200`
                              : `${eventConfig.bgLight} ${eventConfig.borderLight} text-slate-800`
                          }`}
                        >
                          {eventConfig.label}
                        </Tag>

                        {quote.isCustom && (
                          <Tag color="purple" className="m-0 text-[10px] px-1.5 py-0 rounded font-semibold">
                            Tùy chỉnh
                          </Tag>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Tooltip title={quote.isActive ? 'Đang kích hoạt phát loa' : 'Đang tạm tắt'}>
                          <Switch
                            size="small"
                            checked={quote.isActive}
                            onChange={(checked) => handleToggleActive(quote.id, checked)}
                            className={quote.isActive ? 'bg-emerald-500' : undefined}
                          />
                        </Tooltip>
                      </div>
                    </div>

                    {/* Template Text with Highlighted Variables */}
                    <p className="text-xs leading-relaxed font-normal mb-3 text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap">
                      {renderHighlightedTemplate(quote.template, isDark)}
                    </p>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between border-t pt-2 border-dashed border-zinc-200 dark:border-zinc-800/80">
                      <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2">
                        <span>Giọng: {persona.voice.includes('NamMinh') ? 'Nam Minh' : 'Hoài My'}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="small"
                          type={isPlaying ? 'primary' : 'default'}
                          danger={isPlaying}
                          icon={
                            isPlaying ? (
                              <Square className="w-3 h-3 fill-current" />
                            ) : audioLoading && playingQuoteId === quote.id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                            ) : (
                              <Volume2 className="w-3 h-3 text-amber-500" />
                            )
                          }
                          onClick={() => handlePlayPreview(quote)}
                          className="text-xs"
                        >
                          {isPlaying ? 'Dừng' : 'Nghe thử'}
                        </Button>

                        <Button
                          size="small"
                          icon={<Edit2 className="w-3 h-3" />}
                          onClick={() => handleOpenForm(quote)}
                          className="text-xs"
                        >
                          Sửa
                        </Button>

                        <Popconfirm
                          title="Xóa câu thoại này?"
                          onConfirm={() => handleDeleteQuote(quote.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                          overlayStyle={{ zIndex: zIndex + 20 }}
                        >
                          <Button size="small" danger icon={<Trash2 className="w-3 h-3" />} className="text-xs" />
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AdaptiveDrawer>

      {/* Add / Edit Form Modal */}
      <Modal
        open={formModalOpen}
        onCancel={() => setFormModalOpen(false)}
        onOk={handleSaveForm}
        confirmLoading={saving}
        zIndex={zIndex + 10}
        getContainer={getContainer}
        title={
          <div className="flex items-center gap-2">
            <span className="text-amber-500 text-base">{editingQuote ? '✍️' : '✨'}</span>
            <span className="text-sm font-bold">
              {editingQuote ? 'Chỉnh Sửa Câu Thoại Cổ Vũ' : 'Thêm Câu Thoại Cổ Vũ Mới'}
            </span>
          </div>
        }
        okText="Lưu câu thoại"
        cancelText="Hủy"
        width={580}
        className={isDark ? 'dark-theme' : 'light-theme'}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="personaKey"
              label="Hình tượng MC (Persona)"
              rules={[{ required: true, message: 'Vui lòng chọn nhân cách' }]}
            >
              <Select
                options={PERSONA_OPTIONS.map((p) => ({
                  label: `${p.icon} ${p.label}`,
                  value: p.key,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="eventType"
              label="Loại sự kiện kích hoạt"
              rules={[{ required: true, message: 'Vui lòng chọn loại sự kiện' }]}
            >
              <Select
                options={[
                  { label: '📘 Book Mới', value: 'BOOK' },
                  { label: '🚪 Check-in Salon', value: 'CHECKIN' },
                  { label: '👑 Chốt Combo', value: 'COMBO' },
                  { label: '💰 Khách Có Tip', value: 'TIP' },
                  { label: '✅ Hoàn Tất Done', value: 'DONE' },
                  { label: '🔥 Chuỗi Nổ Đơn', value: 'STREAK' },
                  { label: '🌅 Mở Bát Sáng', value: 'MORNING' },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="template"
            label="Nội dung câu nói phát thanh"
            rules={[
              { required: true, message: 'Vui lòng nhập nội dung câu nói' },
              { min: 5, message: 'Câu nói cần tối thiểu 5 ký tự' },
            ]}
            extra="Nhập câu thoại hài hước, năng lượng và chèn các biến động bên dưới để hệ thống thay thế lúc phát loa"
          >
            <Input.TextArea
              ref={templateInputRef as any}
              rows={4}
              placeholder="VD: Vàooo! Không thể tin được, một pha chốt Book xé toang hàng phòng ngự từ [Tên]!"
              className="text-xs"
            />
          </Form.Item>

          {/* Quick Insert Variables Toolbar */}
          <div className="mb-4 p-2.5 rounded-lg border bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <div className="text-[11px] font-semibold text-zinc-500 mb-1.5 flex items-center gap-1">
              <span>Bấm để chèn biến thay thế động:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLE_TAGS.map((v) => (
                <Tooltip key={v.tag} title={v.desc}>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable(v.tag)}
                    className="text-[11px] px-2 py-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-all font-mono"
                  >
                    + {v.tag}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>

          <Form.Item name="isActive" valuePropName="checked" label="Trạng thái kích hoạt">
            <div className="flex items-center gap-2">
              <Switch defaultChecked />
              <span className="text-xs text-zinc-500">Sẵn sàng đưa vào vòng quay phát loa khi có sự kiện</span>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// Helper: Highlight dynamic tags in template text
function renderHighlightedTemplate(template: string, isDark: boolean): React.ReactNode {
  const parts = template.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          return (
            <span
              key={index}
              className={`font-semibold font-mono px-1 py-0.5 rounded text-[11px] mx-0.5 ${
                isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
