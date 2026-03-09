import { PrivacyContent } from "./PrivacyContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "นโยบายความเป็นส่วนตัว | VOLLOS",
    description: "นโยบายความเป็นส่วนตัวและการคุ้มครองข้อมูลส่วนบุคคล (PDPA) ของ VOLLOS",
};

export default function PrivacyPage() {
    return <PrivacyContent />;
}
