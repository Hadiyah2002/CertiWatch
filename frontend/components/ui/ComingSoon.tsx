import type { LucideIcon } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function ComingSoon({ title, description, icon: Icon }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-20 text-center">
        <div className="rounded-full bg-gray-100 p-3 text-gray-400">
          <Icon className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-medium text-gray-600">This section is coming in a follow-up build.</p>
        <p className="mt-1 text-xs text-gray-400">The layout and navigation are already wired up for it.</p>
      </div>
    </div>
  );
}
