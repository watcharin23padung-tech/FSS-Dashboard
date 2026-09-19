import { createClient } from "@/lib/supabase/server";
import TopNav from "@/components/top-nav";
import AdminPanel from "./admin-panel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const supabase = createClient();
  const [
    { data: departments },
    { data: personnel },
    { data: budgetItems },
    { data: activities },
    { data: kpis },
    { data: kpiActuals },
  ] = await Promise.all([
    supabase.from("departments").select("id, name_th, name_en").order("name_th"),
    supabase
      .from("personnel")
      .select("id, department_id, full_name, position, employment_type, email, phone")
      .order("full_name"),
    supabase
      .from("budget_items")
      .select("id, department_id, fiscal_year, category, budget_name, allocated_amount, used_amount, pending_midyear_amount")
      .order("fiscal_year", { ascending: false }),
    supabase
      .from("activities_projects")
      .select("id, department_id, fiscal_year, title, description, status, start_date, end_date, budget_used")
      .order("fiscal_year", { ascending: false }),
    supabase
      .from("kpis")
      .select("id, kpi_code, kpi_name, unit, target_2568, target_2569, target_2570, activity_id")
      .order("kpi_code"),
    supabase.from("kpi_actuals").select("kpi_id, fiscal_year, quarter, value"),
  ]);

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

      <div className="px-10 py-8">
        <h1 className="font-display text-xl font-semibold">จัดการข้อมูล</h1>
        <p className="mt-1 text-sm text-neutral-500">เพิ่ม แก้ไข หรือลบข้อมูลฝ่าย บุคลากร งบประมาณ โครงการ และตัวชี้วัด</p>

        <div className="mt-8">
          <AdminPanel
            initialDepartments={departments ?? []}
            initialPersonnel={personnel ?? []}
            initialBudgetItems={budgetItems ?? []}
            initialActivities={activities ?? []}
            initialKpis={kpis ?? []}
            initialKpiActuals={kpiActuals ?? []}
            fiscalYear={fiscalYear ?? new Date().getFullYear() + 543}
          />
        </div>
      </div>
    </div>
  );
}
