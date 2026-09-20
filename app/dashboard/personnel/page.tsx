import { createClient } from "@/lib/supabase/server";
import PersonnelTable from "@/components/crud/personnel-table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Department = { id: string; name_th: string };
type Personnel = {
  id: string;
  department_id: string;
  full_name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  is_head: boolean;
};

export default async function PersonnelPage() {
  const supabase = createClient();

  const [{ data: departments }, { data: personnel }] = await Promise.all([
    supabase.from("departments").select("id, name_th").order("name_th").returns<Department[]>(),
    supabase
      .from("personnel")
      .select("id, department_id, full_name, position, email, phone, is_head")
      .order("full_name")
      .returns<Personnel[]>(),
  ]);

  const deptList = departments ?? [];
  const allPersonnel = personnel ?? [];

  const groups = deptList
    .map((dept) => ({
      dept,
      people: allPersonnel.filter((p) => p.department_id === dept.id),
    }))
    .filter((g) => g.people.length > 0);

  return (
    <div className="px-10 py-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">บุคลากร</h1>
          <p className="mt-1 text-sm text-neutral-500">
            บุคลากรทั้งหมด {allPersonnel.length} คน จาก {groups.length} ฝ่าย
          </p>
        </div>
        <a href="/admin" className="text-sm text-[#0E7A3B] hover:underline">
          + เพิ่มบุคลากร →
        </a>
      </div>

      {groups.length === 0 && (
        <p className="mt-8 text-sm text-neutral-400">ยังไม่มีข้อมูลบุคลากรในระบบ</p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {groups.map(({ dept, people }) => (
          <div key={dept.id} className="rounded-lg border border-neutral-200 p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-base font-semibold">{dept.name_th}</h2>
              <span className="text-xs text-neutral-500">{people.length} คน</span>
            </div>
            <PersonnelTable rows={people} />
          </div>
        ))}
      </div>
    </div>
  );
}
