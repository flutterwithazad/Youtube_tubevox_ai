import { type LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  loading?: boolean;
  color?: string;
}

export function StatCard({ label, value, icon: Icon, loading, color = 'indigo' }: Props) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
        {Icon && <div className={`p-1.5 rounded-lg ${colors[color]}`}><Icon className="w-4 h-4" /></div>}
      </div>
      {loading ? (
        <div className="h-7 w-20 bg-gray-100 animate-pulse rounded" />
      ) : (
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      )}
    </div>
  );
}
