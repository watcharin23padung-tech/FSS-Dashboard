"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseCsv } from "@/lib/csv";
import PersonnelTable, { PersonnelRow } from "@/components/crud/personnel-table";
import BudgetTable, { BudgetRow } from "@/components/crud/budget-table";
import ActivitiesTable, { ActivityRow, STATUS_OPTIONS } from "@/components/crud/activities-table";
import KpiTable, { KpiRow, ActivityOption, QuarterlyActuals } from "@/components/crud/kpi-table";

type Department = { id: string; name_th: string; name_en: string | null };
type Category = "personnel" | "budget" | "activities" | "kpi";

type PersonnelRecord = PersonnelRow & { department_id: string };
type BudgetRecord = BudgetRow & { department_id: string };
type ActivityRecord = ActivityRow & { department_id: string };

// รายการ KPI ทางการทั้ง 35 ตัว พร้อมเป้าหมาย 2568/2569/2570 — จากเอกสารยืนยันการรับเป้า 2570 (ประชุม 9 ก.ย. 2569)
const MASTER_KPIS: {
  code: string;
  name: string;
  unit: string;
  target_2568: number | null;
  target_2569: number | null;
  target_2570: number | null;
}[] = [
  { code: "A1", name: "Student and graduate Entrepreneur", unit: "คน", target_2568: null, target_2569: 32, target_2570: 33 },
  { code: "A2", name: "Industrial income", unit: "บาท", target_2568: null, target_2569: 2772000, target_2570: 3176250 },
  { code: "B1", name: "ผู้สำเร็จการศึกษาที่ได้งานทำหรือประกอบอาชีพอิสระภายในระยะเวลา 1 ปี", unit: "ร้อยละ", target_2568: 70, target_2569: 73, target_2570: 75 },
  { code: "C1", name: "คะแนนความพึงพอใจของผู้ใช้บัณฑิต", unit: "คะแนน", target_2568: 4.3, target_2569: 4.4, target_2570: 4.4 },
  { code: "C2", name: "จำนวนผู้เรียนในหลักสูตรการจัดการศึกษาแนวใหม่", unit: "คน", target_2568: 145, target_2569: 170, target_2570: 164 },
  { code: "C4", name: "จำนวนผู้เรียนต่างชาติที่เข้าศึกษาในหลักสูตรระดับปริญญา (Degree)", unit: "คน", target_2568: 20, target_2569: 15, target_2570: 14 },
  { code: "C5", name: "จำนวนผู้เรียนหลักสูตรประกาศนียบัตร (Non-degree)", unit: "คน", target_2568: 450, target_2569: 650, target_2570: 650 },
  { code: "C6", name: "จำนวนหลักสูตรประกาศนียบัตร (Non-degree) ที่มีการดำเนินงานตามรูปแบบ EEC model (นับสะสม)", unit: "หลักสูตร", target_2568: 3, target_2569: 4, target_2570: 5 },
  { code: "C7", name: "จำนวนผู้เรียนที่ผ่านการอบรมหลักสูตรประกาศนียบัตร (Non-degree) ที่มีการดำเนินงานตามรูปแบบ EEC model", unit: "คน", target_2568: 100, target_2569: 100, target_2570: 120 },
  { code: "C8", name: "จำนวนผู้เรียนในระบบการศึกษาตลอดชีวิต (นับสะสม)", unit: "คน", target_2568: 1200, target_2569: 2300, target_2570: 2500 },
  { code: "C9", name: "จำนวนรายวิชา BUU MOOCs (นับสะสม)", unit: "รายวิชา", target_2568: 3, target_2569: 5, target_2570: 2 },
  { code: "C10", name: "จำนวนผู้เรียน BUU MOOCs", unit: "คน", target_2568: 800, target_2569: 2000, target_2570: 2000 },
  { code: "C12", name: "จำนวนหลักสูตรประกาศนียบัตร (Non-degree) หรือรายวิชา BUU MOOCs ที่สอนโดยใช้ภาษาต่างประเทศ (นับสะสม)", unit: "หลักสูตร/รายวิชา", target_2568: null, target_2569: null, target_2570: 1 },
  { code: "C13", name: "ร้อยละของจำนวนนิสิตแลกเปลี่ยน (inbound+outbound) ต่อจำนวนนิสิตทั้งหมด", unit: "คน", target_2568: 10, target_2569: 4, target_2570: 5 },
  { code: "C14", name: "ร้อยละของนิสิตที่ได้รับการพัฒนา Soft Skill เพื่อดำเนินชีวิตประจำวันและเตรียมความพร้อมเข้าสู่การทำงาน", unit: "ร้อยละ", target_2568: 95, target_2569: 95, target_2570: 95 },
  { code: "C15", name: "ร้อยละของนิสิตที่มีความโดดเด่นด้านผู้นำ/ผู้ประกอบการ/พลเมืองโลก/ดิจิทัล/สุขภาวะ", unit: "ร้อยละ", target_2568: 8, target_2569: 15, target_2570: 16 },
  { code: "C16", name: "จำนวนงบประมาณวิจัยที่ได้รับการสนับสนุนจากแหล่งทุนภายนอก", unit: "บาท", target_2568: 500000, target_2569: 1140000, target_2570: 1575000 },
  { code: "C17", name: "ร้อยละของจำนวนโครงการวิจัยที่ได้รับงบประมาณจากแหล่งทุนภายนอกต่อจำนวนโครงการวิจัยทั้งหมด", unit: "โครงการ", target_2568: 22, target_2569: 2, target_2570: 3 },
  { code: "C20", name: "ร้อยละของบทความวิจัยที่มีความร่วมมือกับสถาบันการศึกษาต่างประเทศและตีพิมพ์ในฐานข้อมูล Scopus", unit: "บทความ", target_2568: 3, target_2569: 5, target_2570: 7 },
  { code: "C21", name: "ร้อยละของบทความวิจัยที่ได้รับการตีพิมพ์ใน Q1 & Q2 Journal บนฐานข้อมูล Scopus", unit: "เรื่อง", target_2568: 5, target_2569: 5, target_2570: 4 },
  { code: "C22", name: "ร้อยละของบทความวิจัยที่ได้รับการตีพิมพ์ใน Top10% Journal บนฐานข้อมูล Scopus", unit: "เรื่อง", target_2568: 1, target_2569: 1, target_2570: 1 },
  { code: "C24", name: "จำนวนผลงานหรือกิจกรรมสนับสนุนอุตสาหกรรม (ที่ปรึกษา/ช่วยเหลือ)", unit: "ผลงาน", target_2568: 1, target_2569: 1, target_2570: 2 },
  { code: "C27", name: "งบประมาณการพัฒนาเทคโนโลยี/นวัตกรรม เพื่อพัฒนาความเป็นผู้ประกอบการของสถาบันอุดมศึกษา", unit: "บาท", target_2568: 274000, target_2569: 500000, target_2570: 200000 },
  { code: "B3", name: "จำนวนกิจกรรมที่นำองค์ความรู้และนวัตกรรมที่นำไปใช้ในการพัฒนาพื้นที่", unit: "กิจกรรม", target_2568: 5, target_2569: 2, target_2570: 2 },
  { code: "C29", name: "การบริหารองค์กรอย่างมีประสิทธิผล โดยมีส่วนงานที่มีคะแนน EdPEx ระดับ 250 คะแนนขึ้นไป", unit: "ส่วนงาน", target_2568: null, target_2569: 250, target_2570: 250 },
  { code: "C30.1", name: "จำนวนกิจกรรม/โครงการที่เกี่ยวข้องกับการดำเนินงานด้านมหาวิทยาลัยสีเขียว", unit: "กิจกรรม", target_2568: 5, target_2569: 3, target_2570: 3 },
  { code: "C30.2", name: "จำนวนงบประมาณที่เกี่ยวข้องกับการสร้างความยั่งยืน (green university)", unit: "บาท", target_2568: 120000, target_2569: 150000, target_2570: 200000 },
  { code: "C31.1", name: "จำนวนข่าวที่ปรากฏใน LinkedIn ของมหาวิทยาลัย", unit: "เรื่อง", target_2568: 1, target_2569: 1, target_2570: 2 },
  { code: "C31.2", name: "จำนวนกิจกรรมที่สอดคล้องกับ SDG และมีการนำเสนอเป็นภาษาอังกฤษบนเว็บไซต์", unit: "กิจกรรม", target_2568: null, target_2569: 2, target_2570: 4 },
  { code: "B5", name: "ร้อยละของบุคลากรที่มีสมรรถนะหลัก (Core Competency) เป็นไปตามค่าคาดหวังตามประกาศที่เกี่ยวข้องของมหาวิทยาลัย", unit: "ร้อยละ", target_2568: null, target_2569: 80, target_2570: 91 },
  { code: "C34", name: "จำนวนส่วนงานที่ผ่านเกณฑ์ NI-15", unit: "ส่วนงาน", target_2568: null, target_2569: 15, target_2570: 15 },
  { code: "C35", name: "จำนวนส่วนงานที่มีการเติบโตของเงินรายได้มากกว่าหรือเท่ากับร้อยละ 4", unit: "ส่วนงาน", target_2568: null, target_2569: 4, target_2570: 4 },
  { code: "C37", name: "ร้อยละของอาจารย์ที่ได้รับการรับรองสมรรถนะตามมาตรฐานคุณวุฒิ", unit: "ร้อยละ", target_2568: null, target_2569: 5, target_2570: 10 },
  { code: "C40", name: "ระดับความผูกพันของบุคลากร (Employee Engagement Score) ต่อมหาวิทยาลัยและส่วนงาน", unit: "คะแนน", target_2568: null, target_2569: 3.7, target_2570: null },
  { code: "C41", name: "จำนวนผลงานที่ได้ทำร่วมกับ Strategic Partner", unit: "ผลงาน", target_2568: 5, target_2569: 1, target_2570: 1 },
];

