'use client';

import React, { useMemo } from 'react';
import { Camera, Columns2, Eye, FileText, MapPin, Sparkles, User } from 'lucide-react';
import type {
  IosBookingItem,
  IosBookingProgress,
  IosCustomerHistoryLashSpec,
  IosCustomerHistoryVisitItem,
  LashHistoryPhoto,
} from '@mos-lab/shared';
import { getLocalProgressSnapshot } from '../../../state/offlineSync';
import type { LashPhotoComparePayload } from './LashPhotoCompareLightbox';

interface CustomerLashPortfolioTabProps {
  booking: Partial<IosBookingItem> & Pick<IosBookingItem, 'id' | 'customerName'>;
  visits: IosCustomerHistoryVisitItem[];
  isLoading: boolean;
  isDark: boolean;
  customerFacingMode?: boolean;
  onOpenLightbox: (payload: LashPhotoComparePayload) => void;
}

function isUsableUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  return Boolean(trimmed) && !trimmed.startsWith('DECLINED:');
}

function buildLivePhotos(
  src: { before?: unknown; cleaned?: unknown; after?: unknown },
  fallback?: LashHistoryPhoto[]
): LashHistoryPhoto[] {
  const fromSrc: LashHistoryPhoto[] = [];
  if (isUsableUrl(src.before)) fromSrc.push({ type: 'before', label: '1. Before · Mắt mộc', url: src.before });
  if (isUsableUrl(src.cleaned)) fromSrc.push({ type: 'cleaned', label: '2. Cleaning · Vệ sinh', url: src.cleaned });
  if (isUsableUrl(src.after)) fromSrc.push({ type: 'after', label: '3. After · Hoàn thiện', url: src.after });
  if (fromSrc.length > 0) return fromSrc;
  return (fallback || []).filter((p) => isUsableUrl(p.url));
}

