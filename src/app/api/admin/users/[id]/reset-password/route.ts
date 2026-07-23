import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { sendPasswordResetEmail } from '@/lib/mailer';
import { prisma } from '@/lib/prisma';
import { generatePasswordResetToken } from '@/lib/tokens';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePermission('users.manage');
  if (!session) return response;

  const { id } = await context.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
  }

  const minutes = Number(process.env.PASSWORD_RESET_TOKEN_MINUTES ?? 60);
  const { token, tokenHash } = generatePasswordResetToken();

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + minutes * 60 * 1000) },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL ?? ''}/restablecer-password?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  return NextResponse.json({ message: 'Se ha enviado un enlace de restablecimiento al usuario.' });
}
