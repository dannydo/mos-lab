'use client';

import React from 'react';
import { Alert, Button, Input, InputNumber, Select, Space, Switch, type FormInstance } from 'antd';
import { Save } from 'lucide-react';
import type { Team } from '@mos-lab/shared';
import { AppIcon, EntityForm, EntityFormDrawer, EntityFormField } from '~/components/ui';
import type { TeamFormValues } from '../teams-page.helpers';
import styles from '../teams.module.css';
import type { TeamEditorState, TeamSelectOption } from './teamPageUtils';

export interface TeamEditorDrawerProps {
  teamEditor: TeamEditorState;
  teamForm: FormInstance<TeamFormValues>;
  savingTeam: boolean;
  allTeams: Team[];
  parentOptions: TeamSelectOption[];
  departmentOptions: TeamSelectOption[];
  onClose: () => void;
  onSubmit: (values: TeamFormValues) => void;
}

export function TeamEditorDrawer({
  teamEditor,
  teamForm,
  savingTeam,
  allTeams,
  parentOptions,
  departmentOptions,
  onClose,
  onSubmit,
}: TeamEditorDrawerProps) {
  return (
    <EntityFormDrawer
      title={teamEditor?.team ? `Sửa team · ${teamEditor.team.name}` : 'Tạo team mới'}
      open={Boolean(teamEditor)}
      onClose={onClose}
      destroyOnHidden
      footer={
        <Space wrap>
          <Button onClick={onClose} disabled={savingTeam}>
            Hủy
          </Button>
          <Button
            type="primary"
            icon={<AppIcon icon={Save} size="sm" />}
            loading={savingTeam}
            onClick={() => teamForm.submit()}
          >
            {teamEditor?.team ? 'Lưu thay đổi' : 'Tạo team'}
          </Button>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        className={styles.editorNotice}
        message="Department là phạm vi vận hành; Team là đơn vị nhân sự"
        description="Team trực thuộc sẽ tự động kế thừa Department của team cha. Mã team là khóa tích hợp ổn định nên không đổi sau khi tạo."
      />
      <EntityForm<TeamFormValues> form={teamForm} columns={2} onFinish={onSubmit}>
        <EntityFormField
          name="name"
          label="Tên team"
          rules={[{ required: true, whitespace: true, message: 'Nhập tên team.' }]}
        >
          <Input autoFocus placeholder="Ví dụ: Academy Admissions" maxLength={120} />
        </EntityFormField>

        <EntityFormField
          name="code"
          label="Mã team"
          rules={[
            { required: true, whitespace: true, message: 'Nhập mã team.' },
            { pattern: /^[A-Za-z][A-Za-z0-9_]{1,29}$/, message: 'Dùng chữ, số và dấu gạch dưới; bắt đầu bằng chữ.' },
          ]}
          extra={teamEditor?.team ? 'Mã team không thể thay đổi sau khi tạo.' : 'Ví dụ: ACADEMY_ADMISSIONS'}
        >
          <Input disabled={Boolean(teamEditor?.team)} placeholder="ACADEMY_ADMISSIONS" maxLength={30} />
        </EntityFormField>

        <EntityFormField name="parentTeamId" label="Team cha (không bắt buộc)">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Chọn để tạo team trực thuộc"
            options={parentOptions}
            onChange={(parentId) => {
              const parent = allTeams.find((team) => team.id === parentId);
              if (parent?.departmentId) teamForm.setFieldValue('departmentId', parent.departmentId);
            }}
          />
        </EntityFormField>

        <EntityFormField
          name="departmentId"
          label="Department"
          rules={[{ required: true, message: 'Chọn Department.' }]}
          extra="Team trực thuộc sẽ kế thừa Department từ team cha."
        >
          <Select showSearch optionFilterProp="label" placeholder="Chọn phạm vi vận hành" options={departmentOptions} />
        </EntityFormField>

        <EntityFormField name="sortOrder" label="Thứ tự hiển thị">
          <InputNumber min={0} precision={0} className="w-full tabular-nums" />
        </EntityFormField>

        <EntityFormField name="isActive" label="Đang hoạt động" valuePropName="checked">
          <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
        </EntityFormField>

        <EntityFormField name="description" label="Mô tả" fullWidth>
          <Input.TextArea rows={3} placeholder="Vai trò, phạm vi và quy ước vận hành của team…" maxLength={500} />
        </EntityFormField>
      </EntityForm>
    </EntityFormDrawer>
  );
}
