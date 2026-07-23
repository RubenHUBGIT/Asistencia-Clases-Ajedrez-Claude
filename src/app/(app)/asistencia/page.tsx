import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AttendancePanel } from '@/components/attendance/AttendancePanel';

export default async function AttendancePage() {
  const session = await getServerSession(authOptions);

  const canRegister = session?.user.permissions.includes('attendance.register') ?? false;
  const canViewHistory = session?.user.permissions.includes('attendance.view_history') ?? false;

  if (!canRegister && !canViewHistory) {
    return (
      <main className="p-8">
        <p className="text-sm text-red-600">No tienes permiso para ver esta página.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold text-brand-700">Asistencia</h1>
      <AttendancePanel canRegister={canRegister} canViewHistory={canViewHistory} />
    </main>
  );
}
