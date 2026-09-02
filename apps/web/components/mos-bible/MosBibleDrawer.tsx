'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Collapse, Input, Segmented, Select, Tag, Typography, theme } from 'antd';
import { BookOpenCheck, Search, Sparkles } from 'lucide-react';
import {
  filterMosBibleCommandments,
  getMosBibleBook,
  getMosBibleCommandmentsForPath,
  isMosBibleCommandmentRelevant,
  MOS_BIBLE_BOOKS,
  MOS_BIBLE_COMMANDMENTS,
  vietnameseSearchFilter,
  type MosBibleBookKey,
  type MosBibleCommandment,
} from '@mos-lab/shared';
import { AdaptiveDrawer, AppIcon, StatePanel, StatusTag } from '../ui';
import styles from './MosBibleDrawer.module.css';

const { Text } = Typography;

type BibleScope = 'PAGE' | 'ALL';

export interface MosBibleDrawerProps {
  open: boolean;
  pathname: string;
  onClose: () => void;
}

const STATUS_PRESENTATION = {
  ACTIVE: { label: 'Đang hiệu lực', status: 'success' as const },
  REVISED: { label: 'Đã sửa', status: 'warning' as const },
  RETIRED: { label: 'Đã hồi hưu', status: 'default' as const },
};

function CommandmentDetail({ commandment }: { commandment: MosBibleCommandment }) {
  const { token } = theme.useToken();
  const status = STATUS_PRESENTATION[commandment.status];

  return (
    <div className={styles.detail}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusTag status={status.status} label={status.label} />
        <Tag className="m-0 tabular-nums">Bản {commandment.version}</Tag>
        <Text type="secondary" className="text-xs tabular-nums">
          Hiệu lực từ {commandment.effectiveFrom}
        </Text>
      </div>

      <section>
        <div className={styles.detailSectionTitle} style={{ color: token.colorTextSecondary }}>
          Các điều phải thuộc lòng
        </div>
        <ol className={styles.commandmentList}>
          {commandment.commandments.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section>
        <div className={styles.detailSectionTitle} style={{ color: token.colorTextSecondary }}>
          Chú giải
        </div>
        <div
          className={styles.rationale}
          style={{
            background: token.colorInfoBg,
            borderColor: token.colorInfoBorder,
            color: token.colorText,
          }}
        >
          {commandment.rationale}
        </div>
      </section>

      {commandment.examples?.length ? (
        <section>
          <div className={styles.detailSectionTitle} style={{ color: token.colorTextSecondary }}>
            Dụ ngôn thực tế
          </div>
          <ul className={styles.plainList}>
            {commandment.examples.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {commandment.exceptions?.length ? (
        <section>
          <div className={styles.detailSectionTitle} style={{ color: token.colorTextSecondary }}>
            Ngoại lệ được ban phép
          </div>
          <ul className={styles.plainList}>
            {commandment.exceptions.map((exception) => (
              <li key={exception}>{exception}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className={styles.detailSectionTitle} style={{ color: token.colorTextSecondary }}>
          Bia đá & nguồn kiểm chứng
        </div>
        <div className={styles.sourceList}>
          {commandment.sources.map((source) => (
            <div key={`${source.label}-${source.reference}`} className={styles.sourceItem}>
              <Text strong className="text-xs">
                {source.label}
              </Text>
              <span className={styles.sourceReference} style={{ color: token.colorTextSecondary }}>
                {source.reference}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-1.5">
        {commandment.tags.map((tag) => (
          <Tag key={tag} bordered={false} className="m-0 text-[11px]">
            {tag}
          </Tag>
        ))}
      </div>
    </div>
  );
}

export default function MosBibleDrawer({ open, pathname, onClose }: MosBibleDrawerProps) {
  const { token } = theme.useToken();
  const relatedCommandments = useMemo(() => getMosBibleCommandmentsForPath(pathname), [pathname]);
  const [scope, setScope] = useState<BibleScope>('PAGE');
  const [searchText, setSearchText] = useState('');
  const [book, setBook] = useState<MosBibleBookKey | 'ALL'>('ALL');

  useEffect(() => {
    if (!open) return;
    setScope(relatedCommandments.length > 0 ? 'PAGE' : 'ALL');
    setSearchText('');
    setBook('ALL');
  }, [open, pathname, relatedCommandments.length]);

  const scopedCommandments = scope === 'PAGE' ? relatedCommandments : MOS_BIBLE_COMMANDMENTS;
  const visibleCommandments = useMemo(
    () => filterMosBibleCommandments(scopedCommandments, searchText, book),
    [book, scopedCommandments, searchText]
  );
  const availableBookKeys = useMemo(
    () => new Set(scopedCommandments.map((commandment) => commandment.book)),
    [scopedCommandments]
  );
  const bookOptions = [
    { label: 'Tất cả các Quyển', value: 'ALL' },
    ...MOS_BIBLE_BOOKS.filter((candidate) => availableBookKeys.has(candidate.key)).map((candidate) => ({
      label: candidate.label,
      value: candidate.key,
    })),
  ];

  const collapseItems = visibleCommandments.map((commandment) => {
    const commandmentBook = getMosBibleBook(commandment.book);
    const isRelated = isMosBibleCommandmentRelevant(commandment, pathname);

    return {
      key: commandment.id,
      label: (
        <div className={styles.commandmentLabel}>
          <div className={styles.commandmentMeta}>
            <StatusTag status="gold" label={commandment.id} />
            <Text type="secondary" className="text-[11px]">
              {commandmentBook.label}
            </Text>
            {scope === 'ALL' && isRelated ? <StatusTag status="processing" label="Liên quan trang này" /> : null}
          </div>
          <div className={styles.commandmentTitle}>{commandment.title}</div>
          <div className={styles.commandmentSummary} style={{ color: token.colorTextSecondary }}>
            {commandment.summary}
          </div>
        </div>
      ),
      children: <CommandmentDetail commandment={commandment} />,
    };
  });

  return (
    <AdaptiveDrawer
      open={open}
      onClose={onClose}
      intent="detail"
      className="mos-bible-drawer"
      destroyOnClose={false}
      zIndex={12100}
      title={
        <div className={styles.drawerTitle}>
          <span
            className={styles.drawerTitleIcon}
            style={{ background: token.colorWarningBg, color: token.colorWarningText }}
          >
            <AppIcon icon={BookOpenCheck} />
          </span>
          <span className={styles.drawerTitleCopy}>
            <span className={styles.drawerTitleHeading}>Kinh Thánh mOS</span>
            <span className={styles.drawerTitleSubtitle} style={{ color: token.colorTextSecondary }}>
              Quy chuẩn vận hành có thể tiến hoá
            </span>
          </span>
        </div>
      }
      styles={{
        body: { padding: '16px', background: token.colorBgLayout },
        header: { borderColor: token.colorBorderSecondary },
      }}
    >
      <div
        className={styles.intro}
        style={{
          background: token.colorWarningBg,
          borderColor: token.colorWarningBorder,
          color: token.colorText,
        }}
      >
        <span className={styles.introIcon} style={{ color: token.colorWarningText }}>
          <AppIcon icon={Sparkles} />
        </span>
        <div>
          <div className={styles.introTitle}>Trang này có {relatedCommandments.length} Điều răn liên quan</div>
          <div className={styles.introCopy} style={{ color: token.colorTextSecondary }}>
            mOS đã mở đúng mục lục theo trang bạn đang đứng. Chọn một Điều răn để xem chú giải, ngoại lệ và nguồn kiểm
            chứng.
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <Input
          allowClear
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          prefix={<AppIcon icon={Search} size="sm" />}
          placeholder="Tra Kinh: Booker, không dấu, Missed…"
          aria-label="Tra cứu Kinh Thánh mOS"
        />
        <Select
          showSearch
          value={book}
          onChange={(value) => setBook(value)}
          options={bookOptions}
          filterOption={vietnameseSearchFilter}
          aria-label="Chọn Quyển nghiệp vụ"
        />
      </div>

      <Segmented
        block
        className={styles.scopeSwitch}
        value={scope}
        onChange={(value) => {
          setScope(value as BibleScope);
          setBook('ALL');
        }}
        options={[
          { label: `Trang này (${relatedCommandments.length})`, value: 'PAGE' },
          { label: `Toàn bộ (${MOS_BIBLE_COMMANDMENTS.length})`, value: 'ALL' },
        ]}
        aria-label="Phạm vi Kinh Thánh mOS"
      />

      <div className={styles.resultsMeta} style={{ color: token.colorTextSecondary }}>
        <span>{visibleCommandments.length} Điều răn</span>
        <span>{scope === 'PAGE' ? 'Mục lục theo ngữ cảnh' : 'Toàn bộ thư viện'}</span>
      </div>

      {visibleCommandments.length ? (
        <Collapse accordion items={collapseItems} />
      ) : (
        <StatePanel
          surface={false}
          minHeight={220}
          kind="empty"
          title="Chưa tìm thấy lời răn phù hợp"
          description="Thử từ khóa khác, chọn Quyển khác hoặc chuyển sang Toàn bộ Kinh Thánh."
        />
      )}

      <div className={styles.footerNote} style={{ color: token.colorTextTertiary }}>
        “Kinh” được sửa qua từng Công đồng sản phẩm. Mỗi lần sửa đều phải có phiên bản, ngày hiệu lực và nguồn.
      </div>
    </AdaptiveDrawer>
  );
}
