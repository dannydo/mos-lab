'use client';

import type { MarketingExperienceManifest, UiExperienceActivation } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { MarketingCanvas } from '../MarketingCanvas';
import { MarketingCta } from '../MarketingCta';
import styles from './IndependenceDay2026Landing.module.css';

export interface IndependenceDay2026LandingProps {
  activation: UiExperienceActivation;
  manifest: MarketingExperienceManifest;
  preview?: boolean;
}

const PRINCIPLES = [
  ['01', 'Thiết kế theo dáng mắt', 'Mỗi lựa chọn bắt đầu từ đường nét riêng và phong cách bạn muốn thể hiện.'],
  ['02', 'Trải nghiệm tinh tế', 'Từng chi tiết được sắp đặt để khoảnh khắc làm đẹp thật nhẹ nhàng và đáng nhớ.'],
  ['03', 'Tư vấn riêng', 'Đội ngũ Wings Lashes đồng hành để bạn chọn trải nghiệm phù hợp nhất.'],
] as const;

export function IndependenceDay2026Landing({ activation, manifest, preview = false }: IndependenceDay2026LandingProps) {
  const handleCtaClick = () => {
    if (preview) return;
    apiClient.uiExperiences.recordEvent({ activationId: activation.id, eventType: 'CTA_CLICK' }).catch(() => {});
  };

  return (
    <MarketingCanvas className={styles.landing} label={manifest.label}>
      <div className={styles.grain} aria-hidden />
      <div className={styles.orb} aria-hidden />
      <div className={styles.page}>
        <header className={styles.utility}>
          <span className={styles.brand}>Wings Lashes</span>
          {preview ? <span className={styles.preview}>Bản xem trước</span> : null}
          <span className={styles.utilityDate}>02.09.1945 — 02.09.2026</span>
        </header>

        <section className={styles.hero} aria-labelledby="independence-day-title">
          <div>
            <div className={styles.eyebrow}>Kỷ niệm 81 năm Quốc khánh Việt Nam</div>
            <h1 id="independence-day-title" className={styles.title}>
              Rạng rỡ
              <span className={styles.titleAccent}>sắc Việt</span>
            </h1>
            <p className={styles.description}>
              Một lời chào mùa lễ hội dành cho vẻ đẹp tự tin, thanh lịch và đậm dấu ấn riêng của người phụ nữ Việt.
            </p>
            <div className={styles.actions}>
              <MarketingCta
                href={activation.ctaUrl || 'https://wingslashes.com'}
                className={styles.primaryCta}
                onClick={handleCtaClick}
                accessibleLabel={`${activation.ctaLabel || 'Khám phá trải nghiệm'} — mở liên kết tư vấn`}
              >
                {activation.ctaLabel || 'Khám phá trải nghiệm'}
                <span className={styles.ctaArrow} aria-hidden>
                  →
                </span>
              </MarketingCta>
              <span className={styles.ctaNote}>Tư vấn trực tiếp cùng đội ngũ Wings Lashes</span>
            </div>
          </div>

          <div className={styles.art} aria-hidden>
            <div className={styles.artFrame}>
              <div className={styles.sun} />
              <div className={styles.silhouette}>
                <div className={styles.eye} />
                <div className={styles.lashes} />
              </div>
              <div className={styles.anniversary}>81</div>
              <div className={styles.artCaption}>Độc lập · Tự tin · Rạng rỡ</div>
            </div>
            <div className={styles.star} />
          </div>
        </section>

        <section className={styles.principles} aria-label="Giá trị trải nghiệm Wings Lashes">
          {PRINCIPLES.map(([index, title, description]) => (
            <article className={styles.principle} key={index}>
              <span className={styles.principleIndex}>{index}</span>
              <h2 className={styles.principleTitle}>{title}</h2>
              <p className={styles.principleText}>{description}</p>
            </article>
          ))}
        </section>
      </div>
    </MarketingCanvas>
  );
}
