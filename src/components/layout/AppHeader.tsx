import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SignOutButton } from '@/components/auth/SignOutButton';

export async function AppHeader() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const canManageUsers = session.user.permissions.includes('users.manage');
  const canViewSchools = session.user.permissions.includes('schools.view');
  const canViewStudents = session.user.permissions.includes('students.view');

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <nav className="flex items-center gap-4">
        <Link href="/" className="text-sm font-semibold text-brand-700">
          Asistencia Ajedrez
        </Link>
        {canViewSchools && (
          <Link href="/colegios" className="text-sm text-slate-600 hover:text-brand-600">
            Colegios
          </Link>
        )}
        {canViewStudents && (
          <Link href="/alumnos" className="text-sm text-slate-600 hover:text-brand-600">
            Alumnos
          </Link>
        )}
        {canManageUsers && (
          <Link href="/admin/usuarios" className="text-sm text-slate-600 hover:text-brand-600">
            Usuarios
          </Link>
        )}
      </nav>
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">
          {session.user.name} · {session.user.roles.join(', ')}
        </span>
        <SignOutButton />
      </div>
    </header>
  );
}
