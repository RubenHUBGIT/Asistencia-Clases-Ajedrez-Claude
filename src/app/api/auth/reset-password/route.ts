import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, isPasswordStrongEnough } from '@/lib/password';
import { hashToken } from '@/lib/tokens';

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Solicitud inválida.' }, { status: 400 });
  }

  const { token, password } = parsed.data;

  if (!isPasswordStrongEnough(password)) {
    return NextResponse.json(
      { message: 'La contraseña debe tener al menos 8 caracteres, con letras y números.' },
      { status: 400 },
    );
  }

  const tokenHash = hashToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return NextResponse.json({ message: 'El enlace no es válido o ha caducado.' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash, mustChangePassword: false },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ message: 'Contraseña actualizada correctamente.' });
}