function SpecBadgesRow({ spec, isDark }: { spec: IosCustomerHistoryLashSpec; isDark: boolean }) {
  const chips = [
    spec.style ? { k: 'Dáng', v: spec.style } : null,
    spec.curl ? { k: 'Cong', v: spec.curl.replace(/^Cong\s+/i, '') } : null,
    spec.thickness ? { k: 'Dày', v: spec.thickness } : null,
    spec.length ? { k: 'Dài', v: spec.length } : null,
    spec.strandCount ? { k: 'Sợi', v: spec.strandCount } : null,
    spec.fan ? { k: 'Fan', v: spec.fan } : null,
    spec.color ? { k: 'Màu', v: spec.color } : null,
    spec.retainLeft !== null &&
    spec.retainLeft !== undefined &&
    spec.retainRight !== null &&
    spec.retainRight !== undefined
      ? { k: 'Retain', v: `T${spec.retainLeft} · P${spec.retainRight}` }
      : null,
  ].filter(Boolean) as Array<{ k: string; v: string }>;

  if (chips.length === 0) return null;
  return (
    <div className="space-y-1">
      {spec.serviceName && (
        <div className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {spec.isUnder ? 'Mi dưới: ' : ''}
          {spec.serviceName}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span
            key={`${c.k}-${c.v}`}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10.5px] font-semibold tabular-nums ${
              isDark
                ? 'border-slate-700/80 bg-slate-800/80 text-slate-200'
                : 'border-slate-200 bg-slate-50 text-slate-800'
            }`}
          >
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{c.k}:</span>
            <strong className={isDark ? 'text-amber-300' : 'text-amber-700'}>{c.v}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function ThreePhotoStrip({
  photos,
  isDark,
  title,
  underPhotos,
  round,
  subtitle,
  onOpenLightbox,
}: {
  photos: LashHistoryPhoto[];
  isDark: boolean;
  title: string;
  underPhotos?: LashHistoryPhoto[];
  round: 'UPPER' | 'UNDER';
  subtitle?: string;
  onOpenLightbox: (payload: LashPhotoComparePayload) => void;
}) {
  const before = photos.find((p) => p.type === 'before');
  const cleaned = photos.find((p) => p.type === 'cleaned');
  const after = photos.find((p) => p.type === 'after');
  const slots: Array<{ type: 'before' | 'cleaned' | 'after'; label: string; badge: string; photo?: LashHistoryPhoto }> =
    [
      { type: 'before', label: '1. Before', badge: 'bg-amber-400 text-black', photo: before },
      { type: 'cleaned', label: '2. Cleaning', badge: 'bg-sky-500 text-white', photo: cleaned },
      { type: 'after', label: '3. After', badge: 'bg-emerald-500 text-slate-950', photo: after },
    ];

  return (
    <div className="space-y-1.5">
      {before && after && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() =>
              onOpenLightbox({
                title,
                subtitle,
                photos: round === 'UNDER' ? [] : photos,
                underPhotos: round === 'UNDER' ? photos : underPhotos,
                initialRound: round,
                initialStage: 'COMPARE',
              })
            }
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold cursor-pointer transition-colors ${
              isDark
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <Columns2 className="h-3 w-3" />
            <span>So sánh Before / After</span>
          </button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-1.5">
        {slots.map((slot) => (
          <div
            key={slot.type}
            onClick={() => {
              if (!slot.photo) return;
              onOpenLightbox({
                title,
                subtitle,
                photos: round === 'UNDER' ? underPhotos || photos : photos,
                underPhotos: round === 'UNDER' ? photos : underPhotos,
                initialRound: round,
                initialStage: slot.type,
              });
            }}
            className={`relative aspect-[4/3] overflow-hidden rounded-xl border ${
              slot.photo ? 'cursor-pointer group' : 'opacity-65'
            } ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-100'}`}
          >
            {slot.photo ? (
              <img
                src={slot.photo.url}
                alt={slot.label}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[9.5px] font-medium text-slate-400">
                Chưa có
              </div>
            )}
            <span
              className={`absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[9px] font-black leading-none shadow-xs ${slot.badge}`}
            >
              {slot.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomerLashPortfolioTab({
  booking,
  visits,
  isLoading,
  isDark,
  customerFacingMode = false,
  onOpenLightbox,
}: CustomerLashPortfolioTabProps) {
  const localSnap = useMemo(
    () => (booking.id > 0 ? (getLocalProgressSnapshot(booking.id) as Partial<IosBookingProgress> | null) : null),
    [booking.id]
  );

  const todayVisit = useMemo(
    () => (booking.id > 0 ? visits.find((v) => Number(v.orderId) === Number(booking.id)) : undefined),
    [visits, booking.id]
  );

  const todayUpperPhotos = useMemo(
    () =>
      buildLivePhotos(
        {
          before: booking.progress?.beforePhotoUrl || localSnap?.beforePhotoUrl,
          cleaned: booking.progress?.cleanedPhotoUrl || localSnap?.cleanedPhotoUrl,
          after: booking.progress?.afterPhotoUrl || localSnap?.afterPhotoUrl,
        },
        todayVisit?.photos
      ),
    [booking.progress, localSnap, todayVisit?.photos]
  );

  const todayUnderPhotos = useMemo(
    () =>
      buildLivePhotos(
        {
          before: booking.progress?.underBeforePhotoUrl || localSnap?.underBeforePhotoUrl,
          cleaned: booking.progress?.underCleanedPhotoUrl || localSnap?.underCleanedPhotoUrl,
          after: booking.progress?.underAfterPhotoUrl || localSnap?.underAfterPhotoUrl,
        },
        todayVisit?.underPhotos
      ),
    [booking.progress, localSnap, todayVisit?.underPhotos]
  );

  const todayVisitSpec = todayVisit?.lashSpecs?.[0];
  const todaySpec: IosCustomerHistoryLashSpec | null = useMemo(() => {
    if (todayVisitSpec) return todayVisitSpec;
    const attrs = booking.attributes;
    const prog = booking.progress;
    if (!attrs) return null;
    return {
      style: attrs.style || null,
      curl: attrs.curl || null,
      thickness: attrs.thickness || null,
      length: attrs.length || null,
      strandCount: attrs.count || null,
      fan: attrs.volume || null,
      retainLeft: prog?.retainLashCountLeft ?? null,
      retainRight: prog?.retainLashCountRight ?? null,
    };
  }, [booking.attributes, booking.progress, todayVisitSpec]);

  const historicalVisits = useMemo(() => {
    if (visits.length > 0) {
      return todayUpperPhotos.length > 0 || todayUnderPhotos.length > 0
        ? visits.filter((v) => Number(v.orderId) !== Number(booking.id))
        : visits;
    }
    return (booking.lashHistory || []).map((h, idx) => ({
      orderId: h.orderId || 900000 + idx,
      orderNumber: h.orderId ? `#${h.orderId}` : `#LS-${idx + 1}`,
      bookingDateStart: h.date,
      dateDisplay: h.date,
      timeDisplay: '',
      daysAgoLabel: h.date,
      orderState: 'Completed',
      statusLabel: 'Hoàn thành',
      statusTone: 'completed' as const,
      serviceName: h.serviceName,
      services: [],
      isFixOrder: false,
      bookingNote: h.bookingNote || null,
      branchId: null,
      branchName: booking.branchName || 'Wings Store',
      staffNames: h.staffName ? [h.staffName] : [],
      staffAvatars: [],
      diamondEarned: 0,
      diamondUsed: 0,
      totalPrice: h.totalPrice || 0,
      paidAmount: h.totalPrice || 0,
      discountAmount: 0,
      prepaidAmount: 0,
      debtAmount: 0,
      tipAmount: 0,
      paymentMethodLabel: '',
      photos: h.photos,
      underPhotos: h.underPhotos,
      underServiceName: h.underServiceName || null,
      lashSpecs: h.attributes
        ? [
            {
              style: h.attributes.style || null,
              curl: h.attributes.curl || null,
              length: h.attributes.length || null,
              thickness: h.attributes.thickness || null,
              strandCount: h.attributes.fanCount || null,
            },
          ]
        : undefined,
    }));
  }, [visits, booking.id, booking.lashHistory, booking.branchName, todayUpperPhotos.length, todayUnderPhotos.length]);

  const hasTodayPhotos = todayUpperPhotos.length > 0 || todayUnderPhotos.length > 0;
  const todayBefore = todayUpperPhotos.find((p) => p.type === 'before');
  const todayAfter = todayUpperPhotos.find((p) => p.type === 'after');

  return (
    <div className="space-y-3.5" data-testid="customer-lash-portfolio-tab">
      {/* Section 1: Ca hôm nay */}
      <div
        className={`rounded-2xl border p-3.5 space-y-2.5 ${
          hasTodayPhotos
            ? isDark
              ? 'border-emerald-500/40 bg-emerald-950/20'
              : 'border-emerald-200 bg-emerald-50/50'
            : isDark
              ? 'border-slate-800 bg-slate-900/75'
              : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Camera className={`h-4 w-4 shrink-0 ${hasTodayPhotos ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="truncate text-[11.5px] font-black uppercase tracking-wider">
              {hasTodayPhotos ? 'Ảnh Bộ Mi Ca Hôm Nay' : 'Thông Số Dự Kiến Hôm Nay'}
            </span>
          </div>
          {(booking.serviceName || todayVisit?.serviceName) && (
            <span
              className={`truncate max-w-[180px] rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isDark ? 'bg-slate-800 text-amber-300' : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {booking.serviceName || todayVisit?.serviceName}
            </span>
          )}
        </div>

        {/* Hero Before & After Comparison when both captured */}
        {todayBefore && todayAfter && (
          <div
            onClick={() =>
              onOpenLightbox({
                title: `Hôm nay · ${booking.customerName}`,
                subtitle: booking.serviceName || todayVisit?.serviceName,
                photos: todayUpperPhotos,
                underPhotos: todayUnderPhotos,
                initialRound: 'UPPER',
                initialStage: 'COMPARE',
              })
            }
            className="grid grid-cols-2 gap-2 cursor-pointer"
          >
            {[
              { tag: 'BEFORE', url: todayBefore.url, cls: 'bg-amber-400 text-black' },
              { tag: 'AFTER', url: todayAfter.url, cls: 'bg-emerald-500 text-slate-950' },
            ].map((pane) => (
              <div
                key={pane.tag}
                className={`relative aspect-[4/3] overflow-hidden rounded-xl border ${
                  isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-100'
                }`}
              >
                <img src={pane.url} alt={pane.tag} className="h-full w-full object-cover" />
                <span
                  className={`absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[9.5px] font-black ${pane.cls}`}
                >
                  {pane.tag}
                </span>
              </div>
            ))}
          </div>
        )}

        {todayUpperPhotos.length > 0 && (
          <ThreePhotoStrip
            photos={todayUpperPhotos}
            underPhotos={todayUnderPhotos}
            round="UPPER"
            isDark={isDark}
            title={`Hôm nay · ${booking.customerName}`}
            subtitle={booking.serviceName || undefined}
            onOpenLightbox={onOpenLightbox}
          />
        )}

        {todayUnderPhotos.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-white/10">
            <div className="text-[10px] font-black uppercase text-emerald-400">Mi Dưới (Vòng 2)</div>
            <ThreePhotoStrip
              photos={todayUnderPhotos}
              underPhotos={todayUnderPhotos}
              round="UNDER"
              isDark={isDark}
              title={`Hôm nay (Mi Dưới) · ${booking.customerName}`}
              subtitle={booking.serviceName || undefined}
              onOpenLightbox={onOpenLightbox}
            />
          </div>
        )}

        {todaySpec && <SpecBadgesRow spec={todaySpec} isDark={isDark} />}

        {!customerFacingMode && booking.customerNote && (
          <div
            className={`flex items-start gap-1.5 rounded-xl border p-2.5 text-[11.5px] leading-snug ${
              isDark
                ? 'border-amber-500/30 bg-amber-950/25 text-amber-100'
                : 'border-amber-200 bg-amber-50 text-amber-950'
            }`}
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-0.5" />
            <span>{booking.customerNote}</span>
          </div>
        )}
      </div>

      {/* Section 2: Lịch sử bộ mi & 3 ảnh các lần trước */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <span
            className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
          >
            <Eye className="h-3.5 w-3.5 text-amber-400" />
            <span>Bộ Mi & 3 Ảnh Các Lần Ghé Trước ({historicalVisits.length})</span>
          </span>
        </div>

        {isLoading && historicalVisits.length === 0 ? (
          <div className="h-24 animate-pulse rounded-2xl border border-slate-700/40 bg-slate-900/40" />
        ) : historicalVisits.length === 0 ? (
          <div
            className={`rounded-2xl border p-5 text-center text-xs ${
              isDark ? 'border-slate-800 bg-slate-900/50 text-slate-400' : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <Sparkles className="mx-auto mb-1.5 h-5 w-5 text-amber-400" />
            Chưa có dữ liệu bộ mi các lần ghé trước.
          </div>
        ) : (
          historicalVisits.map((v, idx) => {
            const visitPhotos = (v.photos || []).filter((p) => isUsableUrl(p.url));
            const visitUnderPhotos = (v.underPhotos || []).filter((p) => isUsableUrl(p.url));
            const safeStaffNames = Array.isArray(v.staffNames) ? v.staffNames : [];
            const lightboxSubtitle = customerFacingMode ? v.branchName : safeStaffNames.join(', ') || v.branchName;
            return (
              <div
                key={`lash-visit-${v.orderId}-${idx}`}
                data-testid={`lash-portfolio-visit-${v.orderId}`}
                className={`rounded-2xl border p-3.5 space-y-2.5 ${
                  isDark ? 'border-slate-800 bg-slate-900/75' : 'border-slate-200 bg-white shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-amber-400 tabular-nums">{v.dateDisplay}</span>
                      {v.daysAgoLabel && v.daysAgoLabel !== v.dateDisplay && (
                        <span className={`text-[10.5px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          · {v.daysAgoLabel}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[13.5px] font-extrabold leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}
                    >
                      {v.serviceName}
                    </div>
                  </div>
                  {!customerFacingMode && safeStaffNames.length > 0 && (
                    <span
                      className={`inline-flex items-center gap-1 text-[10.5px] font-semibold shrink-0 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
                    >
                      <User className="h-3 w-3 opacity-70" />
                      {safeStaffNames[0]}
                    </span>
                  )}
                </div>

                {v.lashSpecs && v.lashSpecs.length > 0 && (
                  <div className="space-y-1.5">
                    {v.lashSpecs.map((sp, sIdx) => (
                      <SpecBadgesRow key={sIdx} spec={sp} isDark={isDark} />
                    ))}
                  </div>
                )}

                {visitPhotos.length > 0 ? (
                  <ThreePhotoStrip
                    photos={visitPhotos}
                    underPhotos={visitUnderPhotos}
                    round="UPPER"
                    isDark={isDark}
                    title={`${v.dateDisplay} · ${v.serviceName}`}
                    subtitle={lightboxSubtitle}
                    onOpenLightbox={onOpenLightbox}
                  />
                ) : (
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10.5px] font-medium ${
                      isDark ? 'bg-slate-800/70 text-slate-400' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <MapPin className="h-3 w-3 opacity-70" />
                    <span>Đơn lịch sử không đính kèm ảnh tại {v.branchName}</span>
                  </div>
                )}

                {visitUnderPhotos.length > 0 && (
                  <div className="space-y-1 pt-1.5 border-t border-white/10">
                    <div className="text-[10px] font-black uppercase text-emerald-400">
                      {v.underServiceName || 'Mi Dưới (Vòng 2)'}
                    </div>
                    <ThreePhotoStrip
                      photos={visitUnderPhotos}
                      underPhotos={visitUnderPhotos}
                      round="UNDER"
                      isDark={isDark}
                      title={`${v.dateDisplay} · ${v.underServiceName || 'Mi Dưới'}`}
                      subtitle={lightboxSubtitle}
                      onOpenLightbox={onOpenLightbox}
                    />
                  </div>
                )}

                {!customerFacingMode && v.bookingNote && (
                  <div
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] leading-snug ${
                      isDark ? 'bg-slate-800/70 text-slate-300' : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    {v.bookingNote}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