const CATEGORIES: { id: Category; label: string; needsDepartment: boolean }[] = [
  { id: "personnel", label: "บุคลากร", needsDepartment: true },
  { id: "budget", label: "งบประมาณ", needsDepartment: true },
  { id: "activities", label: "โครงการ/กิจกรรม", needsDepartment: true },
  { id: "kpi", label: "ตัวชี้วัด (KPI)", needsDepartment: false },
];

const CSV_TEMPLATE: Record<Category, string> = {
  personnel: "full_name,position,email,phone",
  budget: "fiscal_year,budget_name,allocated_amount,used_amount,pending_midyear_amount",
  activities: "fiscal_year,title,description,status,start_date,end_date,budget_planned,budget_used",
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
              {/* รายการที่มีอยู่แล้ว — แสดงก่อนเสมอ ให้เห็นข้อมูลที่กรอกไปแล้วทันที แก้ไข/ลบได้ตรงนี้ */}
              <div>
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

              <div className="mt-8 border-t border-neutral-200 pt-6">
                <h3 className="mb-3 text-sm font-medium text-neutral-500">
                  {activeCategory === "kpi" ? "เพิ่มตัวชี้วัด" : "เพิ่มรายการใหม่"}
                </h3>
                {activeCategory === "personnel" && (
                  <PersonnelForm supabase={supabase} departmentId={selectedDeptId} />
                )}
                {activeCategory === "budget" && <BudgetForm supabase={supabase} departmentId={selectedDeptId} />}
                {activeCategory === "activities" && (
                  <ActivityForm supabase={supabase} departmentId={selectedDeptId} />
                )}
                {activeCategory === "kpi" && <KpiForm supabase={supabase} activityOptions={activityOptions} />}
              </div>

              <div className="mt-8 border-t border-neutral-200 pt-6">
                <CsvUpload supabase={supabase} departmentId={selectedDeptId} category={activeCategory} />
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
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isHead, setIsHead] = useState(false);
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
      email: email.trim() || null,
      phone: phone.trim() || null,
      is_head: isHead,
    });
    if (error) {
      setMsg(`เพิ่มบุคลากรไม่สำเร็จ: ${error.message}`);
      return;
    }
    setMsg(`เพิ่ม "${fullName.trim()}" สำเร็จ — รีเฟรชหน้าเพื่อดูในรายการด้านบน`);
    setFullName("");
    setPosition("");
    setEmail("");
    setPhone("");
    setIsHead(false);
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TextInput label="ชื่อ-นามสกุล" value={fullName} onChange={setFullName} />
      <TextInput label="ตำแหน่ง" value={position} onChange={setPosition} />
      <TextInput label="อีเมล" value={email} onChange={setEmail} />
      <TextInput label="เบอร์โทร" value={phone} onChange={setPhone} />
      <label className="flex items-center gap-2 text-sm text-neutral-600 sm:col-span-2">
        <input type="checkbox" checked={isHead} onChange={(e) => setIsHead(e.target.checked)} />
        เป็นหัวหน้าฝ่าย (จะแสดงขึ้นก่อนในรายการ)
      </label>
      <div className="sm:col-span-2">
        <SubmitButton label="เพิ่มบุคลากร" />
        <FormMessage msg={msg} />
      </div>
    </form>
  );
}

