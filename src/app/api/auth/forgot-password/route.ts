import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { generatePasswordResetToken } from '@/lib/tokens';
import { sendPasswordResetEmail } from '@/lib/mailer';

const schema = z.object({ identifier: z.string().min(1) });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Solicitud inválida.' }, { status: 400 });
  }

  // Respuesta siempre genérica: no debe ser posible distinguir si el usuario existe.
  const genericResponse = NextResponse.json({
    message: 'Si el usuario existe, se ha enviado un enlace de restablecimiento a su correo.',
  });

  const { identifier } = parsed.data;
  const user = await prisma.user.findFirst({
    where: {
      isActive: true,
      OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
    },
  });

  if (!user) return genericResponse;

  const minutes = Number(process.env.PASSWORD_RESET_TOKEN_MINUTES ?? 60);
  const { token, tokenHash } = generatePasswordResetToken();

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + minutes * 60 * 1000) },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL ?? ''}/restablecer-password?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  return genericResponse;
}
