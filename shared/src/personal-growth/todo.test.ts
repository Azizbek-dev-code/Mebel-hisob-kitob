import { describe, expect, it } from 'vitest';

import { suggestTodoFromTitle } from './todo.js';

describe('suggestTodoFromTitle', () => {
  it('extracts minutes and category from a plain title', () => {
    const hint = suggestTodoFromTitle('React authentication — 60 min');
    expect(hint.estimatedMinutes).toBe(60);
    expect(hint.category).toBe('Dasturlash');
    expect(hint.dueHint).toBe('TODAY');
  });

  it('marks urgent IELTS work as high priority', () => {
    const hint = suggestTodoFromTitle('Bugun IELTS vocabulary muhim');
    expect(hint.priority).toBe('HIGH');
    expect(hint.category).toBe('IELTS');
    expect(hint.dueHint).toBe('TODAY');
  });
});
