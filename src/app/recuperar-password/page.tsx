import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-brand-700">Restablecer contraseña</h1>
        <p className="text-sm text-slate-600">
          Introduce tu usuario o email y te enviaremos un enlace para restablecer tu contraseña.
        </p>
      </div>
      <ForgotPasswordForm />
    </main>
  );
}
