import Image from "next/image";
import Link from "next/link";

const footerLinks = [
    { label: "หน้าหลัก", href: "/c" },
    { label: "ราคา", href: "/pricing" },
    { label: "นโยบายความเป็นส่วนตัว", href: "/privacy" },
];

interface FooterProps {
    tagline?: string;
    copyright?: string;
}

export function Footer({
    tagline = "Where Time Becomes Value",
    copyright = "\u00A9 2026 VOLLOS Intelligence. อ้างอิงข้อมูลจากกรมศุลกากร",
}: FooterProps) {
    return (
        <footer className="py-20 border-t border-gray-50 text-center relative z-10">
            <Image src="/images/logo.svg" alt="VOLLOS" width={550} height={518} className="mx-auto mb-3 h-12 w-auto opacity-100" />
            <p className="text-[11px] font-medium tracking-[0.35em] uppercase text-gray-400 mb-6">
                {tagline}
            </p>
            <div className="flex justify-center gap-8 mb-6 text-[11px] font-medium tracking-widest uppercase text-gray-400">
                {footerLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="hover:text-black transition">
                        {link.label}
                    </Link>
                ))}
            </div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-300">
                {copyright}
            </p>
        </footer>
    );
}
