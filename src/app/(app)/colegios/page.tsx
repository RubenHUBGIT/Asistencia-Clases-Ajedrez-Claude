import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SchoolsPanel } from '@/components/schools/SchoolsPanel';

export default async function SchoolsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user.permissions.includes('schools.view')) {
    return (
      <main className="p-8">
        <p className="text-sm text-red-600">No tienes permiso para ver esta página.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold text-brand-700">Colegios</h1>
      <SchoolsPanel
        canCreate={session.user.permissions.includes('schools.create')}
        canEdit={session.user.permissions.includes('schools.edit')}
        canDelete={session.user.permissions.includes('schools.delete')}
      />
    </main>
  );
}
