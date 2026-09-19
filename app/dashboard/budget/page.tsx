import { createClient } from "@/lib/supabase/server";
import BudgetTable from "@/components/crud/budget-table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const thb = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

type Department = { id: string; name_th: string };
type BudgetItem = {
  id: string;
  department_id: string;
  fiscal_year: number;
  category: string;
  budget_name: string;
  allocated_amount: number;
  used_amount: number;
  pending_midyear_amount: number;
};
type Activity = { department_id: string; fiscal_year: number; budget_used: number | null };

export default async function BudgetPage() {
  const supabase = createClient();

  const [{ data: departments }, { data: budgetItems }, { data: activities }] = await Promise.all([
    supabase.from("departments").select("id, name_th").order("name_th").returns<Department[]>(),
    supabase
      .from("budget_items")
      .select("id, department_id, fiscal_year, category, budget_name, allocated_amount, used_amount, pending_midyear_amount")
      .returns<BudgetItem[]>(),
    supabase.from("activities_projects").select("department_id, fiscal_year, budget_used").returns<Activity[]>(),
  ]);

  const deptList = departments ?? [];
  const allBudget = budgetItems ?? [];
  const allActivities = activities ?? [];
  const fiscalYear = allBudget.length > 0 ? Math.max(...allBudget.map((b) => b.fiscal_year)) : null;
  const itemsThisYear = allBudget.filter((b) => b.fiscal_year === fiscalYear);
  const activitiesThisYear = allActivities.filter((a) => a.fiscal_year === fiscalYear);

  const totalAllocated = itemsThisYear.reduce((s, b) => s + Number(b.allocated_amount), 0);
  const totalGranted = itemsThisYear.reduce((s, b) => s + Number(b.used_amount), 0);
  const totalPending = itemsThisYear.reduce((s, b) => s + Number(b.pending_midyear_amount), 0);
  const totalSpent = activitiesThisYear.reduce((s, a) => s + Number(a.budget_used ?? 0), 0);
  const overallPct = totalAllocated > 0 ? Math.round((totalGranted / totalAllocated) * 100) : 0;

  const groups = deptList
    .map((dept) => {
      const items = itemsThisYear.filter((b) => b.department_id === dept.id);
      const allocated = items.reduce((s, b) => s + Number(b.allocated_amount), 0);
      const granted = items.reduce((s, b) => s + Number(b.used_amount), 0);
      const pending = items.reduce((s, b) => s + Number(b.pending_midyear_amount), 0);
      const spent = activitiesThisYear
        .filter((a) => a.department_id === dept.id)
        .reduce((s, a) => s + Number(a.budget_used ?? 0), 0);
      return { dept, items, allocated, granted, pending, spent };
    })
    .filter((g) => g.items.length > 0)
    .sort((a, b) => b.allocated - a.allocated);

  return (
    <div className="px-10 py-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">งบประมาณ</h1>
          <p className="mt-1 text-sm text-neutral-500">
            ปีงบประมาณ {fiscalYear ?? "—"} — งบที่ได้ {thb.format(totalAllocated)} / ได้รับจัดสรร{" "}
            {thb.format(totalGranted)} ({overallPct}%) / รองบกลางปี {thb.format(totalPending)} / ใช้แล้วจริง{" "}
            {thb.format(totalSpent)} บาท
          </p>
        </div>
        <a href="/admin" className="text-sm text-[#0E7A3B] hover:underline">
          + เพิ่มรายการงบประมาณ →
        </a>
      </div>

      {groups.length === 0 && (
        <p className="mt-8 text-sm text-neutral-400">ยังไม่มีข้อมูลงบประมาณสำหรับปีนี้</p>
      )}

      <div className="mt-8 flex flex-col gap-6">
        {groups.map(({ dept, items, allocated, granted, pending, spent }) => {
          const pct = allocated > 0 ? Math.min(100, Math.round((granted / allocated) * 100)) : 0;
          return (
            <div key={dept.id} className="rounded-lg border border-neutral-200 p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-base font-semibold">{dept.name_th}</h2>
                <span className={`text-sm ${pct === 100 ? "text-[#0E7A3B] font-semibold" : "text-neutral-500"}`}>
                  ได้รับจัดสรร {thb.format(granted)} / {thb.format(allocated)} บาท ({pct}%)
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, background: pct === 100 ? "#0E7A3B" : "#FFD100" }}
                />
              </div>

              {/* 4-metric summary strip */}
              <div className="mt-3 grid grid-cols-4 divide-x divide-neutral-100 rounded-md border border-neutral-100 bg-neutral-50/60 text-center text-xs">
                <div className="px-2 py-2">
                  <div className="text-neutral-400">งบที่ได้</div>
                  <div className="mt-0.5 font-semibold text-neutral-800">{thb.format(allocated)}</div>
                </div>
                <div className="px-2 py-2">
                  <div className="text-neutral-400">ได้รับจัดสรร</div>
                  <div className="mt-0.5 font-semibold text-neutral-800">{thb.format(granted)}</div>
                </div>
                <div className="px-2 py-2">
                  <div className="text-neutral-400">รองบกลางปี</div>
                  <div className="mt-0.5 font-semibold text-neutral-800">
                    {pending > 0 ? thb.format(pending) : "—"}
                  </div>
                </div>
                <div className="px-2 py-2">
                  <div className="text-neutral-400">งบที่ใช้แล้ว (จากโครงการ)</div>
                  <div className="mt-0.5 font-semibold text-[#0E7A3B]">
                    {spent > 0 ? thb.format(spent) : "—"}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <BudgetTable rows={items} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
