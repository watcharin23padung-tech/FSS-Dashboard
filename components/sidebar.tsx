"use client";

import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: "◎" },
  { href: "/admin", label: "จัดการข้อมูล", icon: "＋" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-navy px-4 py-6 min-h-screen hidden md:flex md:flex-col">
      <div className="px-2">
        <p className="font-display text-base font-semibold text-white leading-tight">
          คณะวิทยาศาสตร์การกีฬา
        </p>
        <p className="font-body text-xs text-white/50 mt-0.5">มหาวิทยาลัยบูรพา</p>
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 font-body text-sm transition ${
                active
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-gold text-base leading-none">{item.icon}</span>
              {item.label}
            </a>
          );
        })}
      </nav>

      <div className="mt-auto px-2">
        <p className="font-body text-xs text-white/30">SCI-SPORT BUU Dashboard</p>
      </div>
    </aside>
  );
}
