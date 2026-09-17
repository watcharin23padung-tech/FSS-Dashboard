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
};

export default async function BudgetPage() {
  const supabase = createClient();

  const [{ data: departments }, { data: budgetItems }] = await Promise.all([
    supabase.from("departments").select("id, name_th").order("name_th").returns<Department[]>(),
    supabase
      .from("budget_items")
      .select("id, department_id, fiscal_year, category, budget_name, allocated_amount, used_amount")
      .returns<BudgetItem[]>(),
  ]);

  const deptList = departments ?? [];
  const allBudget = budgetItems ?? [];
  const fiscalYear = allBudget.length > 0 ? Math.max(...allBudget.map((b) => b.fiscal_year)) : null;
  const itemsThisYear = allBudget.filter((b) => b.fiscal_year === fiscalYear);

  const totalAllocated = itemsThisYear.reduce((s, b) => s + Number(b.allocated_amount), 0);
  const totalUsed = itemsThisYear.reduce((s, b) => s + Number(b.used_amount), 0);
  const overallPct = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;

  const groups = deptList
    .map((dept) => {
      const items = itemsThisYear.filter((b) => b.department_id === dept.id);
      const allocated = items.reduce((s, b) => s + Number(b.allocated_amount), 0);
      const used = items.reduce((s, b) => s + Number(b.used_amount), 0);
      return { dept, items, allocated, used };
    })
    .filter((g) => g.items.length > 0)
    .sort((a, b) => b.allocated - a.allocated);

  return (
    <div className="px-10 py-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">งบประมาณ</h1>
          <p className="mt-1 text-sm text-neutral-500">
            ปีงบประมาณ {fiscalYear ?? "—"} — รวม {thb.format(totalUsed)} / {thb.format(totalAllocated)} บาท (
            {overallPct}%)
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
        {groups.map(({ dept, items, allocated, used }) => {
          const pct = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
          return (
            <div key={dept.id} className="rounded-lg border border-neutral-200 p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-base font-semibold">{dept.name_th}</h2>
                <span className={`text-sm ${pct === 100 ? "text-[#0E7A3B] font-semibold" : "text-neutral-500"}`}>
                  {thb.format(used)} / {thb.format(allocated)} บาท ({pct}%)
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, background: pct === 100 ? "#0E7A3B" : "#FFD100" }}
                />
              </div>
              <BudgetTable rows={items} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
