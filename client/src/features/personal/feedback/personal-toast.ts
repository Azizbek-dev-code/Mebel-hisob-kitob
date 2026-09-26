export type PersonalToastAction = {
  label: string;
  onClick: () => void;
};

export type PersonalToastItem = {
  id: string;
  message: string;
  tone?: 'default' | 'success' | 'xp' | 'streak';
  action?: PersonalToastAction;
  durationMs?: number;
};

type Listener = (items: PersonalToastItem[]) => void;

let items: PersonalToastItem[] = [];
const listeners = new Set<Listener>();
const timers = new Map<string, number>();

function emit() {
  for (const listener of listeners) listener(items);
}

export function subscribePersonalToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(items);
  return () => listeners.delete(listener);
}

export function dismissPersonalToast(id: string) {
  const timer = timers.get(id);
  if (timer != null) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
  items = items.filter((item) => item.id !== id);
  emit();
}

export function showPersonalToast(input: Omit<PersonalToastItem, 'id'> & { id?: string }) {
  const id = input.id ?? `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const next: PersonalToastItem = {
    id,
    message: input.message,
    tone: input.tone ?? 'default',
    action: input.action,
    durationMs: input.durationMs ?? 3200,
  };
  items = [...items.filter((item) => item.id !== id), next].slice(-3);
  emit();

  if (next.durationMs && next.durationMs > 0) {
    const timer = window.setTimeout(() => dismissPersonalToast(id), next.durationMs);
    timers.set(id, timer);
  }

  return id;
}
