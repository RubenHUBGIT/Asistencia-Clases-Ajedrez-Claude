import { SchoolStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { hasSchoolAccess } from '@/lib/school-scope';

const statusSchema = z.object({
  status: z.enum([SchoolStatus.ACTIVE, SchoolStatus.ARCHIVED]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePermission('schools.delete');
  if (!session) return response;

  const { id } = await context.params;
  if (!hasSchoolAccess(session, id)) {
    return NextResponse.json({ message: 'No autorizado para este colegio.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos.' }, { status: 400 });
  }

  const before = await prisma.school.findUnique({ where: { id } });

  const school = await prisma.school.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  await logAudit({
    request,
    userId: session.user.id,
    action: 'school.status_change',
    entityType: 'School',
    entityId: school.id,
    before: { status: before?.status },
    after: { status: school.status },
  });

  return NextResponse.json({ school });
}
