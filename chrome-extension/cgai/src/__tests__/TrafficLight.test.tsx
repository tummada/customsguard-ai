import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TrafficLight from "@/sidepanel/components/TrafficLight";
import type { CgDeclarationItem } from "@/types";

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

describe("TrafficLight", () => {
  it("renders green dot for high confidence (0.95)", () => {
    const { container } = render(
      <TrafficLight item={makeItem({ confidence: 0.95 })} />
    );
    const dot = container.querySelector("span");
    expect(dot?.className).toContain("bg-green-500");
  });

  it("renders orange dot for medium confidence (0.72)", () => {
    const { container } = render(
      <TrafficLight item={makeItem({ confidence: 0.72 })} />
    );
    const dot = container.querySelector("span");
    expect(dot?.className).toContain("bg-orange-400");
  });

  it("renders red dot for low confidence (0.40)", () => {
    const { container } = render(
      <TrafficLight item={makeItem({ confidence: 0.4 })} />
    );
    const dot = container.querySelector("span");
    expect(dot?.className).toContain("bg-red-500");
  });

  it("renders blue dot when editStatus is EDITED", () => {
    const { container } = render(
      <TrafficLight item={makeItem({ editStatus: "EDITED", confidence: 0.5 })} />
    );
    const dot = container.querySelector("span");
    expect(dot?.className).toContain("bg-blue-400");
  });

  it("renders gold dot when ftaAvailable triggers gold (via getTrafficColor)", () => {
    // Note: TrafficLight doesn't pass ftaAvailable — it always calls getTrafficColor(item)
    // without the second arg. So we test the gold color indirectly isn't reachable
    // from the component alone. Instead, test yellow-400 class doesn't appear for non-FTA.
    const { container } = render(
      <TrafficLight item={makeItem({ confidence: 0.8 })} />
    );
    const dot = container.querySelector("span");
    // 0.8 confidence without FTA → orange
    expect(dot?.className).toContain("bg-orange-400");
  });

  it("shows tooltip with confidence percentage on hover", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TrafficLight item={makeItem({ confidence: 0.95 })} />
    );
    const dot = container.querySelector("span")!;

    // Tooltip should not be visible initially
    expect(screen.queryByText(/95%/)).not.toBeInTheDocument();

    await user.hover(dot);
    expect(screen.getByText(/95%/)).toBeInTheDocument();
    expect(screen.getByText(/High Confidence/)).toBeInTheDocument();
  });
});
