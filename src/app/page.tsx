import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SignOutButton } from '@/components/auth/SignOutButton';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold text-brand-700">Asistencia Ajedrez</h1>
      <p className="text-slate-600">Proyecto en construcción por fases.</p>
      {session?.user && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-slate-500">
            Sesión iniciada como <span className="font-medium">{session.user.name}</span> (
            {session.user.roles.join(', ')})
          </p>
          <SignOutButton />
        </div>
      )}
    </main>
  );
}
