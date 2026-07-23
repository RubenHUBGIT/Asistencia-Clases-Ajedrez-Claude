import { StudentStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { hasSchoolAccess } from '@/lib/school-scope';

const statusSchema = z.object({
  status: z.enum([StudentStatus.ACTIVE, StudentStatus.INACTIVE, StudentStatus.ARCHIVED]),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePermission('students.delete');
  if (!session) return response;

  const { id } = await context.params;
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) {
    return NextResponse.json({ message: 'Alumno no encontrado.' }, { status: 404 });
  }
  if (!hasSchoolAccess(session, student.schoolId)) {
    return NextResponse.json({ message: 'No autorizado para este colegio.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos.' }, { status: 400 });
  }

  const updated = await prisma.student.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  await logAudit({
    request,
    userId: session.user.id,
    action: 'student.status_change',
    entityType: 'Student',
    entityId: updated.id,
    before: { status: student.status },
    after: { status: updated.status },
  });

  return NextResponse.json({ student: updated });
}
