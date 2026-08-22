/**
 * Nested-safe body scroll lock for overlays (Dialog, drawers, ad-hoc modals).
 * Without a counter, closing an inner overlay restores overflow while an outer
 * one is still open — and racing overflow writes can coincide with React
 * commitPlacement on the same document subtree.
 */

let lockCount = 0;
let previousOverflow = '';

export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = previousOverflow;
      previousOverflow = '';
    }
  };
}

/** Test-only reset so suites do not leak lock state. */
export function resetBodyScrollLockForTests(): void {
  lockCount = 0;
  previousOverflow = '';
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
}
