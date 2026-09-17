"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function KpiStatusPie({
  onTrack,
  behind,
  noData,
}: {
  onTrack: number;
  behind: number;
  noData: number;
}) {
  const total = onTrack + behind + noData;
  const data = [
    { name: "บรรลุเป้าแล้ว", value: onTrack, color: "#0E7A3B" },
    { name: "ยังไม่ถึงเป้า", value: behind, color: "#DC2626" },
    { name: "ยังไม่มีผลดำเนินงาน", value: noData, color: "#D4D4D4" },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-24 w-24 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="60%" outerRadius="100%" stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg font-semibold">{onTrack}</span>
          <span className="text-[9px] text-neutral-500">/{total}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 text-xs">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
            <span className="text-neutral-600">
              {d.name} ({d.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
