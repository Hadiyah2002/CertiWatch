'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CertificateStatus } from '@/lib/types';
import { useIsNarrow } from '@/lib/useIsNarrow';

const STATUS_COLORS: Record<CertificateStatus, string> = {
  active: '#16A34A',
  expiring_soon: '#D97706',
  expired: '#DC2626',
};

interface StatusDonutChartProps {
  data: { status: CertificateStatus; label: string; count: number }[];
}

export default function StatusDonutChart({ data }: StatusDonutChartProps) {
  const isNarrow = useIsNarrow();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700">Certificate Status Breakdown</h3>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
            <Legend
              verticalAlign="bottom"
              height={isNarrow ? undefined : 36}
              wrapperStyle={{ fontSize: 12 }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
