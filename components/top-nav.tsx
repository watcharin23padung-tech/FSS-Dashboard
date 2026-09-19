"use client";

import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "ภาพรวม", href: "/dashboard" },
  { label: "ติดตามฝ่าย", href: "/dashboard/tracking" },
  { label: "บุคลากร", href: "/dashboard/personnel" },
  { label: "งบประมาณ", href: "/dashboard/budget" },
  { label: "โครงการ", href: "/dashboard/projects" },
  { label: "ตัวชี้วัด (KPI)", href: "/dashboard/kpi" },
  { label: "จัดการข้อมูล", href: "/admin" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-8 text-sm font-medium">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <a
            key={item.href}
            href={item.href}
            className={
              active
                ? "border-b-2 border-[#0E7A3B] pb-1 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-900"
            }
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
