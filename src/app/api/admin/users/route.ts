import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { hashPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { ROLE_KEYS, type RoleKey } from '@/lib/permissions';
import { generateTemporaryPassword } from '@/lib/tokens';

const roleKeys = Object.values(ROLE_KEYS) as [RoleKey, ...RoleKey[]];

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(3).regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, puntos, guiones y guiones bajos.'),
  roleKey: z.enum(roleKeys),
  schoolIds: z.array(z.string()).default([]),
});

export async function GET() {
  const { session, response } = await requirePermission('users.manage');
  if (!session) return response;

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: {
      roles: { include: { role: true } },
      schools: { include: { school: true } },
      permissionOverrides: { include: { permission: true } },
    },
  });

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      roleKey: user.roles[0]?.role.key ?? null,
      schoolIds: user.schools.map((userSchool) => userSchool.schoolId),
      permissionOverrides: user.permissionOverrides.map((override) => ({
        key: override.permission.key,
        granted: override.granted,
      })),
    })),
  });
}

export async function POST(request: Request) {
  const { session, response } = await requirePermission('users.manage');
  if (!session) return response;

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos.', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, username, roleKey, schoolIds } = parsed.data;

  const role = await prisma.role.findUniqueOrThrow({ where: { key: roleKey } });
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        username,
        passwordHash,
        mustChangePassword: true,
        roles: { create: { roleId: role.id } },
        schools: { create: schoolIds.map((schoolId) => ({ schoolId })) },
      },
    });

    await logAudit({
      request,
      userId: session.user.id,
      action: 'user.create',
      entityType: 'User',
      entityId: user.id,
      after: { id: user.id, name: user.name, email: user.email, username: user.username, roleKey, schoolIds },
    });

    return NextResponse.json(
      { user: { id: user.id, email: user.email, username: user.username }, temporaryPassword },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ message: 'El email o el usuario ya están en uso.' }, { status: 409 });
    }
    throw error;
  }
}
