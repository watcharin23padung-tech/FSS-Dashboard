"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function MiniDonut({
  achieved,
  behind,
  noData,
}: {
  achieved: number;
  behind: number;
  noData: number;
}) {
  const total = achieved + behind + noData;
  const data = [
    { name: "บรรลุเป้าแล้ว", value: achieved, color: "#0E7A3B" },
    { name: "ยังไม่ถึงเป้า", value: behind, color: "#DC2626" },
    { name: "ยังไม่มีผลดำเนินงาน", value: noData, color: "#E5E5E5" },
  ].filter((d) => d.value > 0);

  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="relative h-16 w-16 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="62%" outerRadius="100%" stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-semibold">{achieved}</span>
          <span className="text-[9px] text-neutral-400">/{total}</span>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 text-[11px] text-neutral-500">
        <span>
          <span className="font-medium text-[#0E7A3B]">{achieved}</span> บรรลุเป้า
        </span>
        <span>
          <span className="font-medium text-red-600">{behind}</span> ยังไม่ถึง
        </span>
        <span>
          <span className="font-medium text-neutral-400">{noData}</span> ยังไม่มีผล
        </span>
      </div>
    </div>
  );
}
