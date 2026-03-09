import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import UsageBadge from "@/sidepanel/components/UsageBadge";
import type { UsageResponse } from "@/lib/api-client";

function makeUsage(overrides: Partial<UsageResponse> = {}): UsageResponse {
  return {
    plan: "FREE",
    period: "2026-03",
    scan: { used: 3, limit: 10 },
    chat: { used: 5, limit: 50 },
    ...overrides,
  };
}

describe("UsageBadge", () => {
  it("renders null when usage is null", () => {
    const { container } = render(<UsageBadge usage={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows scan usage X/Y", () => {
    render(<UsageBadge usage={makeUsage({ scan: { used: 3, limit: 10 } })} />);
    expect(screen.getByText(/3\/10/)).toBeInTheDocument();
  });

  it("shows chat usage X/Y", () => {
    render(<UsageBadge usage={makeUsage({ chat: { used: 12, limit: 50 } })} />);
    expect(screen.getByText(/12\/50/)).toBeInTheDocument();
  });

  it("shows scan and chat labels", () => {
    render(<UsageBadge usage={makeUsage()} />);
    // Translation keys
    expect(screen.getByText(/quota\.scan/)).toBeInTheDocument();
    expect(screen.getByText(/quota\.chat/)).toBeInTheDocument();
  });

  // ── Bar colors ──

  it("scan bar is green (brand color) when usage < 80%", () => {
    const { container } = render(
      <UsageBadge usage={makeUsage({ scan: { used: 5, limit: 10 } })} />
    );
    // 50% usage → bg-brand
    const bars = container.querySelectorAll("[class*='bg-brand']");
    expect(bars.length).toBeGreaterThanOrEqual(1);
  });

  it("scan bar is orange when usage >= 80% and < 100%", () => {
    const { container } = render(
      <UsageBadge usage={makeUsage({ scan: { used: 8, limit: 10 } })} />
    );
    // 80% usage → bg-orange-400
    const bars = container.querySelectorAll("[class*='bg-orange']");
    expect(bars.length).toBeGreaterThanOrEqual(1);
  });

  it("scan bar is red when usage >= 100%", () => {
    const { container } = render(
      <UsageBadge usage={makeUsage({ scan: { used: 10, limit: 10 } })} />
    );
    // 100% usage → bg-red-500
    const bars = container.querySelectorAll("[class*='bg-red']");
    expect(bars.length).toBeGreaterThanOrEqual(1);
  });

  it("text color is red when usage >= 100%", () => {
    render(
      <UsageBadge usage={makeUsage({ scan: { used: 10, limit: 10 } })} />
    );
    const scanText = screen.getByText(/quota\.scan.*10\/10/);
    expect(scanText.className).toContain("text-red-600");
  });

  it("text color is orange when usage >= 80%", () => {
    render(
      <UsageBadge usage={makeUsage({ scan: { used: 9, limit: 10 } })} />
    );
    const scanText = screen.getByText(/quota\.scan.*9\/10/);
    expect(scanText.className).toContain("text-orange-500");
  });

  it("text color is gray when usage < 80%", () => {
    render(
      <UsageBadge usage={makeUsage({ scan: { used: 2, limit: 10 } })} />
    );
    const scanText = screen.getByText(/quota\.scan.*2\/10/);
    expect(scanText.className).toContain("text-gray-500");
  });

  it("handles limit=0 gracefully (no division by zero)", () => {
    render(
      <UsageBadge usage={makeUsage({ scan: { used: 0, limit: 0 } })} />
    );
    const scanText = screen.getByText(/quota\.scan.*0\/0/);
    expect(scanText.className).toContain("text-gray-400");
  });

  it("bar width is capped at 100%", () => {
    const { container } = render(
      <UsageBadge usage={makeUsage({ scan: { used: 15, limit: 10 } })} />
    );
    // Over-quota: 150% → should be capped to 100%
    const barInner = container.querySelector("[style*='width']");
    expect(barInner).not.toBeNull();
    // width should be "100%"
    expect(barInner!.getAttribute("style")).toContain("100%");
  });
});
