import { describe, expect, it } from 'vitest';
import { getClientIp } from '@/lib/login-rate-limit';

describe('getClientIp', () => {
  it('uses the first address from x-forwarded-for when present', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' });
    expect(getClientIp(headers)).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.7' });
    expect(getClientIp(headers)).toBe('198.51.100.7');
  });

  it('returns "unknown" when no relevant headers are present', () => {
    expect(getClientIp(new Headers())).toBe('unknown');
    expect(getClientIp(undefined)).toBe('unknown');
  });
});
