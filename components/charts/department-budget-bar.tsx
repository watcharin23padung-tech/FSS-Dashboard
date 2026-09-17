"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const thb = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

export default function DepartmentBudgetBar({
  data,
}: {
  data: { name: string; allocated: number; pct: number }[];
}) {
  // Shorten long department names for the axis label
  const chartData = data.map((d) => ({
    ...d,
    shortName: d.name.length > 18 ? d.name.slice(0, 17) + "…" : d.name,
  }));

  return (
    <div style={{ width: "100%", height: Math.max(chartData.length * 32, 120) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="shortName"
            width={150}
            tick={{ fontSize: 12, fill: "#525252" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => `${thb.format(value)} บาท`}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="allocated" radius={[0, 4, 4, 0]} barSize={16}>
            {chartData.map((d) => (
              <Cell key={d.name} fill={d.pct === 100 ? "#0E7A3B" : "#FFD100"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
