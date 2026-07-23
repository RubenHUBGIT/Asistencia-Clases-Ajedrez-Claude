import { SchoolStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/api-auth';
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

  const school = await prisma.school.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ school });
}
