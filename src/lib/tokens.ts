import { createHash, randomBytes } from 'crypto';

export function generatePasswordResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('hex');
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Contraseña temporal para altas de usuario hechas por un administrador.
// Cumple la política mínima (letras + números + 8 caracteres) por construcción.
export function generateTemporaryPassword(): string {
  return `Ch${randomBytes(6).toString('hex')}9`;
}
