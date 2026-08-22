import { Construction, type LucideIcon } from 'lucide-react';

export interface ModulePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** The phase that will replace this screen, when it is already decided. */
  phase?: string;
}

/**
 * Holds the place of a module the shell can already reach but no phase has built.
 *
 * A page that says what will live here — and when — is worth more than an empty
 * route, both to whoever is testing the navigation and to whoever builds it next.
 */
export function ModulePlaceholder({
  icon: Icon,
  title,
  description,
  phase,
}: ModulePlaceholderProps) {
  return (
    <section className="rounded-panel border border-dashed border-line-strong bg-surface p-8 text-center shadow-card sm:p-12">
      <div className="mx-auto flex size-12 items-center justify-center rounded-card bg-brand-50 text-brand-600">
        <Icon className="size-6" aria-hidden="true" />
      </div>

      <h2 className="mt-4 text-base font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-muted">{description}</p>

      <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-warning-50 px-3 py-1 text-xs font-medium text-warning-700">
        <Construction className="size-3.5" aria-hidden="true" />
        Coming in {phase ?? 'a later phase'}
      </p>
    </section>
  );
}
