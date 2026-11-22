'use client';

import React from 'react';
import { Button, Input, Radio, Select, Tag } from 'antd';
import { GiftOutlined } from '@ant-design/icons';
import { CustomerCampaignPromotionInfo, CustomerCampaignPromotionItem, vietnameseSearchFilter } from '@mos-lab/shared';
import { CHANNELS } from '../constants';
import { getFixedPriceScopeLabel } from './bookingWizardHelpers';

const { TextArea } = Input;

export interface FixedPriceEligibilityNotice {
  id: number;
  isEligible: boolean;
  price: number;
  scopeLabel: string;
}

interface BookingWizardPromotionsAndNoteSectionProps {
  themeMode: 'light' | 'dark';
  colorText: string;
  customerCampaignPromotions: CustomerCampaignPromotionInfo[];
  visibleCustomerCampaignPromotions: CustomerCampaignPromotionInfo[];
  selectedCampaignPromotion: CustomerCampaignPromotionItem | null;
  onSelectCampaignPromotion: (promo: CustomerCampaignPromotionItem | null) => void;
  promotions: SafeAny[];
  selectedPromotion: SafeAny;
  onSelectPromotion: (promo: SafeAny) => void;
  fixedPriceEligibilityNotices: FixedPriceEligibilityNotice[];
  referralPhone: string;
  onChangeReferralPhone: (val: string) => void;
  selectedService: SafeAny;
  priceInfo: { original: number; discount: number; final: number };
  bookingChannel: string;
  onChangeBookingChannel: (val: string) => void;
  bookingNote: string;
  onChangeBookingNote: (val: string) => void;
}

