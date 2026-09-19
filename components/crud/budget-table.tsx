"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type BudgetRow = {
  id: string;
  fiscal_year: number;
  category: string;
  budget_name: string;
  allocated_amount: number;
  used_amount: number;
  pending_midyear_amount: number;
};

const thb = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

export default function BudgetTable({ rows: initialRows }: { rows: BudgetRow[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState(initialRows);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BudgetRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function startEdit(row: BudgetRow) {
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
      .from("budget_items")
      .update({
        fiscal_year: draft.fiscal_year,
        category: draft.category,
        budget_name: draft.budget_name,
        allocated_amount: draft.allocated_amount,
        used_amount: draft.used_amount,
        pending_midyear_amount: draft.pending_midyear_amount,
      })
      .eq("id", draft.id);
    setBusyId(null);
    if (error) {
      setMsg(`บันทึกไม่สำเร็จ: ${error.message}`);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === draft.id ? draft : r)));
    setEditingId(null);
    setDraft(null);
  }
  async function handleDelete(id: string) {
    if (!confirm("ยืนยันลบรายการนี้?")) return;
    setBusyId(id);
    setMsg(null);
    const { error } = await supabase.from("budget_items").delete().eq("id", id);
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
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-neutral-500">
            <th className="pb-1.5 font-medium">ปีงบ</th>
            <th className="pb-1.5 font-medium">หมวดงบ</th>
            <th className="pb-1.5 font-medium">ชื่อรายการ</th>
            <th className="pb-1.5 text-right font-medium">งบที่ได้</th>
            <th className="pb-1.5 text-right font-medium">ได้รับจัดสรร</th>
            <th className="pb-1.5 text-right font-medium">รองบกลางปี</th>
            <th className="w-28 pb-1.5 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isEditing = editingId === r.id;
            return (
              <tr key={r.id} className="border-t border-neutral-100">
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
                        value={draft.category}
                        onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                        className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={draft.budget_name}
                        onChange={(e) => setDraft({ ...draft, budget_name: e.target.value })}
                        className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        value={draft.allocated_amount}
                        onChange={(e) => setDraft({ ...draft, allocated_amount: Number(e.target.value) })}
                        className="w-28 rounded border border-neutral-300 px-2 py-1 text-right text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        value={draft.used_amount}
                        onChange={(e) => setDraft({ ...draft, used_amount: Number(e.target.value) })}
                        className="w-28 rounded border border-neutral-300 px-2 py-1 text-right text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        value={draft.pending_midyear_amount}
                        onChange={(e) => setDraft({ ...draft, pending_midyear_amount: Number(e.target.value) })}
                        className="w-28 rounded border border-neutral-300 px-2 py-1 text-right text-sm"
                      />
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
                    <td className="py-1.5 text-neutral-500">{r.fiscal_year}</td>
                    <td className="py-1.5 text-neutral-500">{r.category}</td>
                    <td className="py-1.5">{r.budget_name}</td>
                    <td className="py-1.5 text-right">{thb.format(r.allocated_amount)}</td>
                    <td className="py-1.5 text-right">{thb.format(r.used_amount)}</td>
                    <td className="py-1.5 text-right text-neutral-500">
                      {r.pending_midyear_amount > 0 ? thb.format(r.pending_midyear_amount) : "—"}
                    </td>
                    <td className="whitespace-nowrap py-1.5 text-xs">
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
