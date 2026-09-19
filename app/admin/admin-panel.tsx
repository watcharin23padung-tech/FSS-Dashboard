"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseCsv } from "@/lib/csv";
import PersonnelTable, { PersonnelRow } from "@/components/crud/personnel-table";
import BudgetTable, { BudgetRow } from "@/components/crud/budget-table";
import ActivitiesTable, { ActivityRow } from "@/components/crud/activities-table";
import KpiTable, { KpiRow, ActivityOption, QuarterlyActuals } from "@/components/crud/kpi-table";

type Department = { id: string; name_th: string; name_en: string | null };
type Category = "personnel" | "budget" | "activities" | "kpi";

type PersonnelRecord = PersonnelRow & { department_id: string };
type BudgetRecord = BudgetRow & { department_id: string };
type ActivityRecord = ActivityRow & { department_id: string };

const CATEGORIES: { id: Category; label: string; needsDepartment: boolean }[] = [
  { id: "personnel", label: "บุคลากร", needsDepartment: true },
  { id: "budget", label: "งบประมาณ", needsDepartment: true },
  { id: "activities", label: "โครงการ/กิจกรรม", needsDepartment: true },
  { id: "kpi", label: "ตัวชี้วัด (KPI)", needsDepartment: false },
];

const CSV_TEMPLATE: Record<Category, string> = {
  personnel: "full_name,position,employment_type,email,phone",
  budget: "fiscal_year,category,budget_name,allocated_amount,used_amount,pending_midyear_amount",
  activities: "fiscal_year,title,description,status,start_date,end_date,budget_used",
  kpi: "kpi_code,kpi_name,unit,target_2568,target_2569,target_2570",
};

