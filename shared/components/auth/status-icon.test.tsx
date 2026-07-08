import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusIcon } from "./status-icon";

describe("StatusIcon", () => {
  it("renders with bg-success-soft and text-success for success variant", () => {
    const { container } = render(<StatusIcon variant="success" />);
    const div = container.querySelector('[data-slot="status-icon"]');
    expect(div?.className).toContain("bg-success-soft");
    expect(div?.className).toContain("text-success");
    expect(div?.getAttribute("data-variant")).toBe("success");
  });

  it("renders with destructive styles for error variant", () => {
    const { container } = render(<StatusIcon variant="error" />);
    const div = container.querySelector('[data-slot="status-icon"]');
    expect(div?.className).toContain("bg-destructive-soft");
    expect(div?.className).toContain("text-destructive");
  });

  it("renders with warning styles for network-error variant", () => {
    const { container } = render(<StatusIcon variant="network-error" />);
    const div = container.querySelector('[data-slot="status-icon"]');
    expect(div?.className).toContain("bg-warning-soft");
    expect(div?.className).toContain("text-warning");
  });

  it("applies sm size class when size=sm", () => {
    const { container } = render(<StatusIcon variant="success" size="sm" />);
    const div = container.querySelector('[data-slot="status-icon"]');
    expect(div?.className).toContain("size-10");
  });
});
