"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type PersonnelRow = {
  id: string;
  full_name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  is_head: boolean;
};

function sortRows(rows: PersonnelRow[]) {
  return [...rows].sort((a, b) => {
    if (a.is_head !== b.is_head) return a.is_head ? -1 : 1;
    return a.full_name.localeCompare(b.full_name, "th");
  });
}

export default function PersonnelTable({ rows: initialRows }: { rows: PersonnelRow[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState(sortRows(initialRows));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PersonnelRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function startEdit(row: PersonnelRow) {
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
      .from("personnel")
      .update({
        full_name: draft.full_name,
        position: draft.position || null,
        email: draft.email || null,
        phone: draft.phone || null,
        is_head: draft.is_head,
      })
      .eq("id", draft.id);
    setBusyId(null);
    if (error) {
      setMsg(`บันทึกไม่สำเร็จ: ${error.message}`);
      return;
    }
    setRows((prev) => sortRows(prev.map((r) => (r.id === draft.id ? draft : r))));
    setEditingId(null);
    setDraft(null);
  }
  async function handleDelete(id: string) {
    if (!confirm("ยืนยันลบรายการนี้?")) return;
    setBusyId(id);
    setMsg(null);
    const { error } = await supabase.from("personnel").delete().eq("id", id);
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
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-neutral-500">
            <th className="pb-1.5 font-medium">ชื่อ-นามสกุล</th>
            <th className="pb-1.5 font-medium">ตำแหน่ง</th>
            <th className="pb-1.5 font-medium">อีเมล</th>
            <th className="pb-1.5 font-medium">เบอร์โทร</th>
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
                      <div className="flex items-center gap-2">
                        <input
                          value={draft.full_name}
                          onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
                          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                        />
                      </div>
                      <label className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
                        <input
                          type="checkbox"
                          checked={draft.is_head}
                          onChange={(e) => setDraft({ ...draft, is_head: e.target.checked })}
                        />
                        หัวหน้าฝ่าย
                      </label>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={draft.position ?? ""}
                        onChange={(e) => setDraft({ ...draft, position: e.target.value })}
                        className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={draft.email ?? ""}
                        onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                        className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={draft.phone ?? ""}
                        onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                        className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
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
                    <td className="py-1.5">
                      {r.full_name}
                      {r.is_head && (
                        <span className="ml-2 rounded-full bg-[#FFF6CC] px-2 py-0.5 text-[10px] font-medium text-neutral-700">
                          หัวหน้าฝ่าย
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 text-neutral-600">{r.position ?? "—"}</td>
                    <td className="py-1.5 text-neutral-500">{r.email ?? "—"}</td>
                    <td className="py-1.5 text-neutral-500">{r.phone ?? "—"}</td>
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