const FISCAL_YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => 2570 + i);

function BudgetForm({ supabase, departmentId }: { supabase: any; departmentId: string }) {
  const [fiscalYear, setFiscalYear] = useState(String(FISCAL_YEAR_OPTIONS[0]));
  const [budgetName, setBudgetName] = useState("");
  const [allocated, setAllocated] = useState("");
  const [used, setUsed] = useState("");
  const [pending, setPending] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!budgetName.trim()) {
      setMsg("กรุณากรอกชื่อรายการงบประมาณ");
      return;
    }
    const { error } = await supabase.from("budget_items").insert({
      department_id: departmentId,
      fiscal_year: Number(fiscalYear),
      category: "ไม่ระบุ",
      budget_name: budgetName.trim(),
      allocated_amount: Number(allocated) || 0,
      used_amount: Number(used) || 0,
      pending_midyear_amount: Number(pending) || 0,
    });
    if (error) {
      setMsg(`เพิ่มรายการงบประมาณไม่สำเร็จ: ${error.message}`);
      return;
    }
    setMsg(`เพิ่ม "${budgetName.trim()}" สำเร็จ — รีเฟรชหน้าเพื่อดูในรายการด้านบน`);
    setBudgetName("");
    setAllocated("");
    setUsed("");
    setPending("");
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="text-sm text-neutral-600">
        ปีงบประมาณ (พ.ศ.)
        <select
          value={fiscalYear}
          onChange={(e) => setFiscalYear(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
        >
          {FISCAL_YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
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
  const [status, setStatus] = useState("รอดำเนินการ");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetPlanned, setBudgetPlanned] = useState("");
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
      status,
      start_date: startDate || null,
      end_date: endDate || null,
      budget_planned: Number(budgetPlanned) || 0,
      budget_used: Number(budgetUsed) || 0,
    });
    if (error) {
      setMsg(`เพิ่มโครงการไม่สำเร็จ: ${error.message}`);
      return;
    }
    setMsg(`เพิ่ม "${title.trim()}" สำเร็จ — รีเฟรชหน้าเพื่อดูในรายการด้านบน`);
    setFiscalYear("");
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setBudgetPlanned("");
    setBudgetUsed("");
    setStatus("รอดำเนินการ");
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TextInput label="ปีงบประมาณ (พ.ศ.)" value={fiscalYear} onChange={setFiscalYear} />
      <SelectInput label="สถานะ" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      <TextInput label="ชื่อโครงการ/กิจกรรม" value={title} onChange={setTitle} full />
      <TextInput label="รายละเอียด" value={description} onChange={setDescription} full />
      <TextInput label="วันเริ่มต้น" value={startDate} onChange={setStartDate} type="date" />
      <TextInput label="วันสิ้นสุด" value={endDate} onChange={setEndDate} type="date" />
      <TextInput label="งบตามแผน (บาท)" value={budgetPlanned} onChange={setBudgetPlanned} />
      <TextInput label="งบที่ใช้จริง (บาท)" value={budgetUsed} onChange={setBudgetUsed} />
      <div className="sm:col-span-2">
        <SubmitButton label="เพิ่มโครงการ" />
        <FormMessage msg={msg} />
      </div>
    </form>
  );
}

