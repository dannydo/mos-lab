import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import AcademyLeadDrawer from "./AcademyLeadDrawer";
import { apiClient } from "../../../../lib/api-client";

vi.mock("../../../../lib/api-client", () => ({
  apiClient: {
    academySales: {
      getLead: vi.fn(),
      createLead: vi.fn().mockResolvedValue({ id: 1 }),
      updateLead: vi.fn().mockResolvedValue({ id: 1 }),
      addActivity: vi.fn(),
      createFollowUp: vi.fn(),
      updateFollowUp: vi.fn(),
      recordNoShow: vi.fn(),
    },
  },
}));

// Mock window.matchMedia for Ant Design Responsive components
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe("AcademyLeadDrawer revenueVnd input", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats revenue correctly without collapsing 1.500.000 into 1.5 đ", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <AcademyLeadDrawer
        open={true}
        onClose={onClose}
        onSaved={onSaved}
        leadId={null}
        courses={[]}
        staff={[]}
      />
    );

    const revenueInput = screen.getByLabelText(/Doanh thu đã chốt/i) as HTMLInputElement;
    expect(revenueInput).toBeDefined();

    fireEvent.change(revenueInput, { target: { value: "1500000" } });
    fireEvent.blur(revenueInput);

    expect(revenueInput.value).toBe("1.500.000 đ");

    const nameInput = screen.getByLabelText(/Tên khách hàng/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Học viên Test" } });

    const submitBtn = screen.getByRole("button", { name: /Tạo khách hàng/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiClient.academySales.createLead).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Học viên Test",
          revenueVnd: 1500000,
        })
      );
    });
  });

  it("allows pasting formatted value 1.500.000 đ and parses it as 1500000", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <AcademyLeadDrawer
        open={true}
        onClose={onClose}
        onSaved={onSaved}
        leadId={null}
        courses={[]}
        staff={[]}
      />
    );

    const revenueInput = screen.getByLabelText(/Doanh thu đã chốt/i) as HTMLInputElement;
    fireEvent.change(revenueInput, { target: { value: "1.500.000 đ" } });
    fireEvent.blur(revenueInput);

    expect(revenueInput.value).toBe("1.500.000 đ");

    const nameInput = screen.getByLabelText(/Tên khách hàng/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Học viên Paste" } });

    const submitBtn = screen.getByRole("button", { name: /Tạo khách hàng/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiClient.academySales.createLead).toHaveBeenCalledWith(
        expect.objectContaining({
          revenueVnd: 1500000,
        })
      );
    });
  });
});

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
