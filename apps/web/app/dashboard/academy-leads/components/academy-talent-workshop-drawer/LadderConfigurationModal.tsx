'use client';

import React from 'react';
import { Button, Input, InputNumber, Popconfirm, Space, Tooltip } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { ACADEMY_TALENT_STRANDS_5_MIN_MAX, type UpdateAcademyTalentLadderConfigurationRequest } from '@mos-lab/shared';
import { AdaptiveModal, AppIcon } from '~/components/ui';
import styles from '../AcademyTalentWorkshop.module.css';
import { clampInteger, defaultLadderConfigurationDraft } from './workshop-drawer-utils';

export interface LadderConfigurationModalProps {
  draftTiers: UpdateAcademyTalentLadderConfigurationRequest['tiers'] | null;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onReplaceDraft: (tiers: UpdateAcademyTalentLadderConfigurationRequest['tiers']) => void;
  onUpdateTier: (
    tierKey: string,
    patch: Partial<UpdateAcademyTalentLadderConfigurationRequest['tiers'][number]>
  ) => void;
  onAddTier: () => void;
  onDeleteTier: (tierKey: string) => void;
}

export function LadderConfigurationModal({
  draftTiers,
  saving,
  onClose,
  onSave,
  onReplaceDraft,
  onUpdateTier,
  onAddTier,
  onDeleteTier,
}: LadderConfigurationModalProps) {
  return (
    <AdaptiveModal
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={onSave}>
          Lưu toàn cục
        </Button>,
      ]}
      className={styles.ladderEditorModal}
      intent="detail"
      open={Boolean(draftTiers)}
      title={
        <div className={styles.ladderEditorModalTitle}>
          <span>Cấu hình toàn bộ bậc thang quyền lợi</span>
          <small>Chính sách dùng chung cho Academy</small>
        </div>
      }
      zIndex={11070}
      onCancel={onClose}
    >
      {draftTiers && (
        <div className={styles.ladderEditor}>
          <section className={styles.ladderEditorIntro}>
            <div>
              <span className={styles.ladderEditorEyebrow}>BẢNG QUYỀN LỢI TOÀN CỤC</span>
              <p>
                Thêm, sửa hoặc xoá mốc trực tiếp. Hệ thống tự sắp xếp theo số sợi khi lưu và áp dụng cho báo giá mới.
              </p>
            </div>
            <div className={styles.ladderEditorCount}>
              <strong className="tabular-nums">{draftTiers.length}</strong>
              <span>mốc đang cấu hình</span>
            </div>
          </section>

          <div className={styles.ladderEditorToolbar}>
            <span>Mốc số sợi phải khác nhau · tối đa 10 mốc</span>
            <Space size={8} wrap>
              <Popconfirm
                cancelText="Giữ bản nháp"
                okText="Khôi phục"
                title="Khôi phục 6 mốc Academy mặc định?"
                onConfirm={() => onReplaceDraft(defaultLadderConfigurationDraft())}
              >
                <Button size="small">Khôi phục mặc định</Button>
              </Popconfirm>
              <Button
                type="primary"
                size="small"
                icon={<AppIcon icon={Plus} />}
                disabled={
                  draftTiers.length >= 10 ||
                  Math.max(...draftTiers.map((tier) => tier.strands)) >= ACADEMY_TALENT_STRANDS_5_MIN_MAX
                }
                onClick={onAddTier}
              >
                Thêm mốc
              </Button>
            </Space>
          </div>

          <div className={styles.ladderEditorTableWrap}>
            <table className={styles.ladderEditorTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Mốc</th>
                  <th>Sợi</th>
                  <th>Học phí (%)</th>
                  <th>Mẫu (%)</th>
                  <th>Đồ nghề (%)</th>
                  <th>Độ cao (%)</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {draftTiers.map((tier, index) => {
                  const tierLabel = tier.title.trim() || `mốc ${index + 1}`;
                  return (
                    <tr key={tier.key}>
                      <td>
                        <span className={styles.ladderEditorIndex}>{index + 1}</span>
                      </td>
                      <td>
                        <Input
                          aria-label={`Tên bubble ${tierLabel}`}
                          maxLength={80}
                          value={tier.title}
                          onChange={(event) => onUpdateTier(tier.key, { title: event.target.value })}
                        />
                      </td>
                      <td>
                        <InputNumber
                          aria-label={`Mốc số sợi ${tierLabel}`}
                          min={1}
                          max={ACADEMY_TALENT_STRANDS_5_MIN_MAX}
                          precision={0}
                          value={tier.strands}
                          onChange={(value) =>
                            onUpdateTier(tier.key, {
                              strands: clampInteger(value, 1, ACADEMY_TALENT_STRANDS_5_MIN_MAX),
                            })
                          }
                        />
                      </td>
                      <td>
                        <InputNumber
                          aria-label={`Học phí ${tierLabel}`}
                          min={0}
                          max={100}
                          precision={0}
                          value={tier.scholarshipPercent}
                          onChange={(value) =>
                            onUpdateTier(tier.key, {
                              scholarshipPercent: clampInteger(value, 0, 100),
                            })
                          }
                        />
                      </td>
                      <td>
                        <InputNumber
                          aria-label={`Ưu đãi mẫu ${tierLabel}`}
                          min={0}
                          max={100}
                          precision={0}
                          value={tier.sampleRewardPercent}
                          onChange={(value) =>
                            onUpdateTier(tier.key, {
                              sampleRewardPercent: clampInteger(value, 0, 100),
                            })
                          }
                        />
                      </td>
                      <td>
                        <InputNumber
                          aria-label={`Ưu đãi đồ nghề ${tierLabel}`}
                          min={0}
                          max={100}
                          precision={0}
                          value={tier.kitRewardPercent}
                          onChange={(value) =>
                            onUpdateTier(tier.key, {
                              kitRewardPercent: clampInteger(value, 0, 100),
                            })
                          }
                        />
                      </td>
                      <td>
                        <InputNumber
                          aria-label={`Độ cao bubble ${tierLabel}`}
                          min={0}
                          max={80}
                          precision={0}
                          value={tier.bubbleHeightPercent}
                          onChange={(value) =>
                            onUpdateTier(tier.key, {
                              bubbleHeightPercent: clampInteger(value, 0, 80),
                            })
                          }
                        />
                      </td>
                      <td>
                        <Popconfirm
                          cancelText="Giữ lại"
                          disabled={draftTiers.length <= 1}
                          okButtonProps={{ danger: true }}
                          okText="Xoá mốc"
                          title={`Xoá “${tierLabel}” khỏi bảng quyền lợi?`}
                          onConfirm={() => onDeleteTier(tier.key)}
                        >
                          <Tooltip title={draftTiers.length <= 1 ? 'Cần giữ ít nhất một mốc' : `Xoá ${tierLabel}`}>
                            <Button
                              aria-label={`Xoá mốc ${tierLabel}`}
                              danger
                              type="text"
                              icon={<AppIcon icon={Trash2} />}
                              disabled={draftTiers.length <= 1}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdaptiveModal>
  );
}
