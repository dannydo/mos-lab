import { describe, expect, it } from "vitest";
import type { AcademyCourse } from "@mos-lab/shared";
import { buildCourseOptions } from "./lead-manager.helpers";

describe("buildCourseOptions", () => {
  const sampleCourses: AcademyCourse[] = [
    {
      id: 1,
      code: "combo",
      name: "Combo 4 Khóa Nối Mi Bóng Tối Chuyên Nghiệp",
      nameEn: "Full Professional Combo",
      tag: "COMBO PRO",
      description: "Học cốt MI ID chuẩn chỉnh quỹ",
      market: "DOMESTIC",
      coverImageUrl: null,
      listPriceVnd: 34600000,
      promoPriceVnd: 19900000,
      teacherBonusVnd: 0,
      kitName: null,
      kitUrl: null,
      kitPriceVnd: 0,
      samplePriceVnd: 0,
      lessonCount: 32,
      lashModelCount: 31,
      syllabus: [],
      syllabusHtml: null,
      sortOrder: 1,
      isActive: true,
      updatedAt: "2026-09-22T08:57:13.000Z",
    },
  ];

  it("automatically adds Khóa WORKSHOP 1DAYS if not present in input courses", () => {
    const options = buildCourseOptions(sampleCourses);
    expect(options).toHaveLength(2);
    expect(options.some((opt) => opt.value === "Khóa WORKSHOP 1DAYS")).toBe(true);
    const workshopOpt = options.find((opt) => opt.value === "Khóa WORKSHOP 1DAYS");
    expect(workshopOpt?.label).toContain("Khóa WORKSHOP 1DAYS");
  });

  it("does not duplicate Khóa WORKSHOP 1DAYS if it is already in database courses", () => {
    const coursesWithWorkshop: AcademyCourse[] = [
      ...sampleCourses,
      {
        id: 20,
        code: "workshop_1days",
        name: "Khóa WORKSHOP 1DAYS",
        nameEn: "Workshop 1 Day",
        tag: "WORKSHOP",
        description: "Khóa học Workshop 1 ngày",
        market: "DOMESTIC",
        coverImageUrl: null,
        listPriceVnd: 0,
        promoPriceVnd: 0,
        teacherBonusVnd: 0,
        kitName: null,
        kitUrl: null,
        kitPriceVnd: 0,
        samplePriceVnd: 0,
        lessonCount: 1,
        lashModelCount: 0,
        syllabus: [],
        syllabusHtml: null,
        sortOrder: 6,
        isActive: true,
        updatedAt: "2026-09-28T10:00:00.000Z",
      },
    ];
    const options = buildCourseOptions(coursesWithWorkshop);
    expect(options).toHaveLength(2);
    const matching = options.filter((opt) => opt.value === "Khóa WORKSHOP 1DAYS");
    expect(matching).toHaveLength(1);
  });
});
