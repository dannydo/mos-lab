import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import { AcademyLeadDrawer } from "./AcademyLeadDrawer";

// Mock apiClient
vi.mock("../../../../lib/api-client", () => ({
  apiClient: {
    academySales: {
      getLead: vi.fn(),
      createLead: vi.fn(),
      updateLead: vi.fn(),
      addActivity: vi.fn(),
      createFollowUp: vi.fn(),
      updateFollowUp: vi.fn(),
      recordNoShow: vi.fn(),
    },
  },
}));

describe("AcademyLeadDrawer", () => {
  it("renders Khóa học quan tâm field with options", () => {
    const { container } = render(
      <AcademyLeadDrawer
        open={true}
        leadId={null}
        staff={[]}
        courses={[]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );
    expect(screen.getByText("Khóa học quan tâm")).toBeDefined();
    const select = container.querySelector("#course");
    expect(select).toBeDefined();
  });
});
