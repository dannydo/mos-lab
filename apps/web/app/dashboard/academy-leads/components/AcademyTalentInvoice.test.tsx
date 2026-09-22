import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AcademyTalentInvoice } from './AcademyTalentInvoice';
import type { AcademyTalentAssessmentView, AcademyTalentLead } from './academy-talent-workshop.types';

const readCss = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');

describe('AcademyTalentInvoice - Vietnamese Typography & Windows Diacritics Invariant', () => {
  const mockLead: AcademyTalentLead = {
    id: 101,
    name: 'Nguyễn Thị Thuý',
    phone: '0901234567',
    email: 'thuy.nguyen@example.com',
    course: 'Khóa Chuyên Nghiệp',
    owner: null,
    avatarUrl: null,
  };

  const mockAssessment: AcademyTalentAssessmentView = {
    id: 42,
    createdAt: '2026-09-22T08:00:00Z',
    updatedAt: '2026-09-22T08:00:00Z',
    sessionNumber: 1,
    status: 'ISSUED',
    draft: {
      eyeScore: 9,
      handScore: 9,
      strands5Min: 45,
      errors: { skin: 0, root: 0, stickies: 0, direction: 0 },
      selectedCourseIds: [1],
      selectedSampleCourseIds: [],
      selectedKitCourseIds: [],
      selectedInstructorIdsByCourse: {},
      primaryCourseId: 1,
      paymentMode: 'DEPOSIT',
      depositVnd: 2000000,
      note: null,
    },
    result: {
      rankKey: 'level5',
      rankLabel: 'Ngôi Sao Triển Vọng',
      resultTitle: 'Xuất sắc',
      resultSummary: 'Đạt chuẩn đầu vào',
      eligibleForScholarship: true,
      scholarshipPct: 30,
      totalErrors: 0,
      levels: [],
      recommendedCourseIds: [1],
    },
    pricing: {
      currency: 'VND',
      expiresAt: '2026-09-30T23:59:59Z',
      lineItems: [
        {
          courseId: 1,
          name: 'Khóa Nối Mi Chuyên Nghiệp Master',
          listPriceVnd: 15000000,
          promoPriceVnd: 15000000,
          scholarshipVnd: 4500000,
          finalPriceVnd: 10500000,
          instructor: {
            id: 1,
            code: 'mai',
            staffId: null,
            displayName: 'Cô Mai',
            description: null,
            avatarUrl: null,
            surchargePercent: 0,
            isActive: true,
            sortOrder: 0,
          },
          instructorSurchargeVnd: 0,
        },
      ],
      addOnItems: [],
      listTotalVnd: 15000000,
      promoTotalVnd: 15000000,
      scholarshipVnd: 4500000,
      courseScholarshipVnd: 4500000,
      sampleScholarshipVnd: 0,
      kitScholarshipVnd: 0,
      materialRewardPct: 0,
      sampleRewardPct: 0,
      kitRewardPct: 0,
      finalTotalVnd: 10500000,
      courseFinalTotalVnd: 10500000,
      sampleFinalTotalVnd: 0,
      kitFinalTotalVnd: 0,
      teacherSurchargeVnd: 0,
      suggestedDepositVnd: 2000000,
      dueNowVnd: 2000000,
    },
    payment: {
      status: 'PARTIALLY_PAID',
      payments: [],
      totalPaidVnd: 0,
      remainingVnd: 8500000,
    },
    invoice: {
      invoiceNumber: 'ACADEMY-2026-0042',
      issuedAt: '2026-09-22T08:00:00Z',
      paymentMode: 'DEPOSIT',
      dueNowVnd: 2000000,
      printedAt: null,
      note: null,
    },
  };

  it('renders invoice bill headings with intact Vietnamese text', () => {
    render(<AcademyTalentInvoice lead={mockLead} assessment={mockAssessment} />);

    // Heading "Giữ suất học bổng của bạn hôm nay." (Reported in MOS-BUG-33 Screenshot 2)
    const heading2 = screen.getByRole('heading', { level: 2 });
    expect(heading2.textContent).toContain('Giữ suất học bổng');
    expect(heading2.textContent).toContain('của bạn hôm nay.');

    // Heading "Quét đúng số tiền cần thanh toán." (Reported in MOS-BUG-33 Screenshot 3)
    const heading3 = screen.getByRole('heading', { level: 3, name: /Quét đúng số tiền cần thanh toán/i });
    expect(heading3).toBeInTheDocument();
    expect(heading3.textContent).toBe('Quét đúng số tiền cần thanh toán.');
  });

  it('prohibits Georgia font on invoice bill headings to prevent Windows diacritic gap bugs', () => {
    const css = readCss('./AcademyTalentWorkshop.module.css');

    // Extract invoiceHeader and invoicePaymentFocusHead definitions
    const invoiceHeaderMatch = css.match(/\.invoiceHeader h2\s*\{[^}]*\}/);
    expect(invoiceHeaderMatch, 'invoiceHeader h2 rule must exist').toBeTruthy();
    expect(
      invoiceHeaderMatch![0],
      'Georgia must NOT be used for .invoiceHeader h2 because Windows Georgia lacks Vietnamese compound accents'
    ).not.toContain('Georgia');
    expect(invoiceHeaderMatch![0]).toContain("'Times New Roman'");

    const invoicePaymentFocusHeadMatch = css.match(/\.invoicePaymentFocusHead h3\s*\{[^}]*\}/);
    expect(invoicePaymentFocusHeadMatch, 'invoicePaymentFocusHead h3 rule must exist').toBeTruthy();
    expect(
      invoicePaymentFocusHeadMatch![0],
      'Georgia must NOT be used for .invoicePaymentFocusHead h3 because Windows Georgia lacks Vietnamese compound accents'
    ).not.toContain('Georgia');
    expect(invoicePaymentFocusHeadMatch![0]).toContain("'Times New Roman'");

    // Follow-up payment slip header
    const followUpSlipMatch = css.match(/\.followUpPaymentSlipHeader h2\s*\{[^}]*\}/);
    expect(followUpSlipMatch, 'followUpPaymentSlipHeader h2 rule must exist').toBeTruthy();
    expect(followUpSlipMatch![0]).not.toContain('Georgia');
    expect(followUpSlipMatch![0]).toContain("'Times New Roman'");
  });
});
