// app/dashboard/page.tsx — Overview
// Header/nav now lives in app/dashboard/layout.tsx (shared across all /dashboard/* pages).

import { createClient } from "@/lib/supabase/server";
import BudgetDonut from "@/components/charts/budget-donut";
import DepartmentBudgetBar from "@/components/charts/department-budget-bar";
import MiniDonut from "@/components/charts/mini-donut";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const thb = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

type Department = { id: string; name_th: string; name_en: string | null };
type BudgetItem = {
  department_id: string;
  fiscal_year: number;
  allocated_amount: number;
  used_amount: number;
  pending_midyear_amount: number;
};
type Activity = { department_id: string; fiscal_year: number; title: string; status: string };
type Personnel = { department_id: string };
type Kpi = {
  id: string;
  kpi_code: string;
  kpi_name: string;
  unit: string | null;
  target_2569: number | null;
  target_2570: number | null;
};
type KpiActual = { kpi_id: string; fiscal_year: number; quarter: number; value: number | null };

function latestAcrossYears(
  actuals: KpiActual[],
  kpiId: string,
  years: number[]
): { value: number; year: number; quarter: number } | null {
  for (const y of years) {
    for (const q of [4, 3, 2, 1]) {
      const found = actuals.find((a) => a.kpi_id === kpiId && a.fiscal_year === y && a.quarter === q)?.value;
      if (found != null) return { value: found, year: y, quarter: q };
    }
  }
  return null;
}

function summarize(
  kpiList: Kpi[],
  actuals: KpiActual[],
  year: number,
  target: (k: Kpi) => number | null
) {
  let achieved = 0;
  let behind = 0;
  for (const k of kpiList) {
    const latest = latestAcrossYears(actuals, k.id, [year]);
    const t = target(k);
    if (t != null && latest != null) {
      if (latest.value >= t) achieved++;
      else behind++;
    }
  }
  return { achieved, behind, noData: kpiList.length - achieved - behind };
}

