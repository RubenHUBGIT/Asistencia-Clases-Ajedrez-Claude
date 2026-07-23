import { describe, expect, it } from 'vitest';
import { generatePasswordResetToken, generateTemporaryPassword, hashToken } from '@/lib/tokens';
import { isPasswordStrongEnough } from '@/lib/password';

describe('generatePasswordResetToken', () => {
  it('produces a token whose hash matches the stored hash', () => {
    const { token, tokenHash } = generatePasswordResetToken();
    expect(hashToken(token)).toBe(tokenHash);
  });

  it('produces different tokens on each call', () => {
    const first = generatePasswordResetToken();
    const second = generatePasswordResetToken();
    expect(first.token).not.toBe(second.token);
  });
});

describe('generateTemporaryPassword', () => {
  it('satisfies the password strength policy', () => {
    const password = generateTemporaryPassword();
    expect(isPasswordStrongEnough(password)).toBe(true);
  });
});
