import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const thb = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
const thaiDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
};

type Department = { id: string; name_th: string };
type BudgetItem = { department_id: string; fiscal_year: number; allocated_amount: number; used_amount: number };
type Activity = {
  id: string;
  department_id: string;
  fiscal_year: number;
  title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
};
type Kpi = {
  id: string;
  kpi_name: string;
  target_2570: number | null;
  activity_id: string | null;
};
type KpiActual = { kpi_id: string; fiscal_year: number; quarter: number; value: number | null };

function latestQuarterValue(actuals: KpiActual[], kpiId: string, fiscalYear: number): number | null {
  const forKpi = actuals.filter((a) => a.kpi_id === kpiId && a.fiscal_year === fiscalYear);
  for (const q of [4, 3, 2, 1]) {
    const found = forKpi.find((a) => a.quarter === q)?.value;
    if (found != null) return found;
  }
  return null;
}

const STATUS_STYLE: Record<string, string> = {
  เสร็จสิ้น: "bg-[#E6F4EC] text-[#0E7A3B]",
  กำลังดำเนินการ: "bg-[#FFF6CC] text-neutral-800",
  ชะลอ: "bg-neutral-100 text-neutral-600",
  ยกเลิก: "bg-neutral-100 text-neutral-400 line-through",
};

export default async function TrackingPage() {
  const supabase = createClient();
  const today = new Date();

  const [{ data: departments }, { data: budgetItems }, { data: activities }, { data: kpis }, { data: kpiActuals }] =
    await Promise.all([
      supabase.from("departments").select("id, name_th").order("name_th").returns<Department[]>(),
      supabase
        .from("budget_items")
        .select("department_id, fiscal_year, allocated_amount, used_amount")
        .returns<BudgetItem[]>(),
      supabase
        .from("activities_projects")
        .select("id, department_id, fiscal_year, title, status, start_date, end_date")
        .returns<Activity[]>(),
      supabase.from("kpis").select("id, kpi_name, target_2570, activity_id").returns<Kpi[]>(),
      supabase.from("kpi_actuals").select("kpi_id, fiscal_year, quarter, value").returns<KpiActual[]>(),
    ]);

  const deptList = departments ?? [];
  const allBudget = budgetItems ?? [];
  const allActivities = activities ?? [];
  const allKpis = kpis ?? [];
  const allKpiActuals = kpiActuals ?? [];

  const fiscalYear = allBudget.length > 0 ? Math.max(...allBudget.map((b) => b.fiscal_year)) : null;
  const budgetThisYear = allBudget.filter((b) => b.fiscal_year === fiscalYear);
  const activitiesThisYear = allActivities.filter((a) => a.fiscal_year === fiscalYear);

  const isOverdue = (a: Activity) =>
    !!a.end_date && new Date(a.end_date) < today && a.status !== "เสร็จสิ้น" && a.status !== "ยกเลิก";

  const totalProjects = activitiesThisYear.length;
  const totalDone = activitiesThisYear.filter((a) => a.status === "เสร็จสิ้น").length;
  const totalOverdue = activitiesThisYear.filter(isOverdue).length;
  const totalRemaining = totalProjects - totalDone;

  const rows = deptList.map((dept) => {
    const budget = budgetThisYear.filter((b) => b.department_id === dept.id);
    const allocated = budget.reduce((s, b) => s + Number(b.allocated_amount), 0);
    const used = budget.reduce((s, b) => s + Number(b.used_amount), 0);
    const pct = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;

    const projects = activitiesThisYear
      .filter((a) => a.department_id === dept.id)
      .map((a) => ({
        ...a,
        overdue: isOverdue(a),
        kpisLinked: allKpis
          .filter((k) => k.activity_id === a.id)
          .map((k) => ({ ...k, latest: fiscalYear != null ? latestQuarterValue(allKpiActuals, k.id, fiscalYear) : null })),
      }));

    return { dept, allocated, used, pct, projects };
  });

  return (
    <div className="px-10 py-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">ติดตามงานฝ่าย</h1>
          <p className="mt-1 text-sm text-neutral-500">
            ปีงบประมาณ {fiscalYear ?? "—"} — งบประมาณ โครงการ และความคืบหน้าเทียบกรอบเวลาของแต่ละฝ่าย
          </p>
        </div>
        <a href="/admin" className="text-sm text-[#0E7A3B] hover:underline">
          + เพิ่มโครงการ →
        </a>
      </div>

      <div className="mt-6 flex gap-3 text-sm">
        <span className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 font-medium text-neutral-600">
          โครงการทั้งหมด {totalProjects}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-[#0E7A3B] px-3 py-1.5 font-medium text-white">
          <span className="h-2 w-2 rounded-full bg-white" /> เสร็จสิ้นแล้ว {totalDone}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-[#FFF6CC] px-3 py-1.5 font-medium text-neutral-800">
          ยังเหลือ {totalRemaining}
        </span>
        {totalOverdue > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 font-medium text-white">
            <span className="h-2 w-2 rounded-full bg-white" /> เกินกำหนด {totalOverdue}
          </span>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {rows.map(({ dept, allocated, used, pct, projects }) => {
          const done = projects.filter((p) => p.status === "เสร็จสิ้น").length;
          const overdue = projects.filter((p) => p.overdue).length;

          return (
            <div key={dept.id} className="rounded-lg border border-neutral-200 p-5">
              {/* Header: department name + budget summary */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-display text-base font-semibold">{dept.name_th}</h2>
                <div className="text-right">
                  <span className={`text-sm ${pct === 100 ? "font-semibold text-[#0E7A3B]" : "text-neutral-500"}`}>
                    งบ: {thb.format(used)} / {thb.format(allocated)} บาท ({pct}%)
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, background: pct === 100 ? "#0E7A3B" : "#FFD100" }}
                />
              </div>

              {/* Summary chips for this department */}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600">
                  โครงการ {projects.length} รายการ
                </span>
                <span className="rounded-full bg-[#E6F4EC] px-2.5 py-1 text-[#0E7A3B]">เสร็จสิ้น {done}</span>
                <span className="rounded-full bg-[#FFF6CC] px-2.5 py-1 text-neutral-800">
                  ยังเหลือ {projects.length - done}
                </span>
                {overdue > 0 && (
                  <span className="rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-700">
                    เกินกำหนด {overdue}
                  </span>
                )}
              </div>

              {/* Project list with timeline status and linked KPIs */}
              {projects.length === 0 ? (
                <p className="mt-4 text-sm text-neutral-400">ยังไม่มีโครงการในปีงบประมาณนี้</p>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {projects.map((p) => (
                    <div key={p.id} className="rounded-md border border-neutral-100 bg-neutral-50/50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium">{p.title}</span>
                        <div className="flex items-center gap-2">
                          {p.overdue && (
                            <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                              เกินกำหนด
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs ${
                              STATUS_STYLE[p.status] ?? "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        กรอบเวลา: {thaiDate(p.start_date)} – {thaiDate(p.end_date)}
                      </p>

                      {p.kpisLinked.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {p.kpisLinked.map((k) => {
                            const onTrack = k.target_2570 != null && k.latest != null && k.latest >= k.target_2570;
                            return (
                              <span
                                key={k.id}
                                className={`rounded-full px-2.5 py-0.5 text-xs ${
                                  onTrack ? "bg-[#0E7A3B] text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-300"
                                }`}
                                title={k.kpi_name}
                              >
                                {k.kpi_name}: {k.latest != null ? thb.format(k.latest) : "—"} /{" "}
                                {k.target_2570 != null ? thb.format(k.target_2570) : "—"}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
