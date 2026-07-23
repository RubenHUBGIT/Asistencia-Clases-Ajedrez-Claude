import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { todayDateOnlyString } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/school-scope';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const admin = isAdmin(session);
  const schoolIds = session.user.schoolIds;
  const permissions = session.user.permissions;

  const canViewSchools = permissions.includes('schools.view');
  const canViewStudents = permissions.includes('students.view');
  const canViewAttendance = permissions.includes('attendance.register') || permissions.includes('attendance.view_history');
  const canViewPayments = permissions.includes('payments.view');

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const today = new Date(`${todayDateOnlyString()}T00:00:00.000Z`);

  const [schoolsCount, studentsCount, todayAttendance, monthPayments] = await Promise.all([
    canViewSchools
      ? prisma.school.count({ where: { status: 'ACTIVE', ...(admin ? {} : { id: { in: schoolIds } }) } })
      : null,
    canViewStudents
      ? prisma.student.count({ where: { status: 'ACTIVE', ...(admin ? {} : { schoolId: { in: schoolIds } }) } })
      : null,
    canViewAttendance
      ? prisma.attendance.groupBy({
          by: ['status'],
          where: { classDate: today, ...(admin ? {} : { schoolId: { in: schoolIds } }) },
          _count: true,
        })
      : null,
    canViewPayments
      ? prisma.monthlyPayment.groupBy({
          by: ['status'],
          where: { month, year, ...(admin ? {} : { schoolId: { in: schoolIds } }) },
          _count: true,
        })
      : null,
  ]);

  const attendanceCount = (status: string) => todayAttendance?.find((a) => a.status === status)?._count ?? 0;
  const paymentsCount = (status: string) => monthPayments?.find((p) => p.status === status)?._count ?? 0;

  return (
    <main className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-700">Asistencia Ajedrez</h1>
        <p className="text-slate-600">
          Bienvenido/a, {session.user.name}. Este es el resumen general de la actividad.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {canViewSchools && (
          <DashboardCard title="Colegios activos" value={String(schoolsCount)} href="/colegios" />
        )}
        {canViewStudents && (
          <DashboardCard title="Alumnos activos" value={String(studentsCount)} href="/alumnos" />
        )}
        {canViewAttendance && (
          <DashboardCard
            title="Asistencia de hoy"
            value={`${attendanceCount('PRESENT')} presentes · ${attendanceCount('ABSENT')} ausentes`}
            href="/asistencia"
          />
        )}
        {canViewPayments && (
          <DashboardCard
            title={`Pagos de ${month}/${year}`}
            value={`${paymentsCount('PAID')} pagados · ${paymentsCount('PENDING')} pendientes`}
            href="/pagos"
          />
        )}
      </div>
    </main>
  );
}

function DashboardCard({ title, value, href }: { title: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-300 hover:shadow-sm"
    >
      <span className="text-sm text-slate-500">{title}</span>
      <span className="text-lg font-semibold text-brand-700">{value}</span>
    </Link>
  );
}
