import type { WorkerStats } from '@furniture-erp/shared';

import { SectionCard } from '@/components/ui/SectionCard';

const STAT_LABELS: { key: keyof WorkerStats; label: string }[] = [
  { key: 'salesToday', label: "Today's sales" },
  { key: 'salesThisMonth', label: 'Sales this month' },
  { key: 'totalSales', label: 'Sales total' },
  { key: 'pendingAssemblyTasks', label: 'Pending tasks' },
  { key: 'completedTasksThisMonth', label: 'Completed this month' },
  { key: 'completedAssemblyTasks', label: 'Assembly completed' },
  { key: 'totalAssemblyTasks', label: 'Assembly tasks total' },
];

export function WorkerStatsGrid({
  stats,
  keys,
}: {
  stats: WorkerStats;
  keys?: (keyof WorkerStats)[];
}) {
  const visible = keys
    ? STAT_LABELS.filter((entry) => keys.includes(entry.key))
    : STAT_LABELS;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {visible.map((entry) => (
        <SectionCard key={entry.key} title={entry.label}>
          <p className="text-2xl font-semibold tracking-tight text-ink">{stats[entry.key]}</p>
        </SectionCard>
      ))}
    </div>
  );
}