export default async function DashboardPage() {
  const supabase = createClient();

  const [
    { data: departments },
    { data: budgetItems },
    { data: activities },
    { data: personnel },
    { data: kpis },
    { data: kpiActuals },
  ] = await Promise.all([
    supabase.from("departments").select("id, name_th, name_en").returns<Department[]>(),
    supabase
      .from("budget_items")
      .select("department_id, fiscal_year, allocated_amount, used_amount, pending_midyear_amount")
      .returns<BudgetItem[]>(),
    supabase
      .from("activities_projects")
      .select("department_id, fiscal_year, title, status")
      .returns<Activity[]>(),
    supabase.from("personnel").select("department_id").returns<Personnel[]>(),
    supabase.from("kpis").select("id, kpi_code, kpi_name, unit, target_2569, target_2570").order("kpi_code").returns<Kpi[]>(),
    supabase.from("kpi_actuals").select("kpi_id, fiscal_year, quarter, value").returns<KpiActual[]>(),
  ]);

  const deptList = departments ?? [];
  const allBudget = budgetItems ?? [];
  const allActivities = activities ?? [];
  const allPersonnel = personnel ?? [];
  const kpiList = kpis ?? [];
  const kpiActualsList = kpiActuals ?? [];

  const fiscalYear = allBudget.length > 0 ? Math.max(...allBudget.map((b) => b.fiscal_year)) : null;
  const budgetThisYear = allBudget.filter((b) => b.fiscal_year === fiscalYear);
  const activitiesThisYear = allActivities.filter((a) => a.fiscal_year === fiscalYear);

  const totalAllocated = budgetThisYear.reduce((sum, b) => sum + Number(b.allocated_amount), 0);
  const totalUsed = budgetThisYear.reduce((sum, b) => sum + Number(b.used_amount), 0);
  const totalPending = budgetThisYear.reduce((sum, b) => sum + Number(b.pending_midyear_amount), 0);
  const overallUtilization = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;
  const activeProjectCount = activitiesThisYear.filter((a) => a.status !== "เสร็จสิ้น").length;

  const prevKpiYear = fiscalYear != null ? fiscalYear - 1 : null;
  const summary2569 = prevKpiYear != null ? summarize(kpiList, kpiActualsList, prevKpiYear, (k) => k.target_2569) : null;
  const summary2570 = fiscalYear != null ? summarize(kpiList, kpiActualsList, fiscalYear, (k) => k.target_2570) : null;

  // Overview list below the donuts: FY2570 only — no cross-year fallback, so "no data yet" is shown honestly.
  const kpiRows = kpiList
    .map((k) => {
      const latest = fiscalYear != null ? latestAcrossYears(kpiActualsList, k.id, [fiscalYear]) : null;
      const onTrack = k.target_2570 != null && latest != null && latest.value >= k.target_2570;
      const pct =
        k.target_2570 != null && k.target_2570 > 0 && latest != null
          ? Math.min(100, Math.round((latest.value / k.target_2570) * 100))
          : null;
      // Sort priority: behind target first (needs attention), then achieved, then no data yet.
      const priority = latest == null ? 2 : onTrack ? 1 : 0;
      return { k, latest, onTrack, pct, priority };
    })
    .sort((a, b) => a.priority - b.priority);

  const deptBudgetRows = deptList
    .map((dept) => {
      const items = budgetThisYear.filter((b) => b.department_id === dept.id);
      const allocated = items.reduce((sum, b) => sum + Number(b.allocated_amount), 0);
      const used = items.reduce((sum, b) => sum + Number(b.used_amount), 0);
      const pending = items.reduce((sum, b) => sum + Number(b.pending_midyear_amount), 0);
      const pct = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
      return { name: dept.name_th, allocated, used, pending, pct };
    })
    .filter((d) => d.allocated > 0)
    .sort((a, b) => b.allocated - a.allocated);

  return (
    <>
      {/* Metric strip */}
      <div className="grid grid-cols-5 divide-x divide-neutral-200 border-b border-neutral-200 px-10">
        <MetricTile
          label="ฝ่ายทั้งหมด"
          value={deptList.length || "—"}
          caption={
            deptList.length > 0 ? `${deptBudgetRows.length} ฝ่ายมีข้อมูลงบประมาณปี ${fiscalYear ?? "—"}` : undefined
          }
        />
        <MetricTile label="บุคลากรทั้งหมด" value={allPersonnel.length || "—"} />
        <MetricTile label={`การเบิกจ่ายงบประมาณ (${fiscalYear ?? "—"})`} value={`${overallUtilization}%`} />
        <MetricTile label="โครงการที่ดำเนินอยู่" value={activeProjectCount} />
        <MetricTile
          label="KPI บรรลุเป้า (2570)"
          value={`${summary2570?.achieved ?? 0} / ${kpiList.length || 0}`}
          accent
        />
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

          {deptBudgetRows.length > 0 && <DepartmentBudgetBar data={deptBudgetRows} />}

          <div className="max-h-[360px] overflow-y-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="pb-1.5 font-medium">ฝ่ายงาน</th>
                  <th className="pb-1.5 text-right font-medium">งบที่ได้</th>
                  <th className="pb-1.5 text-right font-medium">ได้รับจัดสรร</th>
                  <th className="pb-1.5 text-right font-medium">รองบกลางปี</th>
                  <th className="w-12 pb-1.5 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {deptBudgetRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-3 text-neutral-400">
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
                    <td className="py-1 text-right text-neutral-500">
                      {d.pending > 0 ? thb.format(d.pending) : "—"}
                    </td>
                    <td className={`py-1 text-right ${d.pct === 100 ? "text-[#0E7A3B]" : ""}`}>{d.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {deptBudgetRows.length > 0 && (
            <table className="w-full border-collapse text-xs">
              <tbody>
                <tr className="border-t-2 border-neutral-900 font-semibold">
                  <td className="w-[36%] py-1.5">รวมทั้งหมด</td>
                  <td className="w-[21%] py-1.5 text-right">{thb.format(totalAllocated)}</td>
                  <td className="w-[21%] py-1.5 text-right">{thb.format(totalUsed)}</td>
                  <td className="w-[21%] py-1.5 text-right text-neutral-500">{thb.format(totalPending)}</td>
                  <td className="w-12 py-1.5 text-right text-[#0E7A3B]">{overallUtilization}%</td>
                </tr>
              </tbody>
            </table>
          )}

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

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-neutral-200 p-3">
              <div className="text-xs font-medium text-neutral-500">สรุปผล 2569</div>
              {summary2569 ? (
                <MiniDonut achieved={summary2569.achieved} behind={summary2569.behind} noData={summary2569.noData} />
              ) : (
                <p className="mt-2 text-xs text-neutral-400">ไม่มีข้อมูล</p>
              )}
            </div>
            <div className="rounded-lg border border-neutral-200 p-3">
              <div className="text-xs font-medium text-neutral-500">สรุปผล 2570</div>
              {summary2570 ? (
                <MiniDonut achieved={summary2570.achieved} behind={summary2570.behind} noData={summary2570.noData} />
              ) : (
                <p className="mt-2 text-xs text-neutral-400">ไม่มีข้อมูล</p>
              )}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-neutral-500">รายละเอียดตัวชี้วัด — ปีงบประมาณ {fiscalYear ?? "—"}</div>
            <div className="flex max-h-[420px] flex-col gap-1 overflow-y-auto pr-1">
              {kpiRows.length === 0 && <p className="text-sm text-neutral-400">ยังไม่มีข้อมูล KPI</p>}
              {kpiRows.map(({ k, latest, onTrack, pct }) => (
                <div key={k.id} className="border-b border-neutral-100 py-2 last:border-b-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm leading-snug">{k.kpi_name}</span>
                    <span
                      className={`shrink-0 whitespace-nowrap text-sm font-semibold ${
                        latest == null ? "text-neutral-300" : onTrack ? "text-[#0E7A3B]" : "text-red-600"
                      }`}
                    >
                      {latest != null ? thb.format(latest.value) : "—"}
                      {k.target_2570 != null && <span className="text-neutral-400"> /{thb.format(k.target_2570)}</span>}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full"
                        style={{
                          width: `${pct ?? 0}%`,
                          background: onTrack ? "#0E7A3B" : pct != null ? "#DC2626" : "transparent",
                        }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-[10px] text-neutral-400">
                      {latest != null ? `Q${latest.quarter}/${fiscalYear}` : "ยังไม่มีผล 2570"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
  caption,
  accent = false,
}: {
  label: string;
  value: string | number;
  caption?: string;
  accent?: boolean;
}) {
  return (
    <div className="px-1 py-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`mt-1 font-display text-3xl font-semibold ${accent ? "text-[#0E7A3B]" : ""}`}>{value}</div>
      {caption && <div className="mt-0.5 text-[11px] text-neutral-400">{caption}</div>}
    </div>
  );
}
