import { cn } from '@/lib/utils';

const statusMap: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-700',
  success: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  queued: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  suspended: 'bg-red-100 text-red-700',
  blocked: 'bg-red-100 text-red-700',
  error: 'bg-red-100 text-red-700',
  running: 'bg-blue-100 text-blue-700',
  processing: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-600',
  paused: 'bg-gray-100 text-gray-600',
  inactive: 'bg-gray-100 text-gray-600',
  expired: 'bg-gray-100 text-gray-600',
  trialing: 'bg-purple-100 text-purple-700',
  past_due: 'bg-orange-100 text-orange-700',
  refunded: 'bg-gray-100 text-gray-600',
  deleted: 'bg-red-100 text-red-600',
  single_video: 'bg-blue-50 text-blue-600',
  bulk: 'bg-purple-50 text-purple-600',
  scheduled: 'bg-indigo-50 text-indigo-600',
  channel: 'bg-teal-50 text-teal-600',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = (status ?? '').toLowerCase().replace(' ', '_');
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium', statusMap[s] ?? 'bg-gray-100 text-gray-600', className)}>
      {s === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
      {status}
    </span>
  );
}
