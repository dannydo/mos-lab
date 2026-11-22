'use client';

import { Button, List, Space, Typography } from 'antd';
import { Pencil, Plus } from 'lucide-react';
import type { AcademyCourse, AcademyPlaybook } from '@mos-lab/shared';
import { AppIcon, DataSection, StatusTag } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';
import type { KnowledgeEditor } from './academy-leads-utils';

const { Text } = Typography;

export interface AcademyKnowledgeSectionProps {
  loading: boolean;
  isContentAdmin: boolean;
  playbooks: AcademyPlaybook[];
  courses: AcademyCourse[];
  onOpenEditor: (next: KnowledgeEditor) => void;
}

export function AcademyKnowledgeSection({
  loading,
  isContentAdmin,
  playbooks,
  courses,
  onOpenEditor,
}: AcademyKnowledgeSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <DataSection
        title="Playbook tư vấn"
        extra={
          isContentAdmin ? (
            <Button type="link" icon={<AppIcon icon={Plus} />} onClick={() => onOpenEditor({ kind: 'playbook' })}>
              Thêm
            </Button>
          ) : undefined
        }
        state={loading ? 'loading' : playbooks.length === 0 ? 'empty' : undefined}
        stateTitle="Chưa có playbook phù hợp"
      >
        <List
          dataSource={playbooks}
          renderItem={(item) => (
            <List.Item
              actions={
                isContentAdmin
                  ? [
                      <Button
                        key="edit"
                        type="link"
                        icon={<AppIcon icon={Pencil} />}
                        onClick={() => onOpenEditor({ kind: 'playbook', record: item })}
                      >
                        Sửa
                      </Button>,
                    ]
                  : []
              }
            >
              <List.Item.Meta
                title={
                  <Space>
                    <strong>{item.title}</strong>
                    <StatusTag status="purple" label={item.category} />
                  </Space>
                }
                description={item.description || item.content}
              />
            </List.Item>
          )}
        />
      </DataSection>

      <DataSection
        title="Khóa học"
        extra={
          isContentAdmin ? (
            <Button type="link" icon={<AppIcon icon={Plus} />} onClick={() => onOpenEditor({ kind: 'course' })}>
              Thêm
            </Button>
          ) : undefined
        }
        state={loading ? 'loading' : courses.length === 0 ? 'empty' : undefined}
        stateTitle="Chưa có khóa học phù hợp"
      >
        <List
          dataSource={courses}
          renderItem={(item) => (
            <List.Item
              actions={
                isContentAdmin
                  ? [
                      <Button
                        key="edit"
                        type="link"
                        icon={<AppIcon icon={Pencil} />}
                        onClick={() => onOpenEditor({ kind: 'course', record: item })}
                      >
                        Sửa
                      </Button>,
                    ]
                  : []
              }
            >
              <List.Item.Meta
                title={
                  <Space>
                    <strong>{item.name}</strong>
                    {item.tag && <StatusTag status="purple" label={item.tag} />}
                  </Space>
                }
                description={
                  <>
                    <div>{item.description || item.code}</div>
                    <Text type="secondary" className="tabular-nums">
                      Niêm yết {formatVND(item.listPriceVnd)} · Ưu đãi {formatVND(item.promoPriceVnd)}
                    </Text>
                  </>
                }
              />
            </List.Item>
          )}
        />
      </DataSection>
    </div>
  );
}
