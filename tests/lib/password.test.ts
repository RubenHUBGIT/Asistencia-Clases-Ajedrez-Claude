import { describe, expect, it } from 'vitest';
import { hashPassword, isPasswordStrongEnough, verifyPassword } from '@/lib/password';

describe('hashPassword / verifyPassword', () => {
  it('hashes a password and verifies it against the original', async () => {
    const hash = await hashPassword('Secreto123');
    expect(hash).not.toBe('Secreto123');
    await expect(verifyPassword('Secreto123', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password against a hash', async () => {
    const hash = await hashPassword('Secreto123');
    await expect(verifyPassword('OtraCosa123', hash)).resolves.toBe(false);
  });
});

describe('isPasswordStrongEnough', () => {
  it('accepts passwords with letters, numbers and at least 8 characters', () => {
    expect(isPasswordStrongEnough('Abcdef12')).toBe(true);
    expect(isPasswordStrongEnough('contrasena1')).toBe(true);
  });

  it('rejects passwords that are too short', () => {
    expect(isPasswordStrongEnough('Ab1')).toBe(false);
  });

  it('rejects passwords without a number', () => {
    expect(isPasswordStrongEnough('SoloLetras')).toBe(false);
  });

  it('rejects passwords without a letter', () => {
    expect(isPasswordStrongEnough('12345678')).toBe(false);
  });
});