function KpiForm({ supabase, activityOptions }: { supabase: any; activityOptions: ActivityOption[] }) {
  const [selectedCode, setSelectedCode] = useState("");
  const [target2570Override, setTarget2570Override] = useState("");
  const [activityId, setActivityId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const selected = MASTER_KPIS.find((k) => k.code === selectedCode);

  function handleSelectChange(code: string) {
    setSelectedCode(code);
    const found = MASTER_KPIS.find((k) => k.code === code);
    setTarget2570Override(found?.target_2570 != null ? String(found.target_2570) : "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!selected) {
      setMsg("กรุณาเลือกตัวชี้วัดจากรายการ");
      return;
    }
    const { error } = await supabase.from("kpis").insert({
      kpi_code: selected.code,
      kpi_name: selected.name,
      unit: selected.unit,
      target_2568: selected.target_2568,
      target_2569: selected.target_2569,
      target_2570: target2570Override ? Number(target2570Override) : selected.target_2570,
      activity_id: activityId || null,
    });
    if (error) {
      setMsg(`เพิ่ม KPI ไม่สำเร็จ: ${error.message}`);
      return;
    }
    setMsg(`เพิ่ม "${selected.name}" สำเร็จ — กรอกผลจริงรายไตรมาสได้ที่ปุ่ม "แก้ไข" ในรายการด้านบน`);
    setSelectedCode("");
    setTarget2570Override("");
    setActivityId("");
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="text-sm text-neutral-600 sm:col-span-2">
        เลือกตัวชี้วัด (จากเอกสารยืนยันเป้า 2570)
        <select
          value={selectedCode}
          onChange={(e) => handleSelectChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
        >
          <option value="">— เลือกตัวชี้วัด —</option>
          {MASTER_KPIS.map((k) => (
            <option key={k.code} value={k.code}>
              {k.code} — {k.name}
            </option>
          ))}
        </select>
      </label>

      {selected && (
        <>
          <label className="text-sm text-neutral-600">
            เป้าหมาย 2570 ({selected.unit})
            <input
              type="number"
              value={target2570Override}
              onChange={(e) => setTarget2570Override(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
            />
          </label>
          <label className="text-sm text-neutral-600">
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
        </>
      )}

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
          email: r.email || null,
          phone: r.phone || null,
        }));
      } else if (category === "budget") {
        table = "budget_items";
        payload = rows.map((r) => ({
          department_id: departmentId,
          fiscal_year: Number(r.fiscal_year) || null,
          category: "ไม่ระบุ",
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
          status: r.status || "รอดำเนินการ",
          start_date: r.start_date || null,
          end_date: r.end_date || null,
          budget_planned: Number(r.budget_planned) || 0,
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
        setMsg(`นำเข้าข้อมูลสำเร็จ ${payload.length} แถว — รีเฟรชหน้าเพื่อดูในรายการด้านบน`);
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
