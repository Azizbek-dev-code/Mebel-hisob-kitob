import { WORKER_RESPONSIBILITY_LABELS, type WorkerResponsibility } from '@furniture-erp/shared';

import { Badge } from '@/components/ui/Badge';

export function ResponsibilityBadges({
  responsibilities,
}: {
  responsibilities: WorkerResponsibility[];
}) {
  if (responsibilities.length === 0) {
    return <span className="text-sm text-ink-muted">None</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {responsibilities.map((item) => (
        <Badge key={item} tone="info">
          {WORKER_RESPONSIBILITY_LABELS[item]}
        </Badge>
      ))}
    </div>
  );
}
