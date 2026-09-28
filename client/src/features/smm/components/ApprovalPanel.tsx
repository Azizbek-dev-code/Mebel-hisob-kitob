import {
  SMM_APPROVAL_DECISION_LABELS,
  SmmApprovalDecision,
  type SmmApprovalDecision as SmmApprovalDecisionType,
  type SmmContentApprovalListItem,
} from '@furniture-erp/shared';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { ApiClientError } from '@/lib/api-client';
import { formatDateTime } from '@/utils/format';

import {
  useCreateSmmApproval,
  useDecideSmmApproval,
  useSmmApprovals,
} from '../hooks/use-smm';
import { BTN_PRIMARY, BTN_SECONDARY, FIELD_CLASS } from '../utils/ui';

interface ApprovalPanelProps {
  contentId: string;
}

function latestPendingId(items: SmmContentApprovalListItem[]): string | null {
  const pending = items
    .filter((item) => item.decision === SmmApprovalDecision.PENDING)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return pending[0]?.id ?? null;
}

export function ApprovalPanel({ contentId }: ApprovalPanelProps) {
  const approvals = useSmmApprovals(contentId);
  const create = useCreateSmmApproval(contentId);
  const decide = useDecideSmmApproval(contentId);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const actionablePendingId = useMemo(
    () => latestPendingId(approvals.data ?? []),
    [approvals.data],
  );

  async function requestReview() {
    setError(null);
    try {
      await create.mutateAsync({
        decision: SmmApprovalDecision.PENDING,
        comment: comment.trim() || null,
      });
      setComment('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Yaratib bo‘lmadi');
    }
  }

  async function decideApproval(decision: SmmApprovalDecisionType) {
    setError(null);
    try {
      await decide.mutateAsync({
        decision,
        comment: comment.trim() || null,
      });
      setComment('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Qaror qabul qilinmadi');
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-ink">Tasdiqlash</h3>
      {error ? <p className="text-sm text-danger-700">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className={FIELD_CLASS}
          placeholder="Izoh"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button type="button" className={BTN_PRIMARY} disabled={create.isPending} onClick={() => void requestReview()}>
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Tekshiruv so‘rash
        </button>
      </div>

      {(approvals.data ?? []).length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Tasdiqlash yo‘q" description="Mijoz yoki ichki tekshiruvni so‘rang" />
      ) : (
        <ul className="space-y-2">
          {(approvals.data ?? []).map((item) => (
            <li key={item.id} className="rounded-input border border-line bg-surface px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {item.reviewer?.fullName ?? item.reviewerRole ?? 'Tekshiruvchi'}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {item.createdAt ? formatDateTime(item.createdAt) : '—'}
                  </p>
                </div>
                <Badge
                  tone={
                    item.decision === SmmApprovalDecision.APPROVED
                      ? 'success'
                      : item.decision === SmmApprovalDecision.REJECTED
                        ? 'danger'
                        : item.decision === SmmApprovalDecision.REVISION_REQUESTED
                          ? 'warning'
                          : 'neutral'
                  }
                >
                  {SMM_APPROVAL_DECISION_LABELS[item.decision]}
                </Badge>
              </div>
              {item.comment ? <p className="mt-1 text-sm text-ink-soft">{item.comment}</p> : null}
              {item.id === actionablePendingId ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={BTN_PRIMARY}
                    disabled={decide.isPending}
                    onClick={() => void decideApproval(SmmApprovalDecision.APPROVED)}
                  >
                    {decide.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Tasdiqlash
                  </button>
                  <button
                    type="button"
                    className={BTN_SECONDARY}
                    disabled={decide.isPending}
                    onClick={() => void decideApproval(SmmApprovalDecision.REVISION_REQUESTED)}
                  >
                    Qayta ishlash
                  </button>
                  <button
                    type="button"
                    className={BTN_SECONDARY}
                    disabled={decide.isPending}
                    onClick={() => void decideApproval(SmmApprovalDecision.REJECTED)}
                  >
                    Rad etish
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
