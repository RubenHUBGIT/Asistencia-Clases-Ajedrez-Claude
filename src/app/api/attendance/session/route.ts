import { AttendanceStatus, StudentStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { parseDateOnly, todayDateOnlyString } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import { hasSchoolAccess } from '@/lib/school-scope';

const recordSchema = z.object({
  studentId: z.string().min(1),
  status: z.enum([
    AttendanceStatus.PRESENT,
    AttendanceStatus.ABSENT,
    AttendanceStatus.JUSTIFIED,
    AttendanceStatus.CANCELLED,
    AttendanceStatus.MAKEUP,
    AttendanceStatus.UNRECORDED,
  ]),
  note: z.string().optional(),
});

const saveSessionSchema = z.object({
  schoolId: z.string().min(1),
  groupId: z.string().min(1),
  classDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(recordSchema),
});

export async function GET(request: Request) {
  const { session, response } = await requireSession();
  if (!session) return response;

  if (
    !session.user.permissions.includes('attendance.register') &&
    !session.user.permissions.includes('attendance.view_history')
  ) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('schoolId');
  const groupId = searchParams.get('groupId');
  const date = searchParams.get('date');

  if (!schoolId || !groupId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ message: 'Parámetros inválidos.' }, { status: 400 });
  }
  if (!hasSchoolAccess(session, schoolId)) {
    return NextResponse.json({ message: 'No autorizado para este colegio.' }, { status: 403 });
  }

  const classDate = parseDateOnly(date);

  const [students, attendances] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId, groupId, status: { not: StudentStatus.ARCHIVED } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
    prisma.attendance.findMany({ where: { schoolId, classGroupId: groupId, classDate } }),
  ]);

  const attendanceByStudentId = new Map(attendances.map((a) => [a.studentId, a]));

  const roster = students.map((student) => {
    const attendance = attendanceByStudentId.get(student.id);
    return {
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      status: attendance?.status ?? AttendanceStatus.UNRECORDED,
      note: attendance?.note ?? '',
    };
  });

  return NextResponse.json({ roster, today: todayDateOnlyString() });
}

export async function POST(request: Request) {
  const { session, response } = await requireSession();
  if (!session) return response;

  const body = await request.json().catch(() => null);
  const parsed = saveSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos.', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { schoolId, groupId, classDate: classDateStr, records } = parsed.data;

  if (!hasSchoolAccess(session, schoolId)) {
    return NextResponse.json({ message: 'No autorizado para este colegio.' }, { status: 403 });
  }

  const today = todayDateOnlyString();
  if (classDateStr > today) {
    return NextResponse.json({ message: 'No se puede registrar asistencia de una fecha futura.' }, { status: 400 });
  }

  const isPast = classDateStr < today;
  const requiredPermissions = isPast
    ? ['attendance.register', 'attendance.edit_past']
    : ['attendance.register'];
  const missingPermission = requiredPermissions.some((p) => !session.user.permissions.includes(p));
  if (missingPermission) {
    return NextResponse.json({ message: 'No autorizado.' }, { status: 403 });
  }

  const group = await prisma.classGroup.findUnique({ where: { id: groupId } });
  if (!group || group.schoolId !== schoolId) {
    return NextResponse.json({ message: 'El grupo no pertenece a este colegio.' }, { status: 400 });
  }

  const classDate = parseDateOnly(classDateStr);

  await prisma.$transaction(
    records.map((record) =>
      prisma.attendance.upsert({
        where: { studentId_classDate: { studentId: record.studentId, classDate } },
        update: {
          status: record.status,
          note: record.note || null,
          updatedByUserId: session.user.id,
        },
        create: {
          studentId: record.studentId,
          schoolId,
          classGroupId: groupId,
          classDate,
          status: record.status,
          note: record.note || null,
          createdByUserId: session.user.id,
        },
      }),
    ),
  );

  await logAudit({
    request,
    userId: session.user.id,
    action: 'attendance.register_session',
    entityType: 'AttendanceSession',
    entityId: `${groupId}:${classDateStr}`,
    after: { schoolId, groupId, classDate: classDateStr, records },
  });

  return NextResponse.json({ ok: true });
}
