import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';

export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-brand-700">Cambiar contraseña</h1>
      </div>
      <ChangePasswordForm forced={session.user.mustChangePassword} />
    </main>
  );
}