export default function AdminPanel({
  initialDepartments,
  initialPersonnel,
  initialBudgetItems,
  initialActivities,
  initialKpis,
  initialKpiActuals,
  fiscalYear,
}: {
  initialDepartments: Department[];
  initialPersonnel: PersonnelRecord[];
  initialBudgetItems: BudgetRecord[];
  initialActivities: ActivityRecord[];
  initialKpis: KpiRow[];
  initialKpiActuals: { kpi_id: string; fiscal_year: number; quarter: number; value: number | null }[];
  fiscalYear: number;
}) {
  const prevFiscalYear = fiscalYear - 1;
  const quarterlyByKpi: Record<string, QuarterlyActuals> = {};
  for (const k of initialKpis) {
    const rowsForKpi = initialKpiActuals.filter((a) => a.kpi_id === k.id);
    const prevRows = rowsForKpi.filter((a) => a.fiscal_year === prevFiscalYear);
    const prevLatest = [4, 3, 2, 1]
      .map((q) => ({ q, v: prevRows.find((a) => a.quarter === q)?.value ?? null }))
      .find((x) => x.v != null);
    quarterlyByKpi[k.id] = {
      prev: prevLatest?.v ?? null,
      prevQuarter: prevLatest?.q ?? null,
      q1: rowsForKpi.find((a) => a.fiscal_year === fiscalYear && a.quarter === 1)?.value ?? null,
      q2: rowsForKpi.find((a) => a.fiscal_year === fiscalYear && a.quarter === 2)?.value ?? null,
      q3: rowsForKpi.find((a) => a.fiscal_year === fiscalYear && a.quarter === 3)?.value ?? null,
      q4: rowsForKpi.find((a) => a.fiscal_year === fiscalYear && a.quarter === 4)?.value ?? null,
    };
  }
  const supabase = createClient();
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [selectedDeptId, setSelectedDeptId] = useState<string>(initialDepartments[0]?.id ?? "");
  const [activeCategory, setActiveCategory] = useState<Category>("personnel");

  const [deptNameTh, setDeptNameTh] = useState("");
  const [deptNameEn, setDeptNameEn] = useState("");
  const [deptMsg, setDeptMsg] = useState<string | null>(null);

  async function handleAddDepartment(e: React.FormEvent) {
    e.preventDefault();
    setDeptMsg(null);
    if (!deptNameTh.trim()) {
      setDeptMsg("กรุณากรอกชื่อฝ่าย");
      return;
    }
    const { data, error } = await supabase
      .from("departments")
      .insert({ name_th: deptNameTh.trim(), name_en: deptNameEn.trim() || null })
      .select("id, name_th, name_en")
      .single();

    if (error) {
      setDeptMsg(`เพิ่มฝ่ายไม่สำเร็จ: ${error.message}`);
      return;
    }
    setDepartments((prev) => [...prev, data].sort((a, b) => a.name_th.localeCompare(b.name_th)));
    setSelectedDeptId(data.id);
    setDeptNameTh("");
    setDeptNameEn("");
    setDeptMsg(`เพิ่มฝ่าย "${data.name_th}" สำเร็จ`);
  }

  const currentCategory = CATEGORIES.find((c) => c.id === activeCategory)!;
  const activityOptions: ActivityOption[] = initialActivities.map((a) => {
    const dept = departments.find((d) => d.id === a.department_id);
    return { id: a.id, label: `[${dept?.name_th ?? "—"}] ${a.title}` };
  });

  return (
    <div className="space-y-8">
      {/* เพิ่มฝ่ายใหม่ — อยู่บนสุด ใช้ร่วมกันทุกหมวด */}
      <section className="rounded-lg border border-neutral-200 p-5">
        <h2 className="font-display text-base font-semibold">เพิ่มฝ่ายใหม่</h2>
        <form onSubmit={handleAddDepartment} className="mt-3 flex flex-wrap gap-3">
          <input
            value={deptNameTh}
            onChange={(e) => setDeptNameTh(e.target.value)}
            placeholder="ชื่อฝ่าย (ภาษาไทย)"
            className="min-w-[220px] flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
          />
          <input
            value={deptNameEn}
            onChange={(e) => setDeptNameEn(e.target.value)}
            placeholder="ชื่อฝ่าย (ภาษาอังกฤษ, ไม่บังคับ)"
            className="min-w-[220px] flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-[#0E7A3B] px-5 py-2 text-sm font-medium text-white hover:bg-[#0c6531]"
          >
            เพิ่มฝ่าย
          </button>
        </form>
        {deptMsg && <FormMessage msg={deptMsg} />}
      </section>

      {/* Sidebar เลือกหมวดข้อมูล + เนื้อหา */}
      <div className="grid grid-cols-[220px_1fr] gap-6">
        <aside className="flex flex-col gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`rounded-md px-4 py-2.5 text-left text-sm transition ${
                activeCategory === c.id
                  ? "bg-[#0E7A3B] font-medium text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {c.label}
            </button>
          ))}
        </aside>

        <section className="rounded-lg border border-neutral-200 p-6">
          {currentCategory.needsDepartment && (
            <>
              {departments.length === 0 ? (
                <p className="text-sm text-neutral-400">ยังไม่มีฝ่ายในระบบ กรุณาเพิ่มฝ่ายก่อน</p>
              ) : (
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name_th}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          {(!currentCategory.needsDepartment || departments.length > 0) && (
            <div className={currentCategory.needsDepartment ? "mt-6" : ""}>
              {activeCategory === "personnel" && (
                <PersonnelForm supabase={supabase} departmentId={selectedDeptId} />
              )}
              {activeCategory === "budget" && <BudgetForm supabase={supabase} departmentId={selectedDeptId} />}
              {activeCategory === "activities" && (
                <ActivityForm supabase={supabase} departmentId={selectedDeptId} />
              )}
              {activeCategory === "kpi" && <KpiForm supabase={supabase} activityOptions={activityOptions} />}

              <div className="mt-8 border-t border-neutral-200 pt-6">
                <CsvUpload
                  supabase={supabase}
                  departmentId={selectedDeptId}
                  category={activeCategory}
                />
              </div>

              {/* รายการที่มีอยู่แล้ว — แก้ไข/ลบได้ตรงนี้ */}
              <div className="mt-8 border-t border-neutral-200 pt-6">
                <h3 className="mb-3 text-sm font-medium text-neutral-500">รายการที่มีอยู่แล้ว</h3>
                {activeCategory === "personnel" && (
                  <PersonnelTable
                    key={selectedDeptId}
                    rows={initialPersonnel.filter((p) => p.department_id === selectedDeptId)}
                  />
                )}
                {activeCategory === "budget" && (
                  <BudgetTable
                    key={selectedDeptId}
                    rows={initialBudgetItems.filter((b) => b.department_id === selectedDeptId)}
                  />
                )}
                {activeCategory === "activities" && (
                  <ActivitiesTable
                    key={selectedDeptId}
                    rows={initialActivities.filter((a) => a.department_id === selectedDeptId)}
                  />
                )}
                {activeCategory === "kpi" && (
                  <KpiTable
                    rows={initialKpis}
                    activityOptions={activityOptions}
                    quarterlyByKpi={quarterlyByKpi}
                    fiscalYear={fiscalYear}
                    prevFiscalYear={prevFiscalYear}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FormMessage({ msg }: { msg: string | null }) {
  if (!msg) return null;
  const isError = msg.includes("ไม่สำเร็จ");
  return <p className={`mt-2 text-sm ${isError ? "text-red-600" : "text-[#0E7A3B]"}`}>{msg}</p>;
}

function PersonnelForm({ supabase, departmentId }: { supabase: any; departmentId: string }) {
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!fullName.trim()) {
      setMsg("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    const { error } = await supabase.from("personnel").insert({
      department_id: departmentId,
      full_name: fullName.trim(),
      position: position.trim() || null,
      employment_type: employmentType.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
    });
    if (error) {
      setMsg(`เพิ่มบุคลากรไม่สำเร็จ: ${error.message}`);
      return;
    }
    setMsg(`เพิ่ม "${fullName.trim()}" สำเร็จ — รีเฟรชหน้าเพื่อดูในรายการด้านล่าง`);
    setFullName("");
    setPosition("");
    setEmploymentType("");
    setEmail("");
    setPhone("");
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TextInput label="ชื่อ-นามสกุล" value={fullName} onChange={setFullName} />
      <TextInput label="ตำแหน่ง" value={position} onChange={setPosition} />
      <TextInput label="ประเภทการจ้าง" value={employmentType} onChange={setEmploymentType} />
      <TextInput label="อีเมล" value={email} onChange={setEmail} />
      <TextInput label="เบอร์โทร" value={phone} onChange={setPhone} />
      <div className="sm:col-span-2">
        <SubmitButton label="เพิ่มบุคลากร" />
        <FormMessage msg={msg} />
      </div>
    </form>
  );
}

function BudgetForm({ supabase, departmentId }: { supabase: any; departmentId: string }) {
  const [fiscalYear, setFiscalYear] = useState("");
  const [category, setCategory] = useState("");
  const [budgetName, setBudgetName] = useState("");
  const [allocated, setAllocated] = useState("");
  const [used, setUsed] = useState("");
  const [pending, setPending] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!fiscalYear.trim() || !budgetName.trim()) {
      setMsg("กรุณากรอกปีงบประมาณและชื่อรายการงบประมาณ");
      return;
    }
    const { error } = await supabase.from("budget_items").insert({
      department_id: departmentId,
      fiscal_year: Number(fiscalYear),
      category: category.trim() || "ไม่ระบุ",
      budget_name: budgetName.trim(),
      allocated_amount: Number(allocated) || 0,
      used_amount: Number(used) || 0,
      pending_midyear_amount: Number(pending) || 0,
    });
    if (error) {
      setMsg(`เพิ่มรายการงบประมาณไม่สำเร็จ: ${error.message}`);
      return;
    }
    setMsg(`เพิ่ม "${budgetName.trim()}" สำเร็จ — รีเฟรชหน้าเพื่อดูในรายการด้านล่าง`);
    setFiscalYear("");
    setCategory("");
    setBudgetName("");
    setAllocated("");
    setUsed("");
    setPending("");
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TextInput label="ปีงบประมาณ (พ.ศ. เช่น 2570)" value={fiscalYear} onChange={setFiscalYear} />
      <TextInput label="หมวดงบ" value={category} onChange={setCategory} />
      <TextInput label="ชื่อรายการงบประมาณ" value={budgetName} onChange={setBudgetName} full />
      <TextInput label="งบที่ได้ (บาท)" value={allocated} onChange={setAllocated} />
      <TextInput label="ได้รับจัดสรร (บาท)" value={used} onChange={setUsed} />
      <TextInput label="รองบกลางปี (บาท)" value={pending} onChange={setPending} />
      <div className="sm:col-span-2">
        <SubmitButton label="เพิ่มรายการงบประมาณ" />
        <FormMessage msg={msg} />
      </div>
    </form>
  );
}

function ActivityForm({ supabase, departmentId }: { supabase: any; departmentId: string }) {
  const [fiscalYear, setFiscalYear] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("กำลังดำเนินการ");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetUsed, setBudgetUsed] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!fiscalYear.trim() || !title.trim()) {
      setMsg("กรุณากรอกปีงบประมาณและชื่อโครงการ");
      return;
    }
    const { error } = await supabase.from("activities_projects").insert({
      department_id: departmentId,
      fiscal_year: Number(fiscalYear),
      title: title.trim(),
      description: description.trim() || null,
      status: status.trim() || "กำลังดำเนินการ",
      start_date: startDate || null,
      end_date: endDate || null,
      budget_used: Number(budgetUsed) || 0,
    });
    if (error) {
      setMsg(`เพิ่มโครงการไม่สำเร็จ: ${error.message}`);
      return;
    }
    setMsg(`เพิ่ม "${title.trim()}" สำเร็จ — รีเฟรชหน้าเพื่อดูในรายการด้านล่าง`);
    setFiscalYear("");
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setBudgetUsed("");
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TextInput label="ปีงบประมาณ (พ.ศ.)" value={fiscalYear} onChange={setFiscalYear} />
      <SelectInput
        label="สถานะ"
        value={status}
        onChange={setStatus}
        options={["กำลังดำเนินการ", "เสร็จสิ้น", "ชะลอ", "ยกเลิก"]}
      />
      <TextInput label="ชื่อโครงการ/กิจกรรม" value={title} onChange={setTitle} full />
      <TextInput label="รายละเอียด" value={description} onChange={setDescription} full />
      <TextInput label="วันเริ่มต้น" value={startDate} onChange={setStartDate} type="date" />
      <TextInput label="วันสิ้นสุด" value={endDate} onChange={setEndDate} type="date" />
      <TextInput label="งบที่ใช้ไป (บาท)" value={budgetUsed} onChange={setBudgetUsed} />
      <div className="sm:col-span-2">
        <SubmitButton label="เพิ่มโครงการ" />
        <FormMessage msg={msg} />
      </div>
    </form>
  );
}

