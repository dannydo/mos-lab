'use client';

import styles from './MarketingPrimitives.module.css';

export interface MarketingStatePanelProps {
  kind: 'loading' | 'unavailable' | 'error';
  title?: string;
  description?: string;
}

export function MarketingStatePanel({ kind, title, description }: MarketingStatePanelProps) {
  const content = {
    loading: {
      mark: '✦',
      title: 'Đang chuẩn bị trải nghiệm',
      description: 'Chỉ một chút nữa thôi…',
    },
    unavailable: {
      mark: '—',
      title: 'Chiến dịch không khả dụng',
      description: 'Trải nghiệm này chưa bắt đầu hoặc đã kết thúc.',
    },
    error: {
      mark: '!',
      title: 'Chưa thể tải chiến dịch',
      description: 'Vui lòng thử lại sau ít phút.',
    },
  }[kind];

  return (
    <main className={styles.stateShell} aria-live={kind === 'loading' ? 'polite' : 'assertive'}>
      <section className={styles.stateCard}>
        <div className={styles.stateMark} aria-hidden>
          {content.mark}
        </div>
        <h1 className={styles.stateTitle}>{title || content.title}</h1>
        <p className={styles.stateDescription}>{description || content.description}</p>
      </section>
    </main>
  );
}
