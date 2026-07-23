import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AuditLogPanel } from '@/components/audit/AuditLogPanel';

export default async function AuditPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user.permissions.includes('audit.view')) {
    return (
      <main className="p-8">
        <p className="text-sm text-red-600">No tienes permiso para ver esta página.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold text-brand-700">Auditoría</h1>
      <AuditLogPanel />
    </main>
  );
}
