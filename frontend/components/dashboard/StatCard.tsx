import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

type ColorScheme = 'neutral' | 'green' | 'yellow' | 'red' | 'blue';

const COLOR_STYLES: Record<ColorScheme, { bg: string; text: string; iconBg: string }> = {
  neutral: { bg: 'bg-white', text: 'text-gray-900', iconBg: 'bg-gray-100 text-gray-500' },
  green: { bg: 'bg-white', text: 'text-status-active', iconBg: 'bg-green-50 text-status-active' },
  yellow: { bg: 'bg-white', text: 'text-status-expiring', iconBg: 'bg-amber-50 text-status-expiring' },
  red: { bg: 'bg-white', text: 'text-status-expired', iconBg: 'bg-red-50 text-status-expired' },
  blue: { bg: 'bg-white', text: 'text-status-renewal', iconBg: 'bg-blue-50 text-status-renewal' },
};

interface StatCardProps {
  label: string;
  value: number;
  color?: ColorScheme;
  icon?: LucideIcon;
}

export default function StatCard({ label, value, color = 'neutral', icon: Icon }: StatCardProps) {
  const styles = COLOR_STYLES[color];

  return (
    <div className={clsx('rounded-lg border border-gray-200 p-5 shadow-sm', styles.bg)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className={clsx('mt-2 text-3xl font-semibold', styles.text)}>{value}</p>
        </div>
        {Icon && (
          <div className={clsx('rounded-lg p-2', styles.iconBg)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
