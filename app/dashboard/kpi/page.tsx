import { createClient } from "@/lib/supabase/server";
import KpiTable, { QuarterlyActuals } from "@/components/crud/kpi-table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Kpi = {
  id: string;
  kpi_code: string;
  kpi_name: string;
  unit: string | null;
  target_2568: number | null;
  target_2569: number | null;
  target_2570: number | null;
  activity_id: string | null;
};
type Department = { id: string; name_th: string };
type Activity = { id: string; title: string; department_id: string };
type BudgetItem = { fiscal_year: number };
type KpiActual = { kpi_id: string; fiscal_year: number; quarter: number; value: number | null };

function latestQuarterValue(q: QuarterlyActuals): number | null {
  if (q.q4 != null) return q.q4;
  if (q.q3 != null) return q.q3;
  if (q.q2 != null) return q.q2;
  if (q.q1 != null) return q.q1;
  return null;
}

export default async function KpiPage() {
  const supabase = createClient();
  const [{ data: kpis }, { data: departments }, { data: activities }, { data: budgetItems }, { data: kpiActuals }] =
    await Promise.all([
      supabase
        .from("kpis")
        .select("id, kpi_code, kpi_name, unit, target_2568, target_2569, target_2570, activity_id")
        .order("kpi_code")
        .returns<Kpi[]>(),
      supabase.from("departments").select("id, name_th").returns<Department[]>(),
      supabase.from("activities_projects").select("id, title, department_id").returns<Activity[]>(),
      supabase.from("budget_items").select("fiscal_year").returns<BudgetItem[]>(),
      supabase.from("kpi_actuals").select("kpi_id, fiscal_year, quarter, value").returns<KpiActual[]>(),
    ]);

  const kpiList = kpis ?? [];
  const deptList = departments ?? [];
  const activityList = activities ?? [];
  const actualsList = kpiActuals ?? [];
  const allBudget = budgetItems ?? [];

  const fiscalYear = allBudget.length > 0 ? Math.max(...allBudget.map((b) => b.fiscal_year)) : new Date().getFullYear() + 543;
  const prevFiscalYear = fiscalYear - 1;

  const activityOptions = activityList.map((a) => {
    const dept = deptList.find((d) => d.id === a.department_id);
    return { id: a.id, label: `[${dept?.name_th ?? "—"}] ${a.title}` };
  });

  const quarterlyByKpi: Record<string, QuarterlyActuals> = {};
  for (const k of kpiList) {
    const rowsForKpi = actualsList.filter((a) => a.kpi_id === k.id);
    quarterlyByKpi[k.id] = {
      prev: rowsForKpi.find((a) => a.fiscal_year === prevFiscalYear && a.quarter === 3)?.value ?? null,
      q1: rowsForKpi.find((a) => a.fiscal_year === fiscalYear && a.quarter === 1)?.value ?? null,
      q2: rowsForKpi.find((a) => a.fiscal_year === fiscalYear && a.quarter === 2)?.value ?? null,
      q3: rowsForKpi.find((a) => a.fiscal_year === fiscalYear && a.quarter === 3)?.value ?? null,
      q4: rowsForKpi.find((a) => a.fiscal_year === fiscalYear && a.quarter === 4)?.value ?? null,
    };
  }

  const onTrack = kpiList.filter((k) => {
    const latest = latestQuarterValue(quarterlyByKpi[k.id]);
    return k.target_2570 != null && latest != null && latest >= k.target_2570;
  }).length;
  const behind = kpiList.filter((k) => {
    const latest = latestQuarterValue(quarterlyByKpi[k.id]);
    return k.target_2570 != null && latest != null && latest < k.target_2570;
  }).length;
  const noData = kpiList.length - onTrack - behind;

  return (
    <div className="px-10 py-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">ตัวชี้วัดคณะ (KPI)</h1>
          <p className="mt-1 text-sm text-neutral-500">
            ทั้งหมด {kpiList.length} ตัวชี้วัด เทียบเป้าปี {fiscalYear} กับผลจริงล่าสุดที่มีข้อมูล
          </p>
        </div>
        <a href="/admin" className="text-sm text-[#0E7A3B] hover:underline">
          + เพิ่มตัวชี้วัด →
        </a>
      </div>

      <div className="mt-6 flex gap-3 text-sm">
        <span className="flex items-center gap-1.5 rounded-full bg-[#0E7A3B] px-3 py-1.5 font-medium text-white">
          <span className="h-2 w-2 rounded-full bg-white" /> บรรลุเป้าแล้ว {onTrack}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 font-medium text-white">
          <span className="h-2 w-2 rounded-full bg-white" /> ยังไม่ถึงเป้า {behind}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 font-medium text-neutral-600">
          <span className="h-2 w-2 rounded-full bg-neutral-400" /> ยังไม่มีผลดำเนินงาน {noData}
        </span>
      </div>

      <div className="mt-6">
        <KpiTable
          rows={kpiList}
          activityOptions={activityOptions}
          quarterlyByKpi={quarterlyByKpi}
          fiscalYear={fiscalYear}
          prevFiscalYear={prevFiscalYear}
        />
      </div>
    </div>
  );
}
