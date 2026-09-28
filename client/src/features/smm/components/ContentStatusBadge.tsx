import {
  SMM_CONTENT_STATUS_LABELS,
  type SmmContentStatus,
} from '@furniture-erp/shared';

import { Badge } from '@/components/ui/Badge';

import { contentStatusTone } from '../utils/ui';

export function ContentStatusBadge({ status }: { status: SmmContentStatus | string }) {
  return (
    <Badge tone={contentStatusTone(status)}>
      {SMM_CONTENT_STATUS_LABELS[status as SmmContentStatus] ?? status}
    </Badge>
  );
}
