import { getServerSession } from 'next-auth';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { authOptions } from '@/lib/auth';
import { LoginForm } from '@/components/auth/LoginForm';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect('/');
  }

  return (
    <main className="chess-pattern-bg flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/logo-caa.png" alt="Club Aranjuez de Ajedrez" width={96} height={96} priority className="h-24 w-24" />
        <div>
          <h1 className="text-2xl font-semibold text-brand-700">Club Aranjuez de Ajedrez</h1>
          <p className="text-sm text-slate-600">Inicia sesión para continuar.</p>
        </div>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
