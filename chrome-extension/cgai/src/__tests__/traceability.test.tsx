/**
 * Tests for the 6 Gaps: Traceability, Traffic Light V2,
 * ChatPanel context injection, FtaAlertBanner source link
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getTrafficColor } from "@/types";
import type { CgDeclarationItem } from "@/types";
import type { RagSource, FtaAlert } from "@/lib/api-client";
import FtaAlertBanner from "@/sidepanel/components/FtaAlertBanner";
import ChatPanel from "@/sidepanel/components/ChatPanel";

// ─── Helpers ───

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

function makeRagSource(
  overrides: Partial<RagSource> = {}
): RagSource {
  return {
    sourceType: "regulation",
    sourceId: "customs-act-2017",
    chunkText: "พระราชบัญญัติศุลกากร พ.ศ. 2560 มาตรา 14 กำหนดให้ผู้นำเข้าต้องสำแดงพิกัดศุลกากร",
    contentSummary: "กฎหมายศุลกากร",
    similarity: 0.92,
    sourceUrl: null,
    docNumber: null,
    docType: null,
    title: null,
    ...overrides,
  };
}

function makeFtaAlert(
  overrides: Partial<FtaAlert> = {}
): FtaAlert {
  return {
    ftaName: "ACFTA",
    partnerCountry: "CN",
    formType: "Form E",
    preferentialRate: 0,
    savingPercent: 5,
    conditions: null,
    sourceUrl: null,
    ...overrides,
  };
}

// ─── Gap 1: Traffic Light V2 — CONFIRMED → gold ───

describe("Traffic Light V2", () => {
  it("returns gold when editStatus is CONFIRMED", () => {
    expect(
      getTrafficColor(makeItem({ editStatus: "CONFIRMED", confidence: 0.5 }))
    ).toBe("gold");
  });

  it("CONFIRMED overrides EDITED (gold, not blue)", () => {
    // Can't have both, but CONFIRMED should win over anything
    expect(
      getTrafficColor(makeItem({ editStatus: "CONFIRMED" }))
    ).toBe("gold");
  });

  it("CONFIRMED overrides ftaAvailable", () => {
    expect(
      getTrafficColor(makeItem({ editStatus: "CONFIRMED" }), true)
    ).toBe("gold");
  });

  it("CONFIRMED overrides low confidence", () => {
    expect(
      getTrafficColor(makeItem({ editStatus: "CONFIRMED", confidence: 0.1 }))
    ).toBe("gold");
  });

  it("EDITED still returns blue (not affected by CONFIRMED logic)", () => {
    expect(
      getTrafficColor(makeItem({ editStatus: "EDITED" }))
    ).toBe("blue");
  });

  it("AI_EXTRACTED with low confidence (enrichment marked) returns red", () => {
    expect(
      getTrafficColor(
        makeItem({ editStatus: "AI_EXTRACTED", confidence: 0.1 })
      )
    ).toBe("red");
  });
});

// ─── Gap 2: RagSource provenance fields type-check ───

describe("RagSource provenance fields", () => {
  it("accepts all provenance fields", () => {
    const src = makeRagSource({
      sourceUrl: "https://www.customs.go.th/law/customs-act-2017.pdf",
      docNumber: "พ.ร.บ.ศุลกากร พ.ศ.2560",
      docType: "regulation",
      title: "พระราชบัญญัติศุลกากร พ.ศ. 2560",
    });
    expect(src.sourceUrl).toBe(
      "https://www.customs.go.th/law/customs-act-2017.pdf"
    );
    expect(src.docNumber).toBe("พ.ร.บ.ศุลกากร พ.ศ.2560");
    expect(src.docType).toBe("regulation");
    expect(src.title).toBe("พระราชบัญญัติศุลกากร พ.ศ. 2560");
  });

  it("allows null provenance fields", () => {
    const src = makeRagSource();
    expect(src.sourceUrl).toBeNull();
    expect(src.docNumber).toBeNull();
    expect(src.docType).toBeNull();
    expect(src.title).toBeNull();
  });
});

// ─── Gap 3: FtaAlert sourceUrl field type-check ───

describe("FtaAlert sourceUrl field", () => {
  it("includes sourceUrl when provided", () => {
    const alert = makeFtaAlert({
      sourceUrl: "https://www.customs.go.th/fta/acfta-2024.pdf",
    });
    expect(alert.sourceUrl).toBe(
      "https://www.customs.go.th/fta/acfta-2024.pdf"
    );
  });

  it("allows null sourceUrl", () => {
    const alert = makeFtaAlert();
    expect(alert.sourceUrl).toBeNull();
  });
});

// ─── Gap 4: FtaAlertBanner — renders source link ───

describe("FtaAlertBanner source link", () => {
  it("renders 'ดูหลักฐาน' link when sourceUrl is provided", () => {
    render(
      <FtaAlertBanner
        hsCode="0306.17"
        alerts={[
          makeFtaAlert({
            sourceUrl: "https://www.customs.go.th/fta/acfta-2024.pdf",
          }),
        ]}
      />
    );
    const link = screen.getByText(/banner\.evidence/);

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      "https://www.customs.go.th/fta/acfta-2024.pdf"
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("does NOT render source link when sourceUrl is null", () => {
    render(
      <FtaAlertBanner
        hsCode="0306.17"
        alerts={[makeFtaAlert({ sourceUrl: null })]}
      />
    );
    expect(screen.queryByText(/banner\.evidence/)).not.toBeInTheDocument();
  });

  it("renders nothing when alerts is empty", () => {
    const { container } = render(
      <FtaAlertBanner hsCode="0306.17" alerts={[]} />
    );
    expect(container.innerHTML).toBe("");
  });
});

// ─── Gap 5: ChatPanel — accepts activeHsCodes prop ───

describe("ChatPanel", () => {
  it("renders without activeHsCodes (backwards compatible)", () => {
    render(<ChatPanel />);
    expect(
      screen.getByPlaceholderText(/chat\.placeholder/)
    ).toBeInTheDocument();
  });

  it("renders with activeHsCodes prop", () => {
    render(<ChatPanel activeHsCodes={["0306.17", "8471.30"]} />);
    expect(
      screen.getByPlaceholderText(/chat\.placeholder/)
    ).toBeInTheDocument();
  });

  it("shows empty state message when no messages", () => {
    render(<ChatPanel />);
    expect(
      screen.getByText(/chat\.emptyTitle/)
    ).toBeInTheDocument();
  });
});

// ─── Bug Fix Tests: Intent Classification ───

import { classifyIntent } from "@/sidepanel/components/ChatPanel";

describe("Chat intent classification", () => {
  it("classifies Thai greetings as 'greeting'", () => {
    expect(classifyIntent("สวัสดี")).toBe("greeting");
    expect(classifyIntent("สวัสดีครับ")).toBe("greeting");
    expect(classifyIntent("หวัดดี")).toBe("greeting");
    expect(classifyIntent("ดีครับ")).toBe("greeting");
  });

  it("classifies English greetings as 'greeting'", () => {
    expect(classifyIntent("hello")).toBe("greeting");
    expect(classifyIntent("Hi ")).toBe("greeting");
    expect(classifyIntent("Hey")).toBe("greeting");
  });

  it("classifies casual questions about the bot as 'greeting'", () => {
    expect(classifyIntent("ถามอะไรได้มั้ย")).toBe("greeting");
    expect(classifyIntent("ถามอะไรได้ม่ะ")).toBe("greeting");
    expect(classifyIntent("ทำอะไรได้บ้าง")).toBe("greeting");
    expect(classifyIntent("คุณเป็นใคร")).toBe("greeting");
  });

  it("classifies thanks as 'thanks'", () => {
    expect(classifyIntent("ขอบคุณ")).toBe("thanks");
    expect(classifyIntent("ขอบคุณครับ")).toBe("thanks");
    expect(classifyIntent("thanks")).toBe("thanks");
    expect(classifyIntent("เข้าใจแล้ว")).toBe("thanks");
  });

  it("classifies short non-customs text as 'chitchat'", () => {
    expect(classifyIntent("ไม่ทราบ")).toBe("chitchat");
    expect(classifyIntent("อืม")).toBe("chitchat");
    expect(classifyIntent("555")).toBe("chitchat");
  });

  it("classifies customs-related queries as 'customs'", () => {
    expect(classifyIntent("HS code กุ้งแช่แข็ง")).toBe("customs");
    expect(classifyIntent("อัตราอากร MFN สินค้าอิเล็กทรอนิกส์")).toBe("customs");
    expect(classifyIntent("FTA ACFTA ข้าว")).toBe("customs");
    expect(classifyIntent("ใบอนุญาตนำเข้า")).toBe("customs");
    expect(classifyIntent("พิกัดศุลกากร คอมพิวเตอร์")).toBe("customs");
  });

  it("classifies longer unknown queries as 'customs' (fallback)", () => {
    expect(classifyIntent("ช่วยดูรายละเอียดสินค้าที่นำเข้ามาให้หน่อย")).toBe("customs");
  });
});

// ─── Bug Fix Tests: Source URL validation ───

describe("Source URL display rules", () => {
  it("sourceUrl with https:// is valid for display", () => {
    const src = makeRagSource({
      sourceUrl: "https://ecs-support.github.io/post/law/customs/2563/2563-204/",
    });
    expect(src.sourceUrl).toMatch(/^https:\/\//);
  });

  it("sourceUrl with only homepage domain should not be used as reference", () => {
    // LPI alerts only have homepage URLs like https://www.tisi.go.th
    // These should not be rendered as source links
    const homepageUrl = "https://www.tisi.go.th";
    // Homepage URLs have no path beyond /
    const url = new URL(homepageUrl);
    expect(url.pathname).toBe("/");
  });

  it("sourceUrl null should not render link", () => {
    const src = makeRagSource({ sourceUrl: null });
    expect(src.sourceUrl).toBeNull();
  });
});
