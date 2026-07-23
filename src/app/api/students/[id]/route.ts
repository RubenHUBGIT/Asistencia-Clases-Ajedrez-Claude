import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { hasSchoolAccess } from '@/lib/school-scope';

const updateStudentSchema = z.object({
  groupId: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  weekday: z.number().int().min(1).max(7).optional(),
  schedule: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePermission('students.edit');
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
  const parsed = updateStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos.', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { groupId, guardianEmail, ...rest } = parsed.data;

  if (groupId) {
    const group = await prisma.classGroup.findUnique({ where: { id: groupId } });
    if (!group || group.schoolId !== student.schoolId) {
      return NextResponse.json({ message: 'El grupo no pertenece a este colegio.' }, { status: 400 });
    }
  }

  const updated = await prisma.student.update({
    where: { id },
    data: {
      ...rest,
      ...(groupId ? { groupId } : {}),
      ...(guardianEmail !== undefined ? { guardianEmail: guardianEmail || null } : {}),
    },
    include: { group: true, school: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ student: updated });
}
