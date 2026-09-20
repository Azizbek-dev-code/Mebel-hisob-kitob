import { describe, expect, it } from 'vitest';

import { parseStringIdList, serializeStringIdList } from './json-ids.js';

describe('parseStringIdList', () => {
  it('returns an empty list for missing or invalid payloads', () => {
    expect(parseStringIdList(undefined)).toEqual([]);
    expect(parseStringIdList(null)).toEqual([]);
    expect(parseStringIdList('not-json')).toEqual([]);
    expect(parseStringIdList('{"a":1}')).toEqual([]);
  });

  it('keeps only non-empty strings', () => {
    expect(parseStringIdList('["a","","b",3]')).toEqual(['a', 'b']);
  });
});

describe('serializeStringIdList', () => {
  it('stores unique ids or null when empty', () => {
    expect(serializeStringIdList(undefined)).toBeNull();
    expect(serializeStringIdList([])).toBeNull();
    expect(serializeStringIdList(['todo_1', 'todo_1', 'todo_2'])).toBe('["todo_1","todo_2"]');
  });
});
