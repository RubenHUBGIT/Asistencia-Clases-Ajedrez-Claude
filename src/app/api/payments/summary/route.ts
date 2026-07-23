import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/school-scope';

export async function GET(request: Request) {
  const { session, response } = await requirePermission('payments.view');
  if (!session) return response;

  const { searchParams } = new URL(request.url);
  const month = Number(searchParams.get('month'));
  const year = Number(searchParams.get('year'));

  if (!month || !year || month < 1 || month > 12) {
    return NextResponse.json({ message: 'Parámetros inválidos.' }, { status: 400 });
  }

  const schools = await prisma.school.findMany({
    where: isAdmin(session) ? {} : { id: { in: session.user.schoolIds } },
    orderBy: { name: 'asc' },
  });

  const payments = await prisma.monthlyPayment.findMany({
    where: { month, year, schoolId: { in: schools.map((s) => s.id) } },
  });

  const summary = schools.map((school) => {
    const schoolPayments = payments.filter((p) => p.schoolId === school.id);
    const expectedTotal = schoolPayments.reduce((sum, p) => sum + Number(p.expectedAmount), 0);
    const paidTotal = schoolPayments.reduce((sum, p) => sum + Number(p.paidAmount), 0);
    return {
      schoolId: school.id,
      schoolName: school.name,
      paidCount: schoolPayments.filter((p) => p.status === 'PAID').length,
      partialCount: schoolPayments.filter((p) => p.status === 'PARTIAL').length,
      pendingCount: schoolPayments.filter((p) => p.status === 'PENDING').length,
      exemptCount: schoolPayments.filter((p) => p.status === 'EXEMPT').length,
      expectedTotal,
      paidTotal,
    };
  });

  return NextResponse.json({ summary });
}
