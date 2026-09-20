"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ActivityRow = {
  id: string;
  fiscal_year: number;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget_planned: number;
  budget_used: number | null;
};

const thb = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
export const STATUS_OPTIONS = ["รอดำเนินการ", "กำลังดำเนินการ", "เสร็จสิ้น", "ชะลอ", "ยกเลิก"];
export const STATUS_STYLE: Record<string, string> = {
  รอดำเนินการ: "bg-neutral-100 text-neutral-600",
  กำลังดำเนินการ: "bg-[#FFF6CC] text-neutral-800",
  เสร็จสิ้น: "bg-[#E6F4EC] text-[#0E7A3B]",
  ชะลอ: "bg-neutral-100 text-neutral-500",
  ยกเลิก: "bg-neutral-100 text-neutral-400 line-through",
};

export default function ActivitiesTable({
  rows: initialRows,
  showDepartment,
  departmentNameById,
}: {
  rows: (ActivityRow & { department_id?: string })[];
  showDepartment?: boolean;
  departmentNameById?: Record<string, string>;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState(initialRows);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ActivityRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function startEdit(row: ActivityRow) {
    setEditingId(row.id);
    setDraft({ ...row });
    setMsg(null);
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }
  async function saveEdit() {
    if (!draft) return;
    setBusyId(draft.id);
    setMsg(null);
    const { error } = await supabase
      .from("activities_projects")
      .update({
        fiscal_year: draft.fiscal_year,
        title: draft.title,
        description: draft.description || null,
        status: draft.status,
        start_date: draft.start_date || null,
        end_date: draft.end_date || null,
        budget_planned: draft.budget_planned ?? 0,
        budget_used: draft.budget_used ?? 0,
      })
      .eq("id", draft.id);
    setBusyId(null);
    if (error) {
      setMsg(`บันทึกไม่สำเร็จ: ${error.message}`);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === draft.id ? { ...r, ...draft } : r)));
    setEditingId(null);
    setDraft(null);
  }
  async function handleDelete(id: string) {
    if (!confirm("ยืนยันลบรายการนี้?")) return;
    setBusyId(id);
    setMsg(null);
    const { error } = await supabase.from("activities_projects").delete().eq("id", id);
    setBusyId(null);
    if (error) {
      setMsg(`ลบไม่สำเร็จ: ${error.message}`);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  if (rows.length === 0) return <p className="text-sm text-neutral-400">ยังไม่มีข้อมูล</p>;

  return (
    <div className="overflow-x-auto">
      {msg && <p className="mb-2 text-sm text-red-600">{msg}</p>}
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-neutral-500">
            <th className="pb-1.5 font-medium">ปีงบ</th>
            <th className="pb-1.5 font-medium">ชื่อโครงการ</th>
            {showDepartment && <th className="pb-1.5 font-medium">ฝ่าย</th>}
            <th className="pb-1.5 font-medium">ช่วงเวลา</th>
            <th className="pb-1.5 text-right font-medium">งบตามแผน</th>
            <th className="pb-1.5 text-right font-medium">ใช้จริง</th>
            <th className="pb-1.5 font-medium">สถานะ</th>
            <th className="w-28 pb-1.5 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isEditing = editingId === r.id;
            return (
              <tr key={r.id} className="border-t border-neutral-100 align-top">
                {isEditing && draft ? (
                  <>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        value={draft.fiscal_year}
                        onChange={(e) => setDraft({ ...draft, fiscal_year: Number(e.target.value) })}
                        className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={draft.title}
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                        className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                      />
                    </td>
                    {showDepartment && <td className="py-1.5 text-neutral-400">—</td>}
                    <td className="py-1.5 pr-2">
                      <div className="flex flex-col gap-1">
                        <input
                          type="date"
                          value={draft.start_date ?? ""}
                          onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs"
                        />
                        <input
                          type="date"
                          value={draft.end_date ?? ""}
                          onChange={(e) => setDraft({ ...draft, end_date: e.target.value })}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs"
                        />
                      </div>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        value={draft.budget_planned ?? 0}
                        onChange={(e) => setDraft({ ...draft, budget_planned: Number(e.target.value) })}
                        className="w-24 rounded border border-neutral-300 px-2 py-1 text-right text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        value={draft.budget_used ?? 0}
                        onChange={(e) => setDraft({ ...draft, budget_used: Number(e.target.value) })}
                        className="w-24 rounded border border-neutral-300 px-2 py-1 text-right text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        value={draft.status}
                        onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                        className="rounded border border-neutral-300 px-2 py-1 text-sm"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap py-1.5 text-xs">
                      <button onClick={saveEdit} disabled={busyId === r.id} className="mr-3 text-[#0E7A3B] hover:underline">
                        บันทึก
                      </button>
                      <button onClick={cancelEdit} className="text-neutral-400 hover:underline">
                        ยกเลิก
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 text-neutral-500">{r.fiscal_year}</td>
                    <td className="py-2">
                      <div>{r.title}</div>
                      {r.description && <div className="mt-0.5 text-xs text-neutral-400">{r.description}</div>}
                    </td>
                    {showDepartment && (
                      <td className="py-2 text-neutral-500">
                        {r.department_id ? departmentNameById?.[r.department_id] ?? "—" : "—"}
                      </td>
                    )}
                    <td className="py-2 text-neutral-500">
                      {r.start_date ?? "—"} – {r.end_date ?? "—"}
                    </td>
                    <td className="py-2 text-right text-neutral-500">
                      {r.budget_planned ? thb.format(r.budget_planned) : "—"}
                    </td>
                    <td className="py-2 text-right">{r.budget_used ? thb.format(r.budget_used) : "—"}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-3 py-1 text-xs ${STATUS_STYLE[r.status] ?? "bg-neutral-100 text-neutral-600"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-2 text-xs">
                      <button onClick={() => startEdit(r)} className="mr-3 text-[#0E7A3B] hover:underline">
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={busyId === r.id}
                        className="text-red-600 hover:underline"
                      >
                        ลบ
                      </button>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
