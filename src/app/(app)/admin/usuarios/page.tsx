import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UsersAdminPanel } from '@/components/admin/UsersAdminPanel';

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user.permissions.includes('users.manage')) {
    return (
      <main className="p-8">
        <p className="text-sm text-red-600">No tienes permiso para ver esta página.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold text-brand-700">Usuarios</h1>
      <UsersAdminPanel currentUserId={session.user.id} />
    </main>
  );
}
