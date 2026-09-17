"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type KpiRow = {
  id: string;
  kpi_code: string;
  kpi_name: string;
  unit: string | null;
  target_2568: number | null;
  target_2569: number | null;
  target_2570: number | null;
  actual_q3_2569: number | null;
};

const thb = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

export default function KpiTable({ rows: initialRows }: { rows: KpiRow[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState(initialRows);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<KpiRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function startEdit(row: KpiRow) {
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
      .from("kpis")
      .update({
        kpi_code: draft.kpi_code,
        kpi_name: draft.kpi_name,
        unit: draft.unit || null,
        target_2568: draft.target_2568,
        target_2569: draft.target_2569,
        target_2570: draft.target_2570,
        actual_q3_2569: draft.actual_q3_2569,
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
    if (!confirm("ยืนยันลบตัวชี้วัดนี้?")) return;
    setBusyId(id);
    setMsg(null);
    const { error } = await supabase.from("kpis").delete().eq("id", id);
    setBusyId(null);
    if (error) {
      setMsg(`ลบไม่สำเร็จ: ${error.message}`);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  if (rows.length === 0) return <p className="text-sm text-neutral-400">ยังไม่มีข้อมูล</p>;

  return (
    <div>
      {msg && <p className="mb-2 text-sm text-red-600">{msg}</p>}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-neutral-300 bg-neutral-50 text-left text-neutral-500">
            <th className="px-2 py-2 font-medium">KPI</th>
            <th className="px-2 py-2 font-medium">ชื่อตัวชี้วัด</th>
            <th className="px-2 py-2 text-right font-medium">เป้า 2568</th>
            <th className="px-2 py-2 text-right font-medium">เป้า 2569</th>
            <th className="bg-[#E6F4EC] px-2 py-2 text-right font-semibold text-[#0E7A3B]">เป้า 2570</th>
            <th className="px-2 py-2 text-right font-medium">ผลจริง Q3/2569</th>
            <th className="px-2 py-2 font-medium">หน่วย</th>
            <th className="w-28 px-2 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const isEditing = editingId === r.id;
            const onTrack =
              r.target_2570 != null && r.actual_q3_2569 != null && r.actual_q3_2569 >= r.target_2570;
            return (
              <tr key={r.id} className={`border-t border-neutral-100 ${idx % 2 === 1 ? "bg-neutral-50/60" : ""}`}>
                {isEditing && draft ? (
                  <>
                    <td className="py-1.5 pr-2">
                      <input
                        value={draft.kpi_code}
                        onChange={(e) => setDraft({ ...draft, kpi_code: e.target.value })}
                        className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={draft.kpi_name}
                        onChange={(e) => setDraft({ ...draft, kpi_name: e.target.value })}
                        className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        value={draft.target_2568 ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, target_2568: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-20 rounded border border-neutral-300 px-2 py-1 text-right text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        value={draft.target_2569 ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, target_2569: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-20 rounded border border-neutral-300 px-2 py-1 text-right text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        value={draft.target_2570 ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, target_2570: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-20 rounded border border-neutral-300 px-2 py-1 text-right text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        value={draft.actual_q3_2569 ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, actual_q3_2569: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-20 rounded border border-neutral-300 px-2 py-1 text-right text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={draft.unit ?? ""}
                        onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                        className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm"
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
                    <td className="whitespace-nowrap px-2 py-2">
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-600">
                        {r.kpi_code}
                      </span>
                    </td>
                    <td className="px-2 py-2">{r.kpi_name}</td>
                    <td className="px-2 py-2 text-right text-neutral-400">
                      {r.target_2568 != null ? thb.format(r.target_2568) : "—"}
                    </td>
                    <td className="px-2 py-2 text-right text-neutral-400">
                      {r.target_2569 != null ? thb.format(r.target_2569) : "—"}
                    </td>
                    <td className="bg-[#E6F4EC] px-2 py-2 text-right font-semibold text-neutral-900">
                      {r.target_2570 != null ? thb.format(r.target_2570) : "—"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {r.actual_q3_2569 == null ? (
                        <span className="text-neutral-400">—</span>
                      ) : (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            onTrack ? "bg-[#0E7A3B] text-white" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {thb.format(r.actual_q3_2569)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-neutral-500">{r.unit ?? "—"}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-xs">
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
