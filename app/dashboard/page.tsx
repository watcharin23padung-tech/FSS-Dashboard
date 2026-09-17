// app/dashboard/page.tsx — Overview
// Header/nav now lives in app/dashboard/layout.tsx (shared across all /dashboard/* pages).

import { createClient } from "@/lib/supabase/server";
import BudgetDonut from "@/components/charts/budget-donut";
import DepartmentBudgetBar from "@/components/charts/department-budget-bar";
import KpiStatusPie from "@/components/charts/kpi-status-pie";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const thb = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

type Department = { id: string; name_th: string; name_en: string | null };
type BudgetItem = { department_id: string; fiscal_year: number; allocated_amount: number; used_amount: number };
type Activity = { department_id: string; fiscal_year: number; title: string; status: string };
type Personnel = { department_id: string };
type Kpi = {
  id: string;
  kpi_code: string;
  kpi_name: string;
  unit: string | null;
  target_2570: number | null;
  actual_q3_2569: number | null;
};

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: departments }, { data: budgetItems }, { data: activities }, { data: personnel }, { data: kpis }] =
    await Promise.all([
      supabase.from("departments").select("id, name_th, name_en").returns<Department[]>(),
      supabase
        .from("budget_items")
        .select("department_id, fiscal_year, allocated_amount, used_amount")
        .returns<BudgetItem[]>(),
      supabase
        .from("activities_projects")
        .select("department_id, fiscal_year, title, status")
        .returns<Activity[]>(),
      supabase.from("personnel").select("department_id").returns<Personnel[]>(),
      supabase
        .from("kpis")
        .select("id, kpi_code, kpi_name, unit, target_2570, actual_q3_2569")
        .order("kpi_code")
        .returns<Kpi[]>(),
    ]);

  const deptList = departments ?? [];
  const allBudget = budgetItems ?? [];
  const allActivities = activities ?? [];
  const allPersonnel = personnel ?? [];
  const kpiList = kpis ?? [];

  const fiscalYear = allBudget.length > 0 ? Math.max(...allBudget.map((b) => b.fiscal_year)) : null;
  const budgetThisYear = allBudget.filter((b) => b.fiscal_year === fiscalYear);
  const activitiesThisYear = allActivities.filter((a) => a.fiscal_year === fiscalYear);

  const totalAllocated = budgetThisYear.reduce((sum, b) => sum + Number(b.allocated_amount), 0);
  const totalUsed = budgetThisYear.reduce((sum, b) => sum + Number(b.used_amount), 0);
  const overallUtilization = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;
  const activeProjectCount = activitiesThisYear.filter((a) => a.status !== "เสร็จสิ้น").length;
  const kpiAchievedCount = kpiList.filter(
    (k) => k.target_2570 != null && k.actual_q3_2569 != null && k.actual_q3_2569 >= k.target_2570
  ).length;
  const kpiBehindCount = kpiList.filter(
    (k) => k.target_2570 != null && k.actual_q3_2569 != null && k.actual_q3_2569 < k.target_2570
  ).length;
  const kpiNoDataCount = kpiList.length - kpiAchievedCount - kpiBehindCount;

  const deptBudgetRows = deptList
    .map((dept) => {
      const items = budgetThisYear.filter((b) => b.department_id === dept.id);
      const allocated = items.reduce((sum, b) => sum + Number(b.allocated_amount), 0);
      const used = items.reduce((sum, b) => sum + Number(b.used_amount), 0);
      const pct = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
      return { name: dept.name_th, allocated, used, pct };
    })
    .filter((d) => d.allocated > 0)
    .sort((a, b) => b.allocated - a.allocated);

  return (
    <>
      {/* Metric strip */}
      <div className="grid grid-cols-5 divide-x divide-neutral-200 border-b border-neutral-200 px-10">
        <MetricTile label="ฝ่ายทั้งหมด" value={deptList.length || "—"} />
        <MetricTile label="บุคลากรทั้งหมด" value={allPersonnel.length || "—"} />
        <MetricTile label={`การเบิกจ่ายงบประมาณ (${fiscalYear ?? "—"})`} value={`${overallUtilization}%`} />
        <MetricTile label="โครงการที่ดำเนินอยู่" value={activeProjectCount} />
        <MetricTile label="KPI บรรลุเป้า" value={`${kpiAchievedCount} / ${kpiList.length || 0}`} accent />
      </div>

      {/* Main content — two columns */}
      <div className="grid grid-cols-[62%_38%] divide-x divide-neutral-200">
        {/* Left: budget + projects */}
        <section className="flex flex-col gap-6 px-10 py-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold">งบประมาณตามฝ่ายงาน</h2>
              <p className="text-xs text-neutral-500">
                ปีงบประมาณ {fiscalYear ?? "—"} — เทียบยอดได้รับจัดสรรแล้วกับงบประมาณรวม
              </p>
              <a href="/dashboard/budget" className="mt-2 inline-block text-sm text-[#0E7A3B] hover:underline">
                ดูรายละเอียด →
              </a>
            </div>
            <BudgetDonut usedPct={overallUtilization} />
          </div>

          {deptBudgetRows.length > 0 && (
            <DepartmentBudgetBar data={deptBudgetRows.slice(0, 8)} />
          )}

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="pb-1.5 font-medium">ฝ่ายงาน</th>
                <th className="pb-1.5 text-right font-medium">งบประมาณรวม</th>
                <th className="pb-1.5 text-right font-medium">ได้รับจัดสรรแล้ว</th>
                <th className="w-12 pb-1.5 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {deptBudgetRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-neutral-400">
                    ยังไม่มีข้อมูลงบประมาณสำหรับปีนี้
                  </td>
                </tr>
              )}
              {deptBudgetRows.map((d, i) => (
                <tr key={d.name} className="border-t border-neutral-200">
                  <td className="py-1">
                    {i + 1}. {d.name}
                  </td>
                  <td className="py-1 text-right text-neutral-500">{thb.format(d.allocated)}</td>
                  <td className="py-1 text-right">{thb.format(d.used)}</td>
                  <td className={`py-1 text-right ${d.pct === 100 ? "text-[#0E7A3B]" : ""}`}>{d.pct}%</td>
                </tr>
              ))}
              {deptBudgetRows.length > 0 && (
                <tr className="border-t-2 border-neutral-900 font-semibold">
                  <td className="py-1.5">รวมทั้งหมด</td>
                  <td className="py-1.5 text-right">{thb.format(totalAllocated)}</td>
                  <td className="py-1.5 text-right">{thb.format(totalUsed)}</td>
                  <td className="py-1.5 text-right text-[#0E7A3B]">{overallUtilization}%</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="my-1 h-px bg-neutral-200" />

          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">โครงการ/กิจกรรมล่าสุด</h2>
            <a href="/dashboard/projects" className="text-sm text-[#0E7A3B] hover:underline">
              จัดการโครงการ →
            </a>
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="pb-2 font-medium">ชื่อโครงการ</th>
                <th className="pb-2 font-medium">ฝ่าย</th>
                <th className="pb-2 font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {activitiesThisYear.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 text-neutral-400">
                    ยังไม่มีโครงการในปีงบประมาณนี้
                  </td>
                </tr>
              )}
              {activitiesThisYear.slice(0, 5).map((a, idx) => {
                const dept = deptList.find((d) => d.id === a.department_id);
                return (
                  <tr key={idx} className="border-t border-neutral-200">
                    <td className="py-2">{a.title}</td>
                    <td className="py-2 text-neutral-500">{dept?.name_th ?? "—"}</td>
                    <td className="py-2">
                      <span className="rounded-full bg-[#FFF6CC] px-3 py-1 text-xs">{a.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Right: KPI panel */}
        <section className="flex flex-col gap-4 px-10 py-7">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">ตัวชี้วัดคณะ (KPI)</h2>
            <a href="/dashboard/kpi" className="text-sm text-[#0E7A3B] hover:underline">
              ดูทั้งหมด →
            </a>
          </div>

          {kpiList.length > 0 && (
            <KpiStatusPie onTrack={kpiAchievedCount} behind={kpiBehindCount} noData={kpiNoDataCount} />
          )}

          <div className="flex flex-col gap-3">
            {kpiList.length === 0 && <p className="text-sm text-neutral-400">ยังไม่มีข้อมูล KPI</p>}
            {kpiList.slice(0, 3).map((k) => {
              const onTrack =
                k.target_2570 != null && k.actual_q3_2569 != null && k.actual_q3_2569 >= k.target_2570;
              return (
                <div key={k.id} className="rounded-lg border border-neutral-200 p-4">
                  <div className="text-sm font-medium">{k.kpi_name}</div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xs text-neutral-500">เป้าหมาย 2570</span>
                    <span className="text-sm">{k.target_2570 != null ? thb.format(k.target_2570) : "—"}</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xs text-neutral-500">ผลจริง Q3/2569</span>
                    <span className={`text-sm font-semibold ${onTrack ? "text-[#0E7A3B]" : ""}`}>
                      {k.actual_q3_2569 != null ? thb.format(k.actual_q3_2569) : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto flex flex-col gap-2 border-t border-neutral-200 pt-4">
            <a href="/dashboard/personnel" className="text-sm text-[#0E7A3B] hover:underline">
              ↳ ดูบุคลากรแยกตามฝ่าย
            </a>
          </div>
        </section>
      </div>
    </>
  );
}

function MetricTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="px-1 py-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`mt-1 font-display text-3xl font-semibold ${accent ? "text-[#0E7A3B]" : ""}`}>{value}</div>
    </div>
  );
}
