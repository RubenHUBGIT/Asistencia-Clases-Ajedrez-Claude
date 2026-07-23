import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { StudentsPanel } from '@/components/students/StudentsPanel';

export default async function StudentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user.permissions.includes('students.view')) {
    return (
      <main className="p-8">
        <p className="text-sm text-red-600">No tienes permiso para ver esta página.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold text-brand-700">Alumnos</h1>
      <StudentsPanel
        canCreate={session.user.permissions.includes('students.create')}
        canEdit={session.user.permissions.includes('students.edit')}
        canDelete={session.user.permissions.includes('students.delete')}
      />
    </main>
  );
}
