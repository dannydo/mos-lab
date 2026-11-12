'use client';

import React from 'react';
import { Sparkles, Lock, Gift, Zap, ZoomIn, Copy, Check } from 'lucide-react';
import type { MatchedComboPackageOption, WingsComboRulePrice } from '@mos-lab/shared';
import type { WingsTierOption } from '../WingsComboCard';
import { formatCompactBonusValue, formatCompactVnd } from './comboCardHelpers';
import { LashVolumeIcon } from './GoldLaurelWreathBadge';

interface ComboCardBodySectionsProps {
  pkg: MatchedComboPackageOption;
  compact: boolean;
  includeVat: boolean;
  showActionFooter: boolean;
  paidSessionLabel: string;
  bonusSessionLabel: string;
  volumePrices: WingsComboRulePrice[];
  displayPrice: number;
  displayRetailTotal: number;
  displayAvgPerSession: number;
  allTiers?: WingsTierOption[];
  onZoomOriginalCard?: (e: React.MouseEvent) => void;
  onCopyQuote?: (e: React.MouseEvent) => void;
  copiedQuote: boolean;
}

export function ComboCardBodySections({
  pkg,
  compact,
  includeVat,
  showActionFooter,
  paidSessionLabel,
  bonusSessionLabel,
  volumePrices,
  displayPrice,
  displayRetailTotal,
  displayAvgPerSession,
  allTiers,
  onZoomOriginalCard,
  onCopyQuote,
  copiedQuote,
}: ComboCardBodySectionsProps) {
  return (
    <>
      {/* Session Formula Bar: ✦ X New · Y Refill  |  Gift Z Refill */}
      <div
        style={{
          marginTop: compact ? 4 : 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 4,
          padding: '3.5px 8px',
          borderRadius: 8,
          background: 'rgba(0, 0, 0, 0.36)',
          border: '1px solid rgba(243, 206, 104, 0.22)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <div
          style={{
            fontSize: compact ? 10.5 : 11.5,
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '0.01em',
            display: 'flex',
            alignItems: 'center',
            gap: 4.5,
          }}
        >
          <span style={{ color: '#FFE27A' }}>✦</span>
          <span>{paidSessionLabel}</span>
        </div>
        {bonusSessionLabel && (
          <div
            style={{
              fontSize: compact ? 10.5 : 11.5,
              fontWeight: 900,
              color: '#6EE7B7',
              letterSpacing: '0.01em',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Gift style={{ width: 11, height: 11, color: '#6EE7B7' }} />
            <span>{bonusSessionLabel}</span>
          </div>
        )}
      </div>

      {/* Volume Price Matrix Strip OR Tier List */}
      {allTiers && allTiers.length > 0 ? (
        /* Vertical Tier Selector — gom toàn bộ các gói thành danh sách chọn bên trong card */
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {allTiers.map((tier, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (tier.isLocked) {
                  tier.onSelectLocked?.();
                } else {
                  tier.onSelect();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6.5px 10px',
                borderRadius: 9,
                border: tier.isActive ? '1.5px solid #FFE27A' : '1px solid rgba(255,255,255,0.12)',
                background: tier.isActive
                  ? 'linear-gradient(180deg, rgba(245,196,81,0.22) 0%, rgba(212,155,39,0.12) 100%)'
                  : tier.isLocked
                    ? 'rgba(0,0,0,0.18)'
                    : 'rgba(0,0,0,0.28)',
                opacity: tier.isLocked ? 0.45 : 1,
                cursor: tier.isLocked ? (tier.onSelectLocked ? 'pointer' : 'not-allowed') : 'pointer',
                fontVariantNumeric: 'tabular-nums',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {tier.isLocked && <Lock style={{ width: 11, height: 11, color: '#F59E0B' }} />}
                <span
                  style={{
                    fontSize: compact ? 12 : 13,
                    fontWeight: 900,
                    letterSpacing: '0.02em',
                    color: tier.isActive ? '#FFE27A' : tier.isLocked ? '#888' : '#FFFFFF',
                  }}
                >
                  {tier.label}
                </span>
                {tier.discountPct && tier.discountPct > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: tier.isActive ? '#1A1102' : '#F59E0B',
                      background: tier.isActive ? '#FFE27A' : 'rgba(245,158,11,0.18)',
                      padding: '1px 5px',
                      borderRadius: 4,
                    }}
                  >
                    +{tier.discountPct}%
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontVariantNumeric: 'tabular-nums' }}>
                <div
                  style={{
                    fontSize: compact ? 12.5 : 13.5,
                    fontWeight: 900,
                    color: tier.isActive ? '#FFE27A' : '#F3CE68',
                    lineHeight: 1.2,
                  }}
                >
                  {formatCompactVnd(tier.comboPrice)}
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    color: 'rgba(255,255,255,0.45)',
                    fontWeight: 600,
                  }}
                >
                  ~{formatCompactVnd(tier.avgPerSessionPrice)}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : pkg.packageKind !== 'vvip_pass' ? (
        <div
          style={{
            marginTop: 6,
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(volumePrices.length, 6)}, minmax(0, 1fr))`,
            gap: 3.5,
            alignItems: 'stretch',
          }}
        >
          {' '}
          {volumePrices.slice(0, 6).map((vp) => {
            const isCurrentVol =
              pkg.volume === 'under'
                ? Boolean(vp.isUnderLash || vp.volume === 'under')
                : !vp.isUnderLash && Number(vp.volume) === Number(pkg.volume);
            const vpComboPrice = includeVat ? Math.round(vp.comboPrice * 1.08) : vp.comboPrice;
            const vpRetail = vp.retailTotal || vp.comboPrice;

            return (
              <div
                key={vp.isUnderLash ? 'under' : String(vp.volume)}
                style={{
                  padding: '4px 2px',
                  borderRadius: 7,
                  textAlign: 'center',
                  background: isCurrentVol
                    ? 'linear-gradient(180deg, rgba(245, 196, 81, 0.28) 0%, rgba(212, 155, 39, 0.16) 100%)'
                    : 'rgba(0, 0, 0, 0.28)',
                  border: isCurrentVol ? '1.5px solid #FFE27A' : '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: isCurrentVol ? '0 0 8px rgba(245, 196, 81, 0.25)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {/* Volume Code Row */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 2,
                    fontSize: compact ? 9.5 : 10,
                    fontWeight: 800,
                    color: isCurrentVol ? '#FFE27A' : '#E2E8F0',
                  }}
                >
                  <LashVolumeIcon active={isCurrentVol} />
                  <span>{vp.isUnderLash ? '390' : vp.volume}</span>
                </div>

                {/* Crossed-out Retail Price */}
                <div
                  style={{
                    fontSize: compact ? 8.5 : 9,
                    fontWeight: 600,
                    color: 'rgba(226, 232, 240, 0.62)',
                    textDecoration: 'line-through',
                    lineHeight: 1.15,
                    marginTop: 1.5,
                  }}
                >
                  {formatCompactVnd(vpRetail)}
                </div>

                {/* Gold Combo Price */}
                <div
                  style={{
                    fontSize: compact ? 10.5 : 11.5,
                    fontWeight: 900,
                    color: isCurrentVol ? '#FFE27A' : '#F3CE68',
                    lineHeight: 1.15,
                    marginTop: 1,
                  }}
                >
                  {formatCompactVnd(vpComboPrice)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            marginTop: 6,
            padding: '6px 10px',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.38)',
            border: '1px solid rgba(243, 206, 104, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 10.5, color: '#F8E7B0', fontWeight: 700 }}>
              20 Lần Nối Mi Tự Chọn Tất Cả Dòng Mi & Độ Dày
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.72)' }}>
              Áp dụng dùng chung cho bạn bè & người thân · Hạn 36 tháng
            </div>
          </div>
          <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            <div
              style={{
                fontSize: 10.5,
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'line-through',
              }}
            >
              35.40M
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#FFE27A' }}>{formatCompactVnd(displayPrice)}</div>
          </div>
        </div>
      )}

      {/* Footer Bar: Exact Customer Price + Optional Actions */}
      {showActionFooter && (
        <div
          style={{
            marginTop: compact ? 6 : 8,
            paddingTop: compact ? 6 : 8,
            borderTop: '1px solid rgba(243, 206, 104, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4.5,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {/* Row 1: Giá combo chính, Giá gốc gạch ngang & Đơn giá trung bình mỗi buổi */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {/* Left: Giá chính + Giá gốc gạch ngang */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: compact ? 16 : 17.5,
                  fontWeight: 900,
                  color: '#FFE27A',
                  textShadow: '0 1px 3px rgba(0,0,0,0.65)',
                  letterSpacing: '-0.01em',
                }}
              >
                {displayPrice.toLocaleString('vi-VN')}đ
              </span>

              {displayRetailTotal > displayPrice && (
                <span
                  style={{
                    fontSize: compact ? 10.5 : 11,
                    color: 'rgba(255, 255, 255, 0.45)',
                    textDecoration: 'line-through',
                    fontWeight: 500,
                  }}
                >
                  {displayRetailTotal.toLocaleString('vi-VN')}đ
                </span>
              )}

              {includeVat && (
                <span
                  style={{
                    fontSize: 8.5,
                    fontWeight: 800,
                    color: '#34D399',
                    background: 'rgba(52, 211, 153, 0.16)',
                    border: '1px solid rgba(52, 211, 153, 0.35)',
                    borderRadius: 4,
                    padding: '1px 5px',
                    letterSpacing: '0.02em',
                  }}
                >
                  Đã gồm 8% VAT
                </span>
              )}
            </div>

            {/* Right: Badge trung bình mỗi lần & Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <span
                style={{
                  background: 'rgba(245, 196, 81, 0.14)',
                  border: '1px solid rgba(245, 196, 81, 0.32)',
                  color: '#FFE27A',
                  borderRadius: 999,
                  padding: compact ? '1.5px 7px' : '2px 8px',
                  fontSize: compact ? 9.5 : 10,
                  fontWeight: 800,
                  letterSpacing: '0.01em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3.5,
                  whiteSpace: 'nowrap',
                }}
              >
                <Zap style={{ width: 10, height: 10, color: '#FFE27A' }} />
                <span>~{formatCompactVnd(displayAvgPerSession)}/lần</span>
              </span>

              {/* Optional Action Buttons (Thẻ gốc, Báo giá) */}
              {onZoomOriginalCard && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onZoomOriginalCard(e);
                  }}
                  style={{
                    padding: '3px 7px',
                    borderRadius: 6,
                    border: '1px solid rgba(243, 206, 104, 0.35)',
                    background: 'rgba(0, 0, 0, 0.35)',
                    color: '#F8E7B0',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3.5,
                  }}
                >
                  <ZoomIn style={{ width: 10.5, height: 10.5 }} />
                  <span>Thẻ gốc</span>
                </button>
              )}

              {onCopyQuote && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyQuote(e);
                  }}
                  style={{
                    padding: '3px 7px',
                    borderRadius: 6,
                    border: '1px solid rgba(243, 206, 104, 0.35)',
                    background: copiedQuote ? 'rgba(16, 185, 129, 0.35)' : 'rgba(0, 0, 0, 0.35)',
                    color: copiedQuote ? '#A7F3D0' : '#F8E7B0',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3.5,
                  }}
                >
                  {copiedQuote ? (
                    <>
                      <Check style={{ width: 10.5, height: 10.5 }} />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy style={{ width: 10.5, height: 10.5 }} />
                      <span>Báo giá</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Chi tiết quyền lợi Mua & Tặng */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
              fontSize: compact ? 9.5 : 10,
              marginTop: 1,
            }}
          >
            {(() => {
              if (!pkg.readableContent.includes(' · ')) {
                return (
                  <span
                    style={{
                      color: 'rgba(255, 246, 214, 0.88)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3.5,
                    }}
                  >
                    <Sparkles style={{ width: 10.5, height: 10.5, color: '#FFE27A' }} />
                    <span>{pkg.readableContent}</span>
                  </span>
                );
              }

              const parts = pkg.readableContent.split(' · ');
              const paidPart = parts[0];
              const rawBonusPart = parts[1];
              const compactBonusPart = rawBonusPart.replace(/\(Trị giá ([\d.]+)\s*đ\)/i, (_, numStr) => {
                const cleanNum = Number(numStr.replace(/\./g, ''));
                return !isNaN(cleanNum) && cleanNum > 0
                  ? `(Trị giá ${formatCompactBonusValue(cleanNum)})`
                  : `(Trị giá ${numStr}đ)`;
              });

              return (
                <>
                  <span
                    style={{
                      color: 'rgba(255, 246, 214, 0.92)',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3.5,
                    }}
                  >
                    <span style={{ color: '#FFE27A', fontSize: 11 }}>✦</span>
                    <span>{paidPart}</span>
                  </span>
                  <span style={{ color: 'rgba(243, 206, 104, 0.4)' }}>•</span>
                  <span
                    style={{
                      color: '#6EE7B7',
                      fontWeight: 700,
                      background: 'rgba(16, 185, 129, 0.14)',
                      border: '1px solid rgba(16, 185, 129, 0.28)',
                      borderRadius: 5,
                      padding: '1px 6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3.5,
                    }}
                  >
                    <Gift style={{ width: 10, height: 10, color: '#34D399' }} />
                    <span>{compactBonusPart}</span>
                  </span>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