function KpiForm({ supabase, activityOptions }: { supabase: any; activityOptions: ActivityOption[] }) {
  const [kpiCode, setKpiCode] = useState("");
  const [kpiName, setKpiName] = useState("");
  const [unit, setUnit] = useState("");
  const [target2568, setTarget2568] = useState("");
  const [target2569, setTarget2569] = useState("");
  const [target2570, setTarget2570] = useState("");
  const [activityId, setActivityId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!kpiCode.trim() || !kpiName.trim()) {
      setMsg("กรุณากรอกรหัสและชื่อตัวชี้วัด");
      return;
    }
    const { error } = await supabase.from("kpis").insert({
      kpi_code: kpiCode.trim(),
      kpi_name: kpiName.trim(),
      unit: unit.trim() || null,
      target_2568: target2568 ? Number(target2568) : null,
      target_2569: target2569 ? Number(target2569) : null,
      target_2570: target2570 ? Number(target2570) : null,
      activity_id: activityId || null,
    });
    if (error) {
      setMsg(`เพิ่ม KPI ไม่สำเร็จ: ${error.message}`);
      return;
    }
    setMsg(`เพิ่ม "${kpiName.trim()}" สำเร็จ — กรอกผลจริงรายไตรมาสได้ที่ปุ่ม "แก้ไข" ในรายการด้านล่าง`);
    setKpiCode("");
    setKpiName("");
    setUnit("");
    setTarget2568("");
    setTarget2569("");
    setTarget2570("");
    setActivityId("");
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TextInput label="รหัส KPI" value={kpiCode} onChange={setKpiCode} />
      <TextInput label="หน่วย" value={unit} onChange={setUnit} />
      <TextInput label="ชื่อตัวชี้วัด" value={kpiName} onChange={setKpiName} full />
      <label className="text-sm text-neutral-600 sm:col-span-2">
        โครงการที่เกี่ยวข้อง (ไม่บังคับ)
        <select
          value={activityId}
          onChange={(e) => setActivityId(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
        >
          <option value="">— ไม่ผูกกับโครงการ (KPI ระดับคณะ) —</option>
          {activityOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <TextInput label="เป้าหมาย 2568" value={target2568} onChange={setTarget2568} />
      <TextInput label="เป้าหมาย 2569" value={target2569} onChange={setTarget2569} />
      <TextInput label="เป้าหมาย 2570" value={target2570} onChange={setTarget2570} />
      <p className="text-xs text-neutral-400 sm:col-span-2">
        ผลจริงรายไตรมาส (Q1-Q4) กรอกเพิ่มได้ทีหลังผ่านปุ่ม "แก้ไข" ในรายการด้านล่าง หลังบันทึกครั้งนี้
      </p>
      <div className="sm:col-span-2">
        <SubmitButton label="เพิ่มตัวชี้วัด" />
        <FormMessage msg={msg} />
      </div>
    </form>
  );
}

function CsvUpload({
  supabase,
  departmentId,
  category,
}: {
  supabase: any;
  departmentId: string;
  category: Category;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      if (rows.length === 0) {
        setMsg("ไม่พบข้อมูลในไฟล์ หรือรูปแบบไฟล์ไม่ถูกต้อง");
        setBusy(false);
        return;
      }

      let payload: any[] = [];
      let table = "";

      if (category === "personnel") {
        table = "personnel";
        payload = rows.map((r) => ({
          department_id: departmentId,
          full_name: r.full_name || "",
          position: r.position || null,
          employment_type: r.employment_type || null,
          email: r.email || null,
          phone: r.phone || null,
        }));
      } else if (category === "budget") {
        table = "budget_items";
        payload = rows.map((r) => ({
          department_id: departmentId,
          fiscal_year: Number(r.fiscal_year) || null,
          category: r.category || "ไม่ระบุ",
          budget_name: r.budget_name || "",
          allocated_amount: Number(r.allocated_amount) || 0,
          used_amount: Number(r.used_amount) || 0,
          pending_midyear_amount: Number(r.pending_midyear_amount) || 0,
        }));
      } else if (category === "activities") {
        table = "activities_projects";
        payload = rows.map((r) => ({
          department_id: departmentId,
          fiscal_year: Number(r.fiscal_year) || null,
          title: r.title || "",
          description: r.description || null,
          status: r.status || "กำลังดำเนินการ",
          start_date: r.start_date || null,
          end_date: r.end_date || null,
          budget_used: Number(r.budget_used) || 0,
        }));
      } else {
        table = "kpis";
        payload = rows.map((r) => ({
          kpi_code: r.kpi_code || "",
          kpi_name: r.kpi_name || "",
          unit: r.unit || null,
          target_2568: r.target_2568 ? Number(r.target_2568) : null,
          target_2569: r.target_2569 ? Number(r.target_2569) : null,
          target_2570: r.target_2570 ? Number(r.target_2570) : null,
        }));
      }

      const { error } = await supabase.from(table).insert(payload);
      if (error) {
        setMsg(`อัปโหลดไม่สำเร็จ: ${error.message}`);
      } else {
        setMsg(`นำเข้าข้อมูลสำเร็จ ${payload.length} แถว — รีเฟรชหน้าเพื่อดูในรายการด้านล่าง`);
      }
    } catch (err: any) {
      setMsg(`อ่านไฟล์ไม่สำเร็จ: ${err.message ?? "ไม่ทราบสาเหตุ"}`);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <p className="text-sm font-medium">อัปโหลดหลายแถวจากไฟล์ CSV</p>
      <p className="mt-1 text-xs text-neutral-500">
        หัวคอลัมน์ที่ต้องมี: <code className="text-neutral-700">{CSV_TEMPLATE[category]}</code>
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={handleFile}
        disabled={busy}
        className="mt-3 text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#0E7A3B] file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-[#0c6531]"
      />
      <FormMessage msg={msg} />
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  full,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
  type?: string;
}) {
  return (
    <label className={`text-sm text-neutral-600 ${full ? "sm:col-span-2" : ""}`}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="text-sm text-neutral-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="rounded-md bg-[#0E7A3B] px-5 py-2 text-sm font-medium text-white hover:bg-[#0c6531]"
    >
      {label}
    </button>
  );
}
