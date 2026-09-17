"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function BudgetDonut({
  usedPct,
}: {
  usedPct: number;
}) {
  const data = [
    { name: "เบิกใช้แล้ว", value: usedPct },
    { name: "คงเหลือ", value: Math.max(100 - usedPct, 0) },
  ];
  const colors = ["#0E7A3B", "#EDEDED"];

  return (
    <div className="relative h-32 w-32 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={colors[i]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold text-[#0E7A3B]">{usedPct}%</span>
        <span className="text-[10px] text-neutral-500">เบิกใช้แล้ว</span>
      </div>
    </div>
  );
}
