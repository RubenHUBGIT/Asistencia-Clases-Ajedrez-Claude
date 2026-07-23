import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

// Requisito minimo razonable para una app de gestion interna: 8+ caracteres,
// al menos una letra y un numero. Se documenta en el README.
const PASSWORD_POLICY_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function isPasswordStrongEnough(plainPassword: string): boolean {
  return PASSWORD_POLICY_REGEX.test(plainPassword);
}
