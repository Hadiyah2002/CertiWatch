'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useIsNarrow } from '@/lib/useIsNarrow';

interface MonthlyExpiryChartProps {
  data: { month_name: string; count: number }[];
}

export default function MonthlyExpiryChart({ data }: MonthlyExpiryChartProps) {
  const isNarrow = useIsNarrow();
  const chartData = data.map((m) => ({ name: m.month_name.slice(0, 3), count: m.count }));

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: isNarrow ? 10 : 12, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            interval={isNarrow ? 0 : undefined}
            angle={isNarrow ? -50 : 0}
            textAnchor={isNarrow ? 'end' : 'middle'}
            height={isNarrow ? 40 : 30}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: '#F8FAFC' }}
            contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
          />
          <Bar dataKey="count" fill="#0B4D3B" radius={[6, 6, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
