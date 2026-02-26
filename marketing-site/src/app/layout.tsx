import type { Metadata } from "next";
import { Inter, Manrope, Instrument_Serif, Prompt } from "next/font/google";
import "./globals.css";
import { GrainNoise } from "@/components/GrainNoise";
import { SmoothScroll } from "@/components/SmoothScroll";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument",
  weight: "400",
  style: "italic",
  display: "swap",
});

const prompt = Prompt({
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VOLLOS | AI จัดการใบขนสินค้า & HS-Code อัตโนมัติ",
  description: "หยุดนรกการคีย์ใบขน! เปลี่ยนงาน 3 ชั่วโมง ให้เหลือ 2 นาที ด้วย VOLLOS AI สำหรับธุรกิจ SME ไทย",
  icons: {
    icon: "/images/logo.svg",
    apple: "/images/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${inter.variable} ${manrope.variable} ${instrumentSerif.variable} ${prompt.variable}`}>
      <body className="bg-white text-black antialiased font-[family-name:var(--font-prompt)] selection:bg-[#D4AF37] selection:text-white">
        <GrainNoise />
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
