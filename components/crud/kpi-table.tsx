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
  activity_id: string | null;
};

export type ActivityOption = { id: string; label: string };
export type QuarterlyActuals = {
  prev: number | null;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
};

const thb = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

function latestQuarterValue(q: QuarterlyActuals): number | null {
  if (q.q4 != null) return q.q4;
  if (q.q3 != null) return q.q3;
  if (q.q2 != null) return q.q2;
  if (q.q1 != null) return q.q1;
  return null;
}

export default function KpiTable({
  rows: initialRows,
  activityOptions = [],
  quarterlyByKpi,
  fiscalYear,
  prevFiscalYear,
}: {
  rows: KpiRow[];
  activityOptions?: ActivityOption[];
  quarterlyByKpi: Record<string, QuarterlyActuals>;
  fiscalYear: number;
  prevFiscalYear: number;
}) {
  const activityLabelById = Object.fromEntries(activityOptions.map((a) => [a.id, a.label]));
  const supabase = createClient();
  const [rows, setRows] = useState(initialRows);
  const [quarterly, setQuarterly] = useState(quarterlyByKpi);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<KpiRow | null>(null);
  const [draftQ, setDraftQ] = useState<QuarterlyActuals | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function startEdit(row: KpiRow) {
    setEditingId(row.id);
    setDraft({ ...row });
    setDraftQ({ ...(quarterly[row.id] ?? { prev: null, q1: null, q2: null, q3: null, q4: null }) });
    setMsg(null);
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setDraftQ(null);
  }

  async function saveEdit() {
    if (!draft || !draftQ) return;
    setBusyId(draft.id);
    setMsg(null);

    const { error: kpiError } = await supabase
      .from("kpis")
      .update({
        kpi_code: draft.kpi_code,
        kpi_name: draft.kpi_name,
        unit: draft.unit || null,
        target_2568: draft.target_2568,
        target_2569: draft.target_2569,
        target_2570: draft.target_2570,
        activity_id: draft.activity_id || null,
      })
      .eq("id", draft.id);

    if (kpiError) {
      setBusyId(null);
      setMsg(`บันทึกไม่สำเร็จ: ${kpiError.message}`);
      return;
    }

    const actualsPayload = [
      { kpi_id: draft.id, fiscal_year: prevFiscalYear, quarter: 3, value: draftQ.prev },
      { kpi_id: draft.id, fiscal_year: fiscalYear, quarter: 1, value: draftQ.q1 },
      { kpi_id: draft.id, fiscal_year: fiscalYear, quarter: 2, value: draftQ.q2 },
      { kpi_id: draft.id, fiscal_year: fiscalYear, quarter: 3, value: draftQ.q3 },
      { kpi_id: draft.id, fiscal_year: fiscalYear, quarter: 4, value: draftQ.q4 },
    ];
    const { error: actualsError } = await supabase
      .from("kpi_actuals")
      .upsert(actualsPayload, { onConflict: "kpi_id,fiscal_year,quarter" });

    setBusyId(null);
    if (actualsError) {
      setMsg(`บันทึกผลจริงไม่สำเร็จ: ${actualsError.message}`);
      return;
    }

    setRows((prev) => prev.map((r) => (r.id === draft.id ? draft : r)));
    setQuarterly((prev) => ({ ...prev, [draft.id]: draftQ }));
    setEditingId(null);
    setDraft(null);
    setDraftQ(null);
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

  const qInput = (value: number | null, onChange: (v: number | null) => void) => (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className="w-16 rounded border border-neutral-300 px-1.5 py-1 text-right text-sm"
    />
  );

  return (
    <div className="overflow-x-auto">
      {msg && <p className="mb-2 text-sm text-red-600">{msg}</p>}
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-neutral-300 bg-neutral-50 text-left text-neutral-500">
            <th className="px-2 py-2 font-medium">KPI</th>
            <th className="px-2 py-2 font-medium">ชื่อตัวชี้วัด</th>
            <th className="px-2 py-2 text-right font-medium">เป้า 2568</th>
            <th className="px-2 py-2 text-right font-medium">เป้า 2569</th>
            <th className="px-2 py-2 text-right font-medium">ผลจริง {prevFiscalYear} (Q3)</th>
            <th className="bg-[#E6F4EC] px-2 py-2 text-right font-semibold text-[#0E7A3B]">เป้า {fiscalYear}</th>
            <th className="px-2 py-2 text-right font-medium">Q1/{fiscalYear}</th>
            <th className="px-2 py-2 text-right font-medium">Q2/{fiscalYear}</th>
            <th className="px-2 py-2 text-right font-medium">Q3/{fiscalYear}</th>
            <th className="px-2 py-2 text-right font-medium">Q4/{fiscalYear}</th>
            <th className="px-2 py-2 font-medium">หน่วย</th>
            <th className="px-2 py-2 font-medium">โครงการที่เกี่ยวข้อง</th>
            <th className="w-28 px-2 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const isEditing = editingId === r.id;
            const q = quarterly[r.id] ?? { prev: null, q1: null, q2: null, q3: null, q4: null };

            return (
              <tr key={r.id} className={`border-t border-neutral-100 ${idx % 2 === 1 ? "bg-neutral-50/60" : ""}`}>
                {isEditing && draft && draftQ ? (
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
                        className="w-full min-w-[160px] rounded border border-neutral-300 px-2 py-1 text-sm"
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
                    <td className="py-1.5 pr-2">{qInput(draftQ.prev, (v) => setDraftQ({ ...draftQ, prev: v }))}</td>
                    <td className="bg-[#E6F4EC]/60 py-1.5 pr-2">
                      <input
                        type="number"
                        value={draft.target_2570 ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, target_2570: e.target.value ? Number(e.target.value) : null })
                        }
                        className="w-20 rounded border border-neutral-300 px-2 py-1 text-right text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">{qInput(draftQ.q1, (v) => setDraftQ({ ...draftQ, q1: v }))}</td>
                    <td className="py-1.5 pr-2">{qInput(draftQ.q2, (v) => setDraftQ({ ...draftQ, q2: v }))}</td>
                    <td className="py-1.5 pr-2">{qInput(draftQ.q3, (v) => setDraftQ({ ...draftQ, q3: v }))}</td>
                    <td className="py-1.5 pr-2">{qInput(draftQ.q4, (v) => setDraftQ({ ...draftQ, q4: v }))}</td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={draft.unit ?? ""}
                        onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                        className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        value={draft.activity_id ?? ""}
                        onChange={(e) => setDraft({ ...draft, activity_id: e.target.value || null })}
                        className="w-40 rounded border border-neutral-300 px-2 py-1 text-sm"
                      >
                        <option value="">— ไม่ผูกโครงการ —</option>
                        {activityOptions.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.label}
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
                    <td className="px-2 py-2 text-right text-neutral-600">
                      {q.prev != null ? thb.format(q.prev) : "—"}
                    </td>
                    <td className="bg-[#E6F4EC] px-2 py-2 text-right font-semibold text-neutral-900">
                      {r.target_2570 != null ? thb.format(r.target_2570) : "—"}
                    </td>
                    <td className="px-2 py-2 text-right text-neutral-600">{q.q1 != null ? thb.format(q.q1) : "—"}</td>
                    <td className="px-2 py-2 text-right text-neutral-600">{q.q2 != null ? thb.format(q.q2) : "—"}</td>
                    <td className="px-2 py-2 text-right text-neutral-600">{q.q3 != null ? thb.format(q.q3) : "—"}</td>
                    <td className="px-2 py-2 text-right">
                      {(() => {
                        const latest = latestQuarterValue(q);
                        if (latest == null) return <span className="text-neutral-400">—</span>;
                        const onTrack = r.target_2570 != null && latest >= r.target_2570;
                        return (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              onTrack ? "bg-[#0E7A3B] text-white" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {thb.format(latest)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-2 py-2 text-neutral-500">{r.unit ?? "—"}</td>
                    <td className="px-2 py-2 text-neutral-500">
                      {r.activity_id ? activityLabelById[r.activity_id] ?? "—" : <span className="text-neutral-300">—</span>}
                    </td>
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
      <p className="mt-2 text-[11px] text-neutral-400">
        คอลัมน์ขวาสุด (Q4/{fiscalYear}) ใช้บ่งชี้บรรลุเป้าหรือไม่ — ถ้าไตรมาสหลังยังไม่มีข้อมูล ระบบดูจากไตรมาสล่าสุดที่มีข้อมูลแทน
      </p>
    </div>
  );
}
