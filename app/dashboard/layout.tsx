import { createClient } from "@/lib/supabase/server";
import TopNav from "@/components/top-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: budgetItems } = await supabase.from("budget_items").select("fiscal_year");
  const fiscalYear =
    budgetItems && budgetItems.length > 0
      ? Math.max(...budgetItems.map((b) => b.fiscal_year))
      : null;

  return (
    <div className="min-h-screen bg-white font-body text-neutral-900">
      {/* Brand stripe: green + yellow, echoing the faculty logo's underline */}
      <div className="h-1 w-full bg-gradient-to-r from-[#0E7A3B] via-[#0E7A3B] to-[#FFD100]" />

      <header className="flex items-center justify-between border-b border-neutral-200 px-10 py-5">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ตราสัญลักษณ์ BUU และคณะวิทยาศาสตร์การกีฬา" className="h-9 w-auto" />
          <div className="h-8 w-px bg-neutral-200" />
          <div>
            <div className="font-display text-lg font-semibold leading-tight">คณะวิทยาศาสตร์การกีฬา</div>
            <div className="text-xs text-neutral-500">มหาวิทยาลัยบูรพา — ระบบภาพรวมการบริหารจัดการ</div>
          </div>
        </div>

        <TopNav />

        <div className="flex items-center gap-4">
          <div className="text-right text-xs text-neutral-500">
            ปีงบประมาณ {fiscalYear ?? "—"}
            <br />
            ปรับปรุงล่าสุด: วันนี้
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFD100] text-xs font-bold">
            SS
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
