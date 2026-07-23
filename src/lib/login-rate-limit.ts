import { prisma } from './prisma';

const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS ?? 5);
const LOCKOUT_MINUTES = Number(process.env.LOGIN_LOCKOUT_MINUTES ?? 15);

// Bloqueo temporal: si los últimos MAX_ATTEMPTS intentos dentro de la ventana
// de LOCKOUT_MINUTES fueron todos fallidos, se considera bloqueado. Un único
// intento correcto dentro de la ventana desbloquea de nuevo al usuario/IP.
export async function isLoginLocked(identifier: string, ipAddress: string): Promise<boolean> {
  const since = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000);
  const recentAttempts = await prisma.loginAttempt.findMany({
    where: { identifier, ipAddress, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: MAX_ATTEMPTS,
  });

  if (recentAttempts.length < MAX_ATTEMPTS) return false;
  return recentAttempts.every((attempt) => !attempt.success);
}

export async function recordLoginAttempt(
  identifier: string,
  ipAddress: string,
  success: boolean,
): Promise<void> {
  await prisma.loginAttempt.create({ data: { identifier, ipAddress, success } });
}

export function getClientIp(headers: Headers | undefined): string {
  const forwarded = headers?.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return headers?.get('x-real-ip') ?? 'unknown';
}
