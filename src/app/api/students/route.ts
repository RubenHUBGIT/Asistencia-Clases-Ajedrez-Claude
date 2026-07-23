import { StudentStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { hasSchoolAccess, isAdmin } from '@/lib/school-scope';

const createStudentSchema = z.object({
  schoolId: z.string().min(1),
  groupId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  weekday: z.number().int().min(1).max(7).optional(),
  schedule: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
});

async function resolveGroupId(schoolId: string, groupId: string | undefined) {
  if (groupId) return groupId;

  const defaultGroup = await prisma.classGroup.upsert({
    where: { schoolId_name: { schoolId, name: 'General' } },
    update: {},
    create: { schoolId, name: 'General', isDefault: true },
  });
  return defaultGroup.id;
}

export async function GET(request: Request) {
  const { session, response } = await requirePermission('students.view');
  if (!session) return response;

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('schoolId');
  const groupId = searchParams.get('groupId');
  const query = searchParams.get('q')?.trim();
  const statusParam = searchParams.get('status');
  const status: StudentStatus | undefined =
    statusParam === 'INACTIVE'
      ? StudentStatus.INACTIVE
      : statusParam === 'ARCHIVED'
        ? StudentStatus.ARCHIVED
        : statusParam === 'ALL'
          ? undefined
          : StudentStatus.ACTIVE;

  if (schoolId && !hasSchoolAccess(session, schoolId)) {
    return NextResponse.json({ message: 'No autorizado para este colegio.' }, { status: 403 });
  }

  const students = await prisma.student.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(schoolId ? { schoolId } : isAdmin(session) ? {} : { schoolId: { in: session.user.schoolIds } }),
      ...(groupId ? { groupId } : {}),
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: { group: true, school: { select: { id: true, name: true } } },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  return NextResponse.json({ students });
}

export async function POST(request: Request) {
  const { session, response } = await requirePermission('students.create');
  if (!session) return response;

  const body = await request.json().catch(() => null);
  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos.', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { schoolId, groupId, guardianEmail, ...rest } = parsed.data;
  if (!hasSchoolAccess(session, schoolId)) {
    return NextResponse.json({ message: 'No autorizado para este colegio.' }, { status: 403 });
  }

  if (groupId) {
    const group = await prisma.classGroup.findUnique({ where: { id: groupId } });
    if (!group || group.schoolId !== schoolId) {
      return NextResponse.json({ message: 'El grupo no pertenece a este colegio.' }, { status: 400 });
    }
  }

  const resolvedGroupId = await resolveGroupId(schoolId, groupId);

  const student = await prisma.student.create({
    data: {
      ...rest,
      schoolId,
      groupId: resolvedGroupId,
      guardianEmail: guardianEmail || null,
    },
    include: { group: true, school: { select: { id: true, name: true } } },
  });

  await logAudit({
    request,
    userId: session.user.id,
    action: 'student.create',
    entityType: 'Student',
    entityId: student.id,
    after: student,
  });

  return NextResponse.json({ student }, { status: 201 });
}
