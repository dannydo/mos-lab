'use client';

import React from 'react';
import { Button, Collapse, Space, Typography, message } from 'antd';
import { Copy } from 'lucide-react';
import dayjs from 'dayjs';
import type { AcademyLead } from '@mos-lab/shared';
import { AppIcon, StatePanel } from '../../../../components/ui';

const { Paragraph } = Typography;

type SalesScript = { key: string; title: string; text: string };

function leadFirstName(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).at(-1) || 'chị';
}

function buildSalesScripts(lead: Pick<AcademyLead, 'name' | 'status' | 'flightDate' | 'revenueVnd'>): SalesScript[] {
  const firstName = leadFirstName(lead.name);
  const scriptsByStatus: Record<AcademyLead['status'], SalesScript[]> = {
    NEW: [
      {
        key: 'discover',
        title: 'Mở đầu khai thác nhu cầu',
        text: `Chào chị ${firstName}! Để em tư vấn lộ trình phù hợp nhất, chị cho em hỏi mình đã học nối mi lần nào chưa ạ?`,
      },
      {
        key: 'follow-up',
        title: 'Follow-up sau 24 giờ',
        text: `Chị ${firstName} ơi, bên em có lịch test tay miễn phí cùng giảng viên. Chị muốn em giữ một khung giờ phù hợp cho mình không ạ?`,
      },
    ],
    WARM: [
      {
        key: 'invite-test',
        title: 'Mời test tay nghề 1–1',
        text: `Chị ${firstName} ơi, bên em có buổi test tay miễn phí khoảng 30 phút, giảng viên kèm 1–1. Chiều nay hay sáng mai chị tiện hơn ạ?`,
      },
      {
        key: 'urgency',
        title: 'Nhắc suất test',
        text: `Chị ${firstName} ơi, lịch test tuần này còn ít chỗ. Em giữ trước cho mình một suất nhé?`,
      },
    ],
    SCHEDULED: [
      {
        key: 'remind-night-before',
        title: 'Nhắc lịch trước buổi test',
        text: `Chị ${firstName} ơi, em nhắc lịch test tay nghề của mình. Giảng viên đã chuẩn bị sẵn để hỗ trợ chị rồi ạ.`,
      },
      {
        key: 'reschedule',
        title: 'Nếu cần dời lịch',
        text: `Dạ không sao chị ${firstName} ơi. Em có thể dời lịch test sang khung giờ phù hợp hơn, chị cho em xin ngày mình tiện nhé.`,
      },
    ],
    TESTED: [
      {
        key: 'after-test',
        title: 'Follow-up sau test',
        text: `Chị ${firstName} ơi, em muốn hỏi cảm nhận của chị sau buổi test. Phần nào chị còn băn khoăn để em hỗ trợ rõ hơn ạ?`,
      },
      {
        key: 'offer',
        title: 'Gửi lộ trình và ưu đãi',
        text: `Em gửi lại chị ${firstName} lộ trình học và ưu đãi đang áp dụng. Chị xem giúp em, em sẽ giữ thông tin phù hợp nhất cho mình ạ.`,
      },
    ],
    WON: [
      {
        key: 'confirm-enrollment',
        title: 'Xác nhận đăng ký',
        text: `Wings xác nhận chị ${firstName} đã đăng ký khóa học${lead.revenueVnd > 0 ? ` với khoản thanh toán ${Math.round(lead.revenueVnd).toLocaleString('vi-VN')} đ` : ''}. Em gửi chị các bước chuẩn bị trước buổi học nhé.`,
      },
    ],
    LOST: [
      {
        key: 'reconnect',
        title: 'Mở lại cuộc trò chuyện',
        text: `Chị ${firstName} ơi, khi nào mình sẵn sàng tìm hiểu lại về lộ trình học nối mi, chị cứ nhắn em. Em luôn sẵn sàng hỗ trợ ạ.`,
      },
    ],
  };
  const scripts = [...scriptsByStatus[lead.status]];
  if (lead.flightDate) {
    const days = dayjs(lead.flightDate).startOf('day').diff(dayjs().startOf('day'), 'day');
    if (days >= 0 && days <= 14) {
      scripts.unshift({
        key: 'flight-urgent',
        title: `Ưu tiên lịch bay · còn ${days} ngày`,
        text: `Chị ${firstName} ơi, lịch bay của mình đang đến gần. Nếu chị muốn hoàn tất phần tư vấn hoặc lịch test trước khi bay, em ưu tiên sắp xếp ngay cho chị nhé.`,
      });
    }
  }
  return scripts;
}

export interface AcademyLeadScriptsProps {
  lead: Pick<AcademyLead, 'name' | 'status' | 'flightDate' | 'revenueVnd'>;
}

export function AcademyLeadScripts({ lead }: AcademyLeadScriptsProps) {
  const scripts = React.useMemo(() => buildSalesScripts(lead), [lead]);

  if (!scripts.length) return <StatePanel kind="empty" surface={false} title="Chưa có kịch bản phù hợp" />;

  return (
    <Collapse
      items={scripts.map((script) => ({
        key: script.key,
        label: script.title,
        children: (
          <Space direction="vertical" className="w-full" size="small">
            <Paragraph className="mb-0 whitespace-pre-wrap">{script.text}</Paragraph>
            <Button
              size="small"
              icon={<AppIcon icon={Copy} />}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(script.text);
                  message.success('Đã sao chép kịch bản.');
                } catch {
                  message.error('Không thể sao chép kịch bản.');
                }
              }}
            >
              Sao chép
            </Button>
          </Space>
        ),
      }))}
    />
  );
}

export default AcademyLeadScripts;
