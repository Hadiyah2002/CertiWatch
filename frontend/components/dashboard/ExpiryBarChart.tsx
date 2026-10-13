'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useIsNarrow } from '@/lib/useIsNarrow';

interface ExpiryBarChartProps {
  data: { label: string; count: number }[];
}

export default function ExpiryBarChart({ data }: ExpiryBarChartProps) {
  const isNarrow = useIsNarrow();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700">Certificates by Days Until Expiry</h3>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: isNarrow ? 11 : 12, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
              interval={isNarrow ? 0 : undefined}
              angle={isNarrow ? -35 : 0}
              textAnchor={isNarrow ? 'end' : 'middle'}
              height={isNarrow ? 56 : 30}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: '#F8FAFC' }}
              contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
            />
            <Bar dataKey="count" fill="#0B4D3B" radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
