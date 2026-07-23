import { AttendanceStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { parseDateOnly } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import { hasSchoolAccess, isAdmin } from '@/lib/school-scope';

const VALID_STATUSES = new Set(Object.values(AttendanceStatus));

export async function GET(request: Request) {
  const { session, response } = await requirePermission('attendance.view_history');
  if (!session) return response;

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('schoolId');
  const groupId = searchParams.get('groupId');
  const studentId = searchParams.get('studentId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const statusParam = searchParams.get('status');
  const status = statusParam && VALID_STATUSES.has(statusParam as AttendanceStatus) ? (statusParam as AttendanceStatus) : undefined;

  if (schoolId && !hasSchoolAccess(session, schoolId)) {
    return NextResponse.json({ message: 'No autorizado para este colegio.' }, { status: 403 });
  }

  const attendances = await prisma.attendance.findMany({
    where: {
      ...(schoolId ? { schoolId } : isAdmin(session) ? {} : { schoolId: { in: session.user.schoolIds } }),
      ...(groupId ? { classGroupId: groupId } : {}),
      ...(studentId ? { studentId } : {}),
      ...(status ? { status } : {}),
      ...(dateFrom || dateTo
        ? {
            classDate: {
              ...(dateFrom ? { gte: parseDateOnly(dateFrom) } : {}),
              ...(dateTo ? { lte: parseDateOnly(dateTo) } : {}),
            },
          }
        : {}),
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      classGroup: { select: { id: true, name: true } },
      school: { select: { id: true, name: true } },
    },
    orderBy: [{ classDate: 'desc' }],
    take: 500,
  });

  return NextResponse.json({ attendances });
}
