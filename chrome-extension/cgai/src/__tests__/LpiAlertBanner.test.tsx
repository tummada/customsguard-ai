import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LpiAlertBanner from "@/sidepanel/components/LpiAlertBanner";
import type { LpiAlert } from "@/lib/api-client";

function makeAlert(overrides: Partial<LpiAlert> = {}): LpiAlert {
  return {
    hsCode: "0306.17",
    controlType: "LICENSE",
    agencyCode: "FDA",
    agencyNameTh: "สำนักงานคณะกรรมการอาหารและยา",
    agencyNameEn: "Food and Drug Administration",
    requirementTh: "ต้องมีใบอนุญาตนำเข้าอาหาร",
    requirementEn: "Import food license required",
    appliesTo: "IMPORT",
    sourceUrl: "https://www.fda.moph.go.th/regulations",
    ...overrides,
  };
}

describe("LpiAlertBanner", () => {
  it("renders nothing when alerts is empty", () => {
    const { container } = render(<LpiAlertBanner alerts={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders banner title", () => {
    render(<LpiAlertBanner alerts={[makeAlert()]} />);
    expect(screen.getByText("banner.lpiTitle")).toBeInTheDocument();
  });

  it("shows HS code in the header", () => {
    render(<LpiAlertBanner alerts={[makeAlert({ hsCode: "0306.17" })]} />);
    expect(screen.getByText("0306.17")).toBeInTheDocument();
  });

  it("shows agency code badge", () => {
    render(<LpiAlertBanner alerts={[makeAlert({ agencyCode: "FDA" })]} />);
    // Agency code appears twice: once in the header badge and once as a copy button
    const fdaBadges = screen.getAllByText("FDA");
    expect(fdaBadges.length).toBeGreaterThanOrEqual(1);
  });

  // ── Grouping by HS code ──

  it("groups alerts by HS code", () => {
    const alerts = [
      makeAlert({ hsCode: "0306.17", agencyCode: "FDA" }),
      makeAlert({ hsCode: "0306.17", agencyCode: "DOA" }),
      makeAlert({ hsCode: "8471.30", agencyCode: "NBTC" }),
    ];
    render(<LpiAlertBanner alerts={alerts} />);

    // Two HS code groups
    expect(screen.getByText("0306.17")).toBeInTheDocument();
    expect(screen.getByText("8471.30")).toBeInTheDocument();

    // Both agencies for 0306.17
    expect(screen.getAllByText("FDA").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("DOA").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("NBTC").length).toBeGreaterThanOrEqual(1);
  });

  // ── Expandable accordion ──

  it("does not show details initially (collapsed)", () => {
    render(
      <LpiAlertBanner
        alerts={[makeAlert({ agencyNameTh: "สำนักงาน อย." })]}
      />
    );
    // Agency name appears only in expanded details
    expect(screen.queryByText("สำนักงาน อย.")).not.toBeInTheDocument();
  });

  it("shows details when HS code header is clicked (expanded)", async () => {
    const user = userEvent.setup();
    render(
      <LpiAlertBanner
        alerts={[
          makeAlert({
            agencyNameTh: "สำนักงานคณะกรรมการอาหารและยา",
            requirementTh: "ต้องมีใบอนุญาตนำเข้าอาหาร",
          }),
        ]}
      />
    );

    // Click the HS code header to expand
    await user.click(screen.getByText("0306.17"));

    // Now details should be visible
    expect(
      screen.getByText("สำนักงานคณะกรรมการอาหารและยา")
    ).toBeInTheDocument();
    expect(
      screen.getByText("ต้องมีใบอนุญาตนำเข้าอาหาร")
    ).toBeInTheDocument();
  });

  it("collapses when clicked again", async () => {
    const user = userEvent.setup();
    render(
      <LpiAlertBanner
        alerts={[
          makeAlert({
            agencyNameTh: "สำนักงานคณะกรรมการอาหารและยา",
          }),
        ]}
      />
    );

    const header = screen.getByText("0306.17");

    // Expand
    await user.click(header);
    expect(
      screen.getByText("สำนักงานคณะกรรมการอาหารและยา")
    ).toBeInTheDocument();

    // Collapse
    await user.click(header);
    expect(
      screen.queryByText("สำนักงานคณะกรรมการอาหารและยา")
    ).not.toBeInTheDocument();
  });

  // ── Shows agency name + requirement ──

  it("shows agency name and requirement text when expanded", async () => {
    const user = userEvent.setup();
    render(
      <LpiAlertBanner
        alerts={[
          makeAlert({
            agencyNameTh: "กรมประมง",
            requirementTh: "ใบรับรองสุขอนามัยสัตว์น้ำ",
            controlType: "PERMIT",
          }),
        ]}
      />
    );

    await user.click(screen.getByText("0306.17"));

    expect(screen.getByText("กรมประมง")).toBeInTheDocument();
    expect(screen.getByText("ใบรับรองสุขอนามัยสัตว์น้ำ")).toBeInTheDocument();
    expect(screen.getByText("PERMIT")).toBeInTheDocument();
  });

  it("shows source URL hostname when available", async () => {
    const user = userEvent.setup();
    render(
      <LpiAlertBanner
        alerts={[
          makeAlert({
            sourceUrl: "https://www.fda.moph.go.th/regulations/import",
          }),
        ]}
      />
    );

    await user.click(screen.getByText("0306.17"));

    expect(screen.getByText(/fda\.moph\.go\.th/)).toBeInTheDocument();
  });

  it("does not show source hostname when sourceUrl is null", async () => {
    const user = userEvent.setup();
    render(
      <LpiAlertBanner
        alerts={[makeAlert({ sourceUrl: null })]}
      />
    );

    await user.click(screen.getByText("0306.17"));

    expect(screen.queryByText(/banner\.lpiAgency/)).not.toBeInTheDocument();
  });

  // ── Multiple alerts per HS code ──

  it("shows multiple agencies under same HS code when expanded", async () => {
    const user = userEvent.setup();
    render(
      <LpiAlertBanner
        alerts={[
          makeAlert({
            hsCode: "0306.17",
            agencyCode: "FDA",
            agencyNameTh: "อย.",
            requirementTh: "ใบอนุญาตอาหาร",
          }),
          makeAlert({
            hsCode: "0306.17",
            agencyCode: "DOA",
            agencyNameTh: "กรมวิชาการเกษตร",
            requirementTh: "ใบรับรองพืช",
          }),
        ]}
      />
    );

    await user.click(screen.getByText("0306.17"));

    expect(screen.getByText("อย.")).toBeInTheDocument();
    expect(screen.getByText("กรมวิชาการเกษตร")).toBeInTheDocument();
    expect(screen.getByText("ใบอนุญาตอาหาร")).toBeInTheDocument();
    expect(screen.getByText("ใบรับรองพืช")).toBeInTheDocument();
  });

  // ── Copy to clipboard ──

  it("copy button calls navigator.clipboard.writeText", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    // Use defineProperty since clipboard is a read-only getter
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<LpiAlertBanner alerts={[makeAlert({ agencyCode: "FDA" })]} />);

    // Expand first
    await user.click(screen.getByText("0306.17"));

    // Click the copy button (the one inside expanded details with title)
    const copyBtns = screen.getAllByTitle("Copy: FDA");
    await user.click(copyBtns[0]);

    expect(writeText).toHaveBeenCalledWith("FDA");
  });
});
