import { describe, expect, it } from 'vitest';
import { parseDateOnly, todayDateOnlyString } from '@/lib/dates';

describe('parseDateOnly', () => {
  it('parses a YYYY-MM-DD string as UTC midnight', () => {
    const date = parseDateOnly('2026-03-05');
    expect(date.toISOString()).toBe('2026-03-05T00:00:00.000Z');
  });
});

describe('todayDateOnlyString', () => {
  it('returns a YYYY-MM-DD string matching the current UTC date', () => {
    const expected = new Date().toISOString().slice(0, 10);
    expect(todayDateOnlyString()).toBe(expected);
    expect(todayDateOnlyString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
