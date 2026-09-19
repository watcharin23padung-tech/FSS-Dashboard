import { createClient } from "@/lib/supabase/server";
import KpiTable from "@/components/crud/kpi-table";

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
  actual_q3_2569: number | null;
  activity_id: string | null;
};

type Department = { id: string; name_th: string };
type Activity = { id: string; title: string; department_id: string };

export default async function KpiPage() {
  const supabase = createClient();
  const [{ data: kpis }, { data: departments }, { data: activities }] = await Promise.all([
    supabase
      .from("kpis")
      .select("id, kpi_code, kpi_name, unit, target_2568, target_2569, target_2570, actual_q3_2569, activity_id")
      .order("kpi_code")
      .returns<Kpi[]>(),
    supabase.from("departments").select("id, name_th").returns<Department[]>(),
    supabase.from("activities_projects").select("id, title, department_id").returns<Activity[]>(),
  ]);

  const kpiList = kpis ?? [];
  const deptList = departments ?? [];
  const activityList = activities ?? [];
  const activityOptions = activityList.map((a) => {
    const dept = deptList.find((d) => d.id === a.department_id);
    return { id: a.id, label: `[${dept?.name_th ?? "—"}] ${a.title}` };
  });

  const onTrack = kpiList.filter(
    (k) => k.target_2570 != null && k.actual_q3_2569 != null && k.actual_q3_2569 >= k.target_2570
  ).length;
  const behind = kpiList.filter(
    (k) => k.target_2570 != null && k.actual_q3_2569 != null && k.actual_q3_2569 < k.target_2570
  ).length;
  const noData = kpiList.length - onTrack - behind;

  return (
    <div className="px-10 py-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">ตัวชี้วัดคณะ (KPI)</h1>
          <p className="mt-1 text-sm text-neutral-500">
            ทั้งหมด {kpiList.length} ตัวชี้วัด เทียบเป้าปี 2570 กับผลจริง Q3/2569
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
        <KpiTable rows={kpiList} activityOptions={activityOptions} />
      </div>
    </div>
  );
}
