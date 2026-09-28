import { useOutletContext, useParams } from 'react-router-dom';
import type { SmmProjectDetail } from '@furniture-erp/shared';

export interface SmmProjectOutletContext {
  projectId: string;
  project: SmmProjectDetail;
}

export function useSmmProjectContext(): SmmProjectOutletContext {
  const ctx = useOutletContext<SmmProjectOutletContext | undefined>();
  const { projectId = '' } = useParams();
  if (ctx?.projectId) return ctx;
  return { projectId, project: undefined as unknown as SmmProjectDetail };
}

export function useSmmProjectId(): string {
  const { projectId = '' } = useParams();
  const ctx = useOutletContext<SmmProjectOutletContext | undefined>();
  return ctx?.projectId || projectId;
}
