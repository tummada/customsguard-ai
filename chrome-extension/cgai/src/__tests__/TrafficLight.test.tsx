import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TrafficLight from "@/sidepanel/components/TrafficLight";
import type { CgDeclarationItem, AuditRisk } from "@/types";

function makeItem(
  overrides: Partial<CgDeclarationItem> = {}
): CgDeclarationItem {
  return {
    localId: 1,
    declarationLocalId: 1,
    hsCode: "8471.30.10",
    ...overrides,
  };
}

function makeRisk(overrides: Partial<AuditRisk> = {}): AuditRisk {
  return {
    color: "green",
    score: 0,
    flags: [],
    summary: "ผ่าน",
    ...overrides,
  };
}

describe("TrafficLight", () => {
  it("renders green dot when risk.color is green", () => {
    const { container } = render(
      <TrafficLight item={makeItem({ confidence: 0.95 })} risk={makeRisk({ color: "green" })} />
    );
    const dot = container.querySelector("span");
    expect(dot?.className).toContain("bg-green-500");
  });

  it("renders orange dot when risk.color is orange", () => {
    const { container } = render(
      <TrafficLight item={makeItem({ confidence: 0.72 })} risk={makeRisk({ color: "orange", score: 0.45 })} />
    );
    const dot = container.querySelector("span");
    expect(dot?.className).toContain("bg-orange-400");
  });

  it("renders red dot when risk.color is red", () => {
    const { container } = render(
      <TrafficLight
        item={makeItem({ confidence: 0.4 })}
        risk={makeRisk({ color: "red", score: 1.0, flags: [{ type: "LOW_CONFIDENCE", severity: "error", message: "ความมั่นใจต่ำ (40%)" }] })}
      />
    );
    const dot = container.querySelector("span");
    expect(dot?.className).toContain("bg-red-500");
  });

  it("renders blue dot when risk.color is blue", () => {
    const { container } = render(
      <TrafficLight
        item={makeItem({ editStatus: "EDITED", confidence: 0.5 })}
        risk={makeRisk({ color: "blue", flags: [{ type: "USER_EDITED", severity: "info", message: "แก้ไขโดยผู้ใช้" }] })}
      />
    );
    const dot = container.querySelector("span");
    expect(dot?.className).toContain("bg-blue-400");
  });

  it("renders checkmark when item is CONFIRMED (not colored dot)", () => {
    // CONFIRMED items show a checkmark emoji, not a colored dot
    render(
      <TrafficLight
        item={makeItem({ editStatus: "CONFIRMED", isConfirmed: true, confidence: 0.8 })}
        risk={makeRisk({ color: "green" })}
      />
    );
    // The checkmark emoji is rendered for confirmed items
    expect(screen.getByText(/✅/)).toBeInTheDocument();
  });

  it("shows tooltip with confidence and label on hover", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TrafficLight item={makeItem({ confidence: 0.95 })} risk={makeRisk({ color: "green" })} />
    );
    const dot = container.querySelector("span")!;

    // Tooltip not visible initially
    expect(screen.queryByText(/95%/)).not.toBeInTheDocument();

    await user.hover(dot);
    expect(screen.getByText(/95%/)).toBeInTheDocument();
    // i18n mock returns key as-is; color "green" maps to labelKey "traffic.high"
    expect(screen.getByText(/traffic\.high/)).toBeInTheDocument();
  });

  it("shows risk flags in tooltip on hover", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TrafficLight
        item={makeItem({ confidence: 0.7 })}
        risk={makeRisk({
          color: "orange",
          score: 0.45,
          flags: [
            { type: "LPI_REQUIRED", severity: "warning", message: "ต้องมีใบอนุญาต 2 หน่วยงาน" },
            { type: "HIGH_DUTY", severity: "info", message: "อัตราอากรสูง (35%)" },
          ],
        })}
      />
    );
    const dot = container.querySelector("span")!;

    await user.hover(dot);
    expect(screen.getByText("ต้องมีใบอนุญาต 2 หน่วยงาน")).toBeInTheDocument();
    expect(screen.getByText(/อัตราอากรสูง/)).toBeInTheDocument();
    // Confidence bar shows confidence percentage (70%), not risk score
    expect(screen.getByText(/70%/)).toBeInTheDocument();
  });

  it("fallback to green when no risk prop", () => {
    const { container } = render(
      <TrafficLight item={makeItem({ confidence: 0.95 })} />
    );
    const dot = container.querySelector("span");
    expect(dot?.className).toContain("bg-green-500");
  });
});
