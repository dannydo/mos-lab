import { describe, expect, it } from 'vitest';
import type { BookingItem } from '../../../state/mockData';
import { formatLashSpecLine, getLashDetailSpecs } from '../incoming/incomingBookingHelpers';
import { parseDaysSinceLastVisit, resolveCustomerTypeMeta } from '../LashMaterialConstraintMatrix';

type MakeBookingInput = Omit<Partial<BookingItem>, 'attributes'> & {
  attributes?: Partial<NonNullable<BookingItem['attributes']>>;
};

function makeBooking(partial: MakeBookingInput): BookingItem {
  const { attributes, ...rest } = partial;
  return {
    id: 806834,
    orderNumber: 'BK-806834',
    customerName: 'Ngoan',
    customerPhone: '0909.123.456',
    customerId: 50123,
    customerVisits: 3,
    customerNote: '9/ 11 chị book, AM 50% tặng 3 chị đi',
    timeSlot: '15:00 - 16:30',
    time12h: '03:00 pm',
    serviceName: 'Any - Lashes',
    serviceType: 'Normal',
    servicePrice: 770000,
    serviceDuration: 90,
    customerTypeIcon: '↻',
    hasDiscountTag: false,
    assignedStaffName: 'Khanh Cao',
    assignedStaffId: 13783,
    assignedBed: 'Giường 01',
    status: 'INCOMING',
    comboLiveStatus: {
      isComboLive: false,
      remainingSessions: 0,
      comboName: '',
      upsellOpportunity: true,
    },
    lashHistory: [],
    ...rest,
    attributes: attributes
      ? {
          style: 'Natural',
          curl: 'C',
          length: '10-12',
          thickness: '0.10',
          ...attributes,
        }
      : undefined,
  };
}

describe('formatLashSpecLine & getLashDetailSpecs — Canonical Wings Nối Mới SKU PriceCode', () => {
  it('never produces Classic 1D 770 70 even if serviceName/servicePrice had 770 or Retain 280', () => {
    const poisonedWith770 = makeBooking({
      serviceName: 'New Flawless Mink 770',
      servicePrice: 770000,
      attributes: {
        material: 'New Classic',
        volume: '1D',
        count: '70 sợi',
      },
    });
    expect(formatLashSpecLine(poisonedWith770)).toBe('Classic 1D 440 70');
    expect(getLashDetailSpecs(poisonedWith770)).toMatchObject({
      material: 'Classic',
      volume: '1D',
      price: '440.000đ',
      count: '70 sợi',
    });

    const consultationNewClassic1D = makeBooking({
      serviceName: 'Dặm New Classic 1D 280K (70 sợi)',
      serviceType: 'Retain',
      servicePrice: 280000,
      attributes: {
        material: 'New Classic 1D',
        volume: '1D',
        count: '70 sợi',
      },
    });
    expect(formatLashSpecLine(consultationNewClassic1D)).toBe('Classic 1D 440 70');

    const retainWithoutAttrs = makeBooking({
      serviceName: 'New Classic 1D 280K (70 sợi)',
      servicePrice: 280000,
      attributes: { style: 'Doll', curl: 'C' },
    });
    expect(formatLashSpecLine(retainWithoutAttrs)).toBe('Classic 1D 440 70');
  });

  it('maps every Classic 1D fiber count to its exact Nối Mới SKU code (390/440/550/660/880)', () => {
    expect(
      formatLashSpecLine(makeBooking({ attributes: { material: 'Classic', volume: '1D', count: '60 sợi' } }))
    ).toBe('Classic 1D 390 60');
    expect(
      formatLashSpecLine(makeBooking({ attributes: { material: 'Classic', volume: '1D', count: '70 sợi' } }))
    ).toBe('Classic 1D 440 70');
    expect(
      formatLashSpecLine(makeBooking({ attributes: { material: 'Classic', volume: '1D', count: '90 sợi' } }))
    ).toBe('Classic 1D 550 90');
    expect(
      formatLashSpecLine(makeBooking({ attributes: { material: 'Classic', volume: '1D', count: '110 sợi' } }))
    ).toBe('Classic 1D 660 110');
    expect(
      formatLashSpecLine(makeBooking({ attributes: { material: 'Classic', volume: '1D', count: '130 sợi' } }))
    ).toBe('Classic 1D 880 130');
  });

  it('maps Flawless Mink, HyperLight, Ivylight, and UltraLight to exact Nối Mới SKU codes', () => {
    expect(formatLashSpecLine(makeBooking({ serviceName: 'New Flawless Mink 770', attributes: {} }))).toBe(
      'Flawless Mink 1D 770 60'
    );
    expect(
      formatLashSpecLine(makeBooking({ attributes: { material: 'New Flawless Mink', volume: '1D', count: '70 sợi' } }))
    ).toBe('Flawless Mink 1D 880 70');
    expect(
      formatLashSpecLine(makeBooking({ attributes: { material: 'HyperLight', volume: '2X', count: '70 fan' } }))
    ).toBe('HyperLight 2X 550 70');
    expect(
      formatLashSpecLine(makeBooking({ attributes: { material: 'HyperLight', volume: '4X', count: '70 fan' } }))
    ).toBe('HyperLight 4X 770 70');
    expect(
      formatLashSpecLine(makeBooking({ attributes: { material: 'HyperLight', volume: '5X', count: '50 fan' } }))
    ).toBe('HyperLight 5X 770 50');
    expect(
      formatLashSpecLine(makeBooking({ attributes: { material: 'HyperLight', volume: '5X', count: '90 fan' } }))
    ).toBe('HyperLight 5X 1220 90');
    expect(
      formatLashSpecLine(makeBooking({ attributes: { material: 'Ivylight Thiết Kế', volume: '4ℓ', count: '90 nhịp' } }))
    ).toBe('Ivylight 4L 1220 90');
    expect(
      formatLashSpecLine(makeBooking({ attributes: { material: 'UltraLight', volume: '4D', count: '80 fan' } }))
    ).toBe('UltraLight 4D 770 80');
  });

  it('classifies returning clients accurately and computes daysSinceLastVisit against the viewing date', () => {
    const minhHang = makeBooking({
      id: 336925,
      customerName: 'Minh Hằng',
      customerVisits: 11,
      lastVisitDate: '22/01/2025',
      lashHistory: [{ date: '22/01/2025', serviceName: 'New Flawless Mink 880', staffName: 'Trang Vũ' }],
    });
    expect(resolveCustomerTypeMeta(minhHang)).toMatchObject({
      symbol: '↻',
      label: 'Khách quay lại',
    });
    expect(parseDaysSinceLastVisit(minhHang.lastVisitDate, '13/11/2026')).toBe(660);

    // Even if customerVisits was under-reported as 1, prior lashHistory prevents false ✦ first-visit classification
    expect(
      resolveCustomerTypeMeta({
        customerVisits: 1,
        lashHistory: [{ date: '22/01/2025', serviceName: 'New Flawless Mink 880' }],
      })
    ).toMatchObject({
      symbol: '↻',
      label: 'Khách quay lại',
    });

    // True 1st-visit client with no history gets ✦
    expect(resolveCustomerTypeMeta({ customerVisits: 1, lashHistory: [] })).toMatchObject({
      symbol: '✦',
      label: 'Khách mới lần đầu',
    });
  });
});
