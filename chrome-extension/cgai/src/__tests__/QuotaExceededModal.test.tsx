import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuotaExceededModal from "@/sidepanel/components/QuotaExceededModal";
import type { QuotaExceededResponse } from "@/lib/api-client";

function makeQuota(overrides: Partial<QuotaExceededResponse> = {}): QuotaExceededResponse {
  return {
    error: "QUOTA_EXCEEDED",
    usageType: "scan",
    current: 10,
    limit: 10,
    plan: "FREE",
    message: "You have reached your scan quota",
    upgradeUrl: "https://vollos.ai/customsguard/pricing",
    ...overrides,
  };
}

describe("QuotaExceededModal", () => {
  it("renders with quota info (usage type, current/limit, plan)", () => {
    const quota = makeQuota({ usageType: "scan", current: 10, limit: 10, plan: "FREE" });
    render(<QuotaExceededModal quota={quota} onClose={vi.fn()} />);

    // Title
    expect(screen.getByText("quota.title")).toBeInTheDocument();
    // Usage display
    expect(screen.getByText("10/10")).toBeInTheDocument();
    // Plan name
    expect(screen.getByText(/FREE/)).toBeInTheDocument();
    // Usage type
    expect(screen.getByText("scan")).toBeInTheDocument();
  });

  it("displays custom message from quota response", () => {
    const quota = makeQuota({ message: "Scan limit reached for this month" });
    render(<QuotaExceededModal quota={quota} onClose={vi.fn()} />);

    expect(screen.getByText("Scan limit reached for this month")).toBeInTheDocument();
  });

  it("falls back to translation key when message is empty", () => {
    const quota = makeQuota({ message: "" });
    render(<QuotaExceededModal quota={quota} onClose={vi.fn()} />);

    // Falls back to t("quota.exceeded")
    expect(screen.getByText("quota.exceeded")).toBeInTheDocument();
  });

  it("upgrade button opens new tab via chrome.tabs.create", async () => {
    const user = userEvent.setup();
    const mockCreate = vi.fn();
    (globalThis as any).chrome.tabs = { create: mockCreate };

    const quota = makeQuota({ upgradeUrl: "https://vollos.ai/customsguard/pricing" });
    render(<QuotaExceededModal quota={quota} onClose={vi.fn()} />);

    const upgradeBtn = screen.getByText("quota.upgrade");
    await user.click(upgradeBtn);

    expect(mockCreate).toHaveBeenCalledWith({
      url: "https://vollos.ai/customsguard/pricing",
    });

    // Cleanup
    delete (globalThis as any).chrome.tabs;
  });

  it("upgrade button falls back to default pricing URL when upgradeUrl does not start with http", async () => {
    const user = userEvent.setup();
    const mockCreate = vi.fn();
    (globalThis as any).chrome.tabs = { create: mockCreate };

    const quota = makeQuota({ upgradeUrl: "/pricing" });
    render(<QuotaExceededModal quota={quota} onClose={vi.fn()} />);

    await user.click(screen.getByText("quota.upgrade"));

    expect(mockCreate).toHaveBeenCalledWith({
      url: "https://vollos.ai/customsguard/pricing",
    });

    delete (globalThis as any).chrome.tabs;
  });

  it("close button (X) calls onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<QuotaExceededModal quota={makeQuota()} onClose={onClose} />);

    // The bottom close button uses t("common.close")
    const closeBtn = screen.getByText("common.close");
    await user.click(closeBtn);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows chat usage type correctly", () => {
    const quota = makeQuota({ usageType: "chat", current: 45, limit: 50 });
    render(<QuotaExceededModal quota={quota} onClose={vi.fn()} />);

    expect(screen.getByText("chat")).toBeInTheDocument();
    expect(screen.getByText("45/50")).toBeInTheDocument();
  });
});
