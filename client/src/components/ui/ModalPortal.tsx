import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders overlay UI under `document.body` so React list/form reconciliations
 * in page trees cannot fight modal DOM (the classic insertBefore NotFoundError).
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') {
    return null;
  }
  return createPortal(children, document.body);
}
