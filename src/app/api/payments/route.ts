import { PaymentMethod, PaymentStatus, StudentStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { hasSchoolAccess } from '@/lib/school-scope';

const PAYMENT_STATUSES = [
  PaymentStatus.PENDING,
  PaymentStatus.PAID,
  PaymentStatus.PARTIAL,
  PaymentStatus.EXEMPT,
  PaymentStatus.NOT_APPLICABLE,
] as const;

const PAYMENT_METHODS = [
  PaymentMethod.CASH,
  PaymentMethod.TRANSFER,
  PaymentMethod.BIZUM,
  PaymentMethod.CARD,
  PaymentMethod.OTHER,
] as const;

const upsertPaymentSchema = z.object({
  studentId: z.string().min(1),
  schoolId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  status: z.enum(PAYMENT_STATUSES),
  expectedAmount: z.number().min(0),
  paidAmount: z.number().min(0),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const { session, response } = await requirePermission('payments.view');
  if (!session) return response;

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('schoolId');
  const groupId = searchParams.get('groupId');
  const month = Number(searchParams.get('month'));
  const year = Number(searchParams.get('year'));

  if (!schoolId || !month || !year || month < 1 || month > 12) {
    return NextResponse.json({ message: 'Parámetros inválidos.' }, { status: 400 });
  }
  if (!hasSchoolAccess(session, schoolId)) {
    return NextResponse.json({ message: 'No autorizado para este colegio.' }, { status: 403 });
  }

  const [students, payments] = await Promise.all([
    prisma.student.findMany({
      where: {
        schoolId,
        status: { not: StudentStatus.ARCHIVED },
        ...(groupId ? { groupId } : {}),
      },
      include: { group: { select: { id: true, name: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
    prisma.monthlyPayment.findMany({ where: { schoolId, month, year } }),
  ]);

  const paymentByStudentId = new Map(payments.map((p) => [p.studentId, p]));

  const roster = students.map((student) => {
    const payment = paymentByStudentId.get(student.id);
    return {
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      group: student.group,
      status: payment?.status ?? PaymentStatus.PENDING,
      expectedAmount: payment ? Number(payment.expectedAmount) : 0,
      paidAmount: payment ? Number(payment.paidAmount) : 0,
      paymentDate: payment?.paymentDate ? payment.paymentDate.toISOString().slice(0, 10) : '',
      method: payment?.method ?? '',
      notes: payment?.notes ?? '',
    };
  });

  return NextResponse.json({ roster });
}

export async function PATCH(request: Request) {
  const { session, response } = await requirePermission('payments.register');
  if (!session) return response;

  const body = await request.json().catch(() => null);
  const parsed = upsertPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Datos inválidos.', issues: parsed.error.flatten() }, { status: 400 });
  }

  const { studentId, schoolId, month, year, paymentDate, method, notes, ...rest } = parsed.data;

  if (!hasSchoolAccess(session, schoolId)) {
    return NextResponse.json({ message: 'No autorizado para este colegio.' }, { status: 403 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.schoolId !== schoolId) {
    return NextResponse.json({ message: 'El alumno no pertenece a este colegio.' }, { status: 400 });
  }

  const before = await prisma.monthlyPayment.findUnique({
    where: { studentId_month_year: { studentId, month, year } },
  });

  const payment = await prisma.monthlyPayment.upsert({
    where: { studentId_month_year: { studentId, month, year } },
    update: {
      ...rest,
      paymentDate: paymentDate ? new Date(`${paymentDate}T00:00:00.000Z`) : null,
      method: method ?? null,
      notes: notes || null,
      updatedByUserId: session.user.id,
    },
    create: {
      studentId,
      schoolId,
      month,
      year,
      ...rest,
      paymentDate: paymentDate ? new Date(`${paymentDate}T00:00:00.000Z`) : null,
      method: method ?? null,
      notes: notes || null,
      createdByUserId: session.user.id,
    },
  });

  await logAudit({
    request,
    userId: session.user.id,
    action: before ? 'payment.update' : 'payment.create',
    entityType: 'MonthlyPayment',
    entityId: payment.id,
    before,
    after: payment,
  });

  return NextResponse.json({ payment });
}
