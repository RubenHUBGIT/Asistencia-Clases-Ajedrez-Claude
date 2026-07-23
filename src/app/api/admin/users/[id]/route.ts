import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS, ROLE_KEYS, type RoleKey } from '@/lib/permissions';

const roleKeys = Object.values(ROLE_KEYS) as [RoleKey, ...RoleKey[]];

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  username: z
    .string()
    .min(3)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, puntos, guiones y guiones bajos.')
    .optional(),
  isActive: z.boolean().optional(),
  roleKey: z.enum(roleKeys).optional(),
  schoolIds: z.array(z.string()).optional(),
  effectivePermissions: z.array(z.string()).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePermission('users.manage');
  if (!session) return response;

  const { id } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos.', issues: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const isSelf = id === session.user.id;
  if (isSelf && (payload.roleKey !== undefined || payload.isActive !== undefined)) {
    return NextResponse.json(
      { message: 'No puedes cambiar tu propio rol o estado. Pide a otro administrador que lo haga.' },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });
  if (!existing) {
    return NextResponse.json({ message: 'Usuario no encontrado.' }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(payload.name !== undefined ? { name: payload.name } : {}),
          ...(payload.email !== undefined ? { email: payload.email.toLowerCase() } : {}),
          ...(payload.username !== undefined ? { username: payload.username } : {}),
          ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        },
      });

      let effectiveRoleKey = existing.roles[0]?.role.key as RoleKey | undefined;

      if (payload.roleKey && payload.roleKey !== effectiveRoleKey) {
        const role = await tx.role.findUniqueOrThrow({ where: { key: payload.roleKey } });
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.create({ data: { userId: id, roleId: role.id } });
        effectiveRoleKey = payload.roleKey;
      }

      if (payload.schoolIds) {
        await tx.userSchool.deleteMany({ where: { userId: id } });
        if (payload.schoolIds.length > 0) {
          await tx.userSchool.createMany({
            data: payload.schoolIds.map((schoolId) => ({ userId: id, schoolId })),
          });
        }
      }

      if (payload.effectivePermissions && effectiveRoleKey) {
        const permissions = await tx.permission.findMany();
        const permissionIdByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));
        const defaults = new Set<string>(DEFAULT_ROLE_PERMISSIONS[effectiveRoleKey]);
        const desired = new Set(payload.effectivePermissions);

        await tx.userPermission.deleteMany({ where: { userId: id } });

        const overrides = ALL_PERMISSION_KEYS.filter((key) => defaults.has(key) !== desired.has(key)).map(
          (key) => ({ userId: id, permissionId: permissionIdByKey.get(key)!, granted: desired.has(key) }),
        );

        if (overrides.length > 0) {
          await tx.userPermission.createMany({ data: overrides });
        }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ message: 'El email o el usuario ya están en uso.' }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ message: 'Usuario actualizado correctamente.' });
}
