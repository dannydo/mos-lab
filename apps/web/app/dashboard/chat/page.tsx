'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button, Card, Typography, Space } from 'antd';
import { StatusTag } from '../../../components/ui/StatusTag';
import {
  MessageSquare,
  Users,
  Bot,
  CheckSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const { Title, Text, Paragraph } = Typography;

function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const convId =
    searchParams?.get('chatConvId') ||
    searchParams?.get('conversationId') ||
    searchParams?.get('convId') ||
    undefined;
  const msgId =
    searchParams?.get('chatMsgId') ||
    searchParams?.get('messageId') ||
    searchParams?.get('msgId') ||
    undefined;
  const tab = searchParams?.get('tab') as 'chat' | 'tasks' | 'pinned' | undefined;

  useEffect(() => {
    // Automatically trigger mOS Chat opening and navigation
    const openEvent = new CustomEvent('mos-chat:open', {
      detail: {
        conversationId: convId,
        messageId: msgId,
        openTab: tab,
      },
    });
    window.dispatchEvent(openEvent);
  }, [convId, msgId, tab]);

  const handleOpenGeneral = () => {
    window.dispatchEvent(
      new CustomEvent('mos-chat:open', {
        detail: { openTab: 'chat' },
      })
    );
  };

  const handleOpenTasks = () => {
    window.dispatchEvent(
      new CustomEvent('mos-chat:open', {
        detail: { openTab: 'tasks' },
      })
    );
  };

  const handleOpenAi = () => {
    window.dispatchEvent(
      new CustomEvent('mos-chat:open', {
        detail: { conversationId: 'ai-copilot', openTab: 'chat' },
      })
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Hero Welcome Card */}
      <div
        className={`p-6 md:p-8 rounded-2xl border transition-all ${
          isDark
            ? 'bg-gradient-to-br from-neutral-900 to-neutral-800 border-neutral-700 text-neutral-100'
            : 'bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 border-amber-200/60 text-neutral-900'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center p-2 rounded-xl bg-amber-500 text-white shadow-md">
                <MessageSquare size={24} />
              </span>
              <StatusTag
                status="gold"
                label="Trung tâm Trao đổi & Không gian Nhóm"
                className="font-semibold text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider"
              />
              <StatusTag
                status="cyan"
                label="Phím tắt: ⌘J / Ctrl+J"
                className="font-medium text-xs px-2 py-0.5 rounded-md"
              />
            </div>
            <Title level={2} className={`!m-0 ${isDark ? '!text-white' : '!text-neutral-900'}`}>
              mOS Google Chat & Spaces
            </Title>
            <Paragraph
              className={`text-sm md:text-base max-w-2xl !mb-0 ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}
            >
              Hệ thống trò chuyện thời gian thực nội bộ Wings Lashes: nhắn tin 1-1 riêng tư, thảo luận theo không gian
              phòng ban, giao và nhắc việc tức thì với chuông âm thanh Messenger và thông báo đa nền tảng.
            </Paragraph>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center shrink-0">
            <Button
              type="primary"
              size="large"
              icon={<Zap size={18} />}
              onClick={handleOpenGeneral}
              className="bg-amber-600 hover:bg-amber-500 font-semibold shadow-md flex items-center justify-center"
            >
              Mở mOS Chat ngay (⌘J)
            </Button>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card
          hoverable
          onClick={handleOpenGeneral}
          className={`rounded-xl border transition-all ${
            isDark ? 'bg-neutral-900 border-neutral-800 hover:border-amber-500/50' : 'bg-white border-neutral-200'
          }`}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users size={20} />
            </div>
            <Title level={4} className={`!m-0 ${isDark ? '!text-white' : '!text-neutral-800'}`}>
              Không gian & Tin nhắn 1-1
            </Title>
            <Text className={`text-xs block ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Trao đổi nhanh với đồng nghiệp theo ca làm hoặc tham gia các phòng ban Chuyên Viên, CSKH, Tư Vấn CC.
            </Text>
            <div className="pt-2 text-xs font-semibold text-blue-500 flex items-center gap-1">
              Vào trò chuyện <ArrowRight size={14} />
            </div>
          </div>
        </Card>

        <Card
          hoverable
          onClick={handleOpenTasks}
          className={`rounded-xl border transition-all ${
            isDark ? 'bg-neutral-900 border-neutral-800 hover:border-amber-500/50' : 'bg-white border-neutral-200'
          }`}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckSquare size={20} />
            </div>
            <Title level={4} className={`!m-0 ${isDark ? '!text-white' : '!text-neutral-800'}`}>
              Công việc & Nhắc việc
            </Title>
            <Text className={`text-xs block ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Quản lý danh sách nhiệm vụ được giao từ tin nhắn chat, hẹn giờ nhắc và theo dõi tiến độ hoàn tất.
            </Text>
            <div className="pt-2 text-xs font-semibold text-emerald-500 flex items-center gap-1">
              Xem danh sách task <ArrowRight size={14} />
            </div>
          </div>
        </Card>

        <Card
          hoverable
          onClick={handleOpenAi}
          className={`rounded-xl border transition-all ${
            isDark ? 'bg-neutral-900 border-neutral-800 hover:border-amber-500/50' : 'bg-white border-neutral-200'
          }`}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Bot size={20} />
            </div>
            <Title level={4} className={`!m-0 ${isDark ? '!text-white' : '!text-neutral-800'}`}>
              AI Copilot & Trợ lý
            </Title>
            <Text className={`text-xs block ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Tra cứu nhanh chính sách lương, công thức tính KPI, quy chuẩn dịch vụ Wings Lashes trực tiếp từ chat.
            </Text>
            <div className="pt-2 text-xs font-semibold text-amber-500 flex items-center gap-1">
              Hỏi AI Copilot <ArrowRight size={14} />
            </div>
          </div>
        </Card>
      </div>

      {/* Safety & Compliance Notice */}
      <div
        className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${
          isDark
            ? 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
            : 'bg-neutral-50 border-neutral-200 text-neutral-600'
        }`}
      >
        <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
        <span>
          <strong>Bảo mật thông tin nội bộ:</strong> Tất cả tin nhắn và hình ảnh được mã hóa và lưu trữ khép kín trên hạ
          tầng máy chủ Wings Lashes. Các tin nhắn riêng tư 1-1 chỉ hiển thị duy nhất cho 2 người tham gia.
        </span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-neutral-500">
          Đang tải không gian làm việc mOS Chat...
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