export const BookingWizardPromotionsAndNoteSection: React.FC<BookingWizardPromotionsAndNoteSectionProps> = ({
  themeMode,
  colorText,
  customerCampaignPromotions,
  visibleCustomerCampaignPromotions,
  selectedCampaignPromotion,
  onSelectCampaignPromotion,
  promotions,
  selectedPromotion,
  onSelectPromotion,
  fixedPriceEligibilityNotices,
  referralPhone,
  onChangeReferralPhone,
  selectedService,
  priceInfo,
  bookingChannel,
  onChangeBookingChannel,
  bookingNote,
  onChangeBookingNote,
}) => {
  return (
    <>
      {/* Campaign Promotion Section (Ưu đãi chiến dịch) */}
      {visibleCustomerCampaignPromotions.length > 0 && (
        <div
          style={{
            padding: '14px',
            borderRadius: '10px',
            background: themeMode === 'dark' ? 'rgba(124, 58, 237, 0.12)' : '#f3e8ff',
            border: `1.5px solid ${themeMode === 'dark' ? '#7c3aed' : '#c084fc'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GiftOutlined style={{ color: '#9333ea', fontSize: '16px' }} />
              <span
                style={{
                  fontWeight: 'bold',
                  fontSize: '13px',
                  color: themeMode === 'dark' ? '#d8b4fe' : '#7e22ce',
                }}
              >
                ƯU ĐÃI CHIẾN DỊCH (CAMPAIGN PROMOTION)
              </span>
            </div>
            {selectedCampaignPromotion && (
              <Button
                type="link"
                size="small"
                danger
                onClick={() => onSelectCampaignPromotion(null)}
                style={{ padding: 0, height: 'auto', fontSize: '12px' }}
              >
                Bỏ chọn ưu đãi
              </Button>
            )}
          </div>

          {visibleCustomerCampaignPromotions.map((camp) => (
            <div key={camp.campaignId} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag color="purple" style={{ fontWeight: 'bold', fontSize: '11px', margin: 0 }}>
                  🎯 Chiến dịch: {camp.campaignName}
                </Tag>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {camp.promotions.map((promo) => {
                  const isSelected = selectedCampaignPromotion?.id === promo.id;
                  let badgeColor = 'purple';
                  if (
                    promo.type === 'PERCENT_DISCOUNT' ||
                    promo.type === 'FIXED_DISCOUNT' ||
                    promo.type === 'FIXED_FINAL_PRICE'
                  ) {
                    badgeColor = 'red';
                  } else if (promo.type === 'FREE_SERVICE') {
                    badgeColor = 'cyan';
                  } else if (promo.type === 'FREE_PRODUCT') {
                    badgeColor = 'green';
                  }

                  return (
                    <div
                      key={promo.id}
                      onClick={() => {
                        if (isSelected) {
                          onSelectCampaignPromotion(null);
                        } else {
                          onSelectCampaignPromotion(promo);
                          onSelectPromotion(null);
                        }
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isSelected
                          ? themeMode === 'dark'
                            ? '#581c87'
                            : '#e9d5ff'
                          : themeMode === 'dark'
                            ? '#1e1b4b'
                            : '#ffffff',
                        border: `1.5px solid ${isSelected ? '#9333ea' : themeMode === 'dark' ? '#3730a3' : '#e9d5ff'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <Tag color={badgeColor} style={{ fontWeight: 'bold', fontSize: '11px', margin: 0 }}>
                          {promo.label}
                        </Tag>
                        <span
                          style={{
                            fontSize: '12.5px',
                            fontWeight: isSelected ? 'bold' : 'normal',
                            color: colorText,
                          }}
                        >
                          {promo.name}
                        </span>
                      </div>
                      {isSelected && (
                        <Tag color="success" style={{ margin: 0, fontSize: '10px', fontWeight: 'bold' }}>
                          ✓ Đã chọn
                        </Tag>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Promotion & Referral Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>🎟️ CHỌN KHUYẾN MÃI (PROMOTION)</h4>
          <Select
            showSearch
            allowClear
            filterOption={vietnameseSearchFilter}
            style={{ width: '100%' }}
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
            placeholder="Chọn chương trình khuyến mãi (nếu có)..."
            value={selectedCampaignPromotion ? `CAMP_${selectedCampaignPromotion.id}` : selectedPromotion?.id}
            onChange={(val) => {
              if (!val) {
                onSelectPromotion(null);
                onSelectCampaignPromotion(null);
                return;
              }
              if (typeof val === 'string' && val.startsWith('CAMP_')) {
                const campPromoId = parseInt(val.replace('CAMP_', ''), 10);
                let foundCampPromo: CustomerCampaignPromotionItem | null = null;
                for (const camp of customerCampaignPromotions) {
                  const match = camp.promotions.find((p) => p.id === campPromoId);
                  if (match) {
                    foundCampPromo = match;
                    break;
                  }
                }
                if (foundCampPromo) {
                  onSelectCampaignPromotion(foundCampPromo);
                  onSelectPromotion(null);
                }
              } else {
                const promo = promotions.find((p) => p.id === val);
                onSelectPromotion(promo || null);
                onSelectCampaignPromotion(null);
              }
            }}
            options={[
              ...visibleCustomerCampaignPromotions.flatMap((camp) =>
                camp.promotions.map((p) => {
                  let valText = '';
                  if (p.type === 'PERCENT_DISCOUNT') valText = ` (Giảm ${p.value}%)`;
                  else if (p.type === 'FIXED_DISCOUNT') valText = ` (Giảm ${p.value.toLocaleString('vi-VN')}đ)`;
                  else if (p.type === 'FIXED_FINAL_PRICE') {
                    valText = ` (Thanh toán ${p.value.toLocaleString('vi-VN')}đ · ${getFixedPriceScopeLabel(p)})`;
                  }
                  return {
                    value: `CAMP_${p.id}`,
                    label: `🎯 [Ưu đãi Chiến dịch: ${camp.campaignName}] ${p.label}${valText}`,
                  };
                })
              ),
              ...promotions.map((p) => ({
                value: p.id,
                label:
                  p.discountPercentage > 0
                    ? `${p.name} (Giảm ${p.discountPercentage}%)`
                    : p.discountAmount > 0
                      ? `${p.name} (Giảm ${p.discountAmount.toLocaleString('vi-VN')}đ)`
                      : p.name,
              })),
            ]}
          />
          {fixedPriceEligibilityNotices.map((notice) => (
            <div
              key={notice.id}
              style={{
                marginTop: '7px',
                fontSize: '11px',
                color: notice.isEligible ? (themeMode === 'dark' ? '#86efac' : '#15803d') : '#fa8c16',
              }}
            >
              {notice.isEligible
                ? `✓ Dịch vụ đang chọn đủ điều kiện Đồng giá ${notice.price.toLocaleString('vi-VN')}đ (${notice.scopeLabel}).`
                : `Đồng giá ${notice.price.toLocaleString('vi-VN')}đ chỉ áp dụng cho ${notice.scopeLabel}; dịch vụ đang chọn không thuộc phạm vi.`}
            </div>
          ))}
        </div>

        <div>
          <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
            👥 MÃ GIỚI THIỆU (SĐT NGƯỜI GIỚI THIỆU)
          </h4>
          <Input
            placeholder="Nhập số điện thoại của khách giới thiệu (nếu có)..."
            value={referralPhone}
            onChange={(e) => onChangeReferralPhone(e.target.value)}
          />
        </div>
      </div>

      {/* Price Calculation details */}
      {selectedService && selectedService.id !== 0 && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: themeMode === 'dark' ? '#1e293b' : '#f8fafc',
            border: `1px solid ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888' }}>Giá gốc dịch vụ:</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{priceInfo.original.toLocaleString('vi-VN')}đ</span>
          </div>
          {priceInfo.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fa8c16' }}>
              <span>
                Giảm giá (
                {selectedCampaignPromotion
                  ? `${selectedCampaignPromotion.name} - ${selectedCampaignPromotion.label}`
                  : selectedPromotion?.name}
                ):
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>-{priceInfo.discount.toLocaleString('vi-VN')}đ</span>
            </div>
          )}
          {selectedCampaignPromotion?.type === 'FIXED_FINAL_PRICE' && (
            <div style={{ color: themeMode === 'dark' ? '#c4b5fd' : '#7e22ce', fontSize: '12px' }}>
              Đồng giá {Math.round(selectedCampaignPromotion.value).toLocaleString('vi-VN')}đ là giá thanh toán cuối
              cùng cho {getFixedPriceScopeLabel(selectedCampaignPromotion)}.
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              fontSize: '14px',
              borderTop: `1px dashed ${themeMode === 'dark' ? '#334155' : '#e2e8f0'}`,
              paddingTop: '4px',
              marginTop: '2px',
            }}
          >
            <span style={{ color: themeMode === 'dark' ? '#fff' : '#1f2937' }}>Giá thanh toán tạm tính:</span>
            <span style={{ color: '#52c41a', fontVariantNumeric: 'tabular-nums' }}>
              {priceInfo.final.toLocaleString('vi-VN')}đ
            </span>
          </div>
        </div>
      )}

      {/* Select Channels & Booking Note */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
            KÊNH TIẾP NHẬN ĐẶT LỊCH (BOOKING CHANNEL)
          </h4>
          <Radio.Group
            value={bookingChannel}
            onChange={(e) => onChangeBookingChannel(e.target.value)}
            buttonStyle="solid"
          >
            {CHANNELS.map((ch) => (
              <Radio.Button
                key={ch.key}
                value={ch.key}
                style={{ marginBottom: '8px', marginRight: '8px', borderRadius: '4px' }}
              >
                {ch.key}
              </Radio.Button>
            ))}
          </Radio.Group>
        </div>

        <div>
          <h4 style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>GHI CHÚ ĐẶT LỊCH (BOOKING NOTE)</h4>
          <TextArea
            rows={3}
            placeholder="Nhập các ghi chú đặc biệt từ khách hàng hoặc thay đổi đặt lịch..."
            value={bookingNote}
            onChange={(e) => onChangeBookingNote(e.target.value)}
          />
        </div>
      </div>
    </>
  );
};
