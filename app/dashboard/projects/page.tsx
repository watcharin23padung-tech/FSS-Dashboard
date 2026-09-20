import { createClient } from "@/lib/supabase/server";
import ActivitiesTable from "@/components/crud/activities-table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Department = { id: string; name_th: string };
type Activity = {
  id: string;
  department_id: string;
  fiscal_year: number;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget_planned: number;
  budget_used: number | null;
};

export default async function ProjectsPage() {
  const supabase = createClient();

  const [{ data: departments }, { data: activities }] = await Promise.all([
    supabase.from("departments").select("id, name_th").returns<Department[]>(),
    supabase
      .from("activities_projects")
      .select("id, department_id, fiscal_year, title, description, status, start_date, end_date, budget_planned, budget_used")
      .order("fiscal_year", { ascending: false })
      .returns<Activity[]>(),
  ]);

  const deptList = departments ?? [];
  const allActivities = activities ?? [];
  const fiscalYear = allActivities.length > 0 ? Math.max(...allActivities.map((a) => a.fiscal_year)) : null;

  const byStatus = (status: string) => allActivities.filter((a) => a.status === status).length;
  const departmentNameById = Object.fromEntries(deptList.map((d) => [d.id, d.name_th]));

  return (
    <div className="px-10 py-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">โครงการ/กิจกรรม</h1>
          <p className="mt-1 text-sm text-neutral-500">
            ทั้งหมด {allActivities.length} รายการ
            {fiscalYear && ` — ปีล่าสุด ${fiscalYear}`}
          </p>
        </div>
        <a href="/admin" className="text-sm text-[#0E7A3B] hover:underline">
          + เพิ่มโครงการ →
        </a>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-600">รอดำเนินการ {byStatus("รอดำเนินการ")}</span>
        <span className="rounded-full bg-[#FFF6CC] px-3 py-1">กำลังดำเนินการ {byStatus("กำลังดำเนินการ")}</span>
        <span className="rounded-full bg-[#E6F4EC] px-3 py-1 text-[#0E7A3B]">เสร็จสิ้น {byStatus("เสร็จสิ้น")}</span>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-500">ชะลอ {byStatus("ชะลอ")}</span>
        <span className="rounded-full bg-red-50 px-3 py-1 text-red-600">ยกเลิก {byStatus("ยกเลิก")}</span>
      </div>

      <div className="mt-6">
        <ActivitiesTable rows={allActivities} showDepartment departmentNameById={departmentNameById} />
      </div>
    </div>
  );
}
