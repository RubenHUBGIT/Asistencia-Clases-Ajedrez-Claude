'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
  identifier: z.string().min(1, 'Introduce tu usuario o email.'),
  password: z.string().min(1, 'Introduce tu contraseña.'),
});

type FormValues = z.infer<typeof schema>;

const ERROR_MESSAGES: Record<string, string> = {
  LOCKED: 'Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos.',
  INVALID_CREDENTIALS: 'Usuario o contraseña incorrectos.',
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const result = await signIn('credentials', {
      identifier: values.identifier,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      setServerError(ERROR_MESSAGES[result.error] ?? 'No se ha podido iniciar sesión.');
      return;
    }

    router.push(searchParams.get('callbackUrl') ?? '/');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-sm flex-col gap-4">
      <div>
        <label htmlFor="identifier" className="block text-sm font-medium text-slate-700">
          Usuario o email
        </label>
        <input
          id="identifier"
          type="text"
          autoComplete="username"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          {...register('identifier')}
        />
        {errors.identifier && <p className="mt-1 text-sm text-red-600">{errors.identifier.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          {...register('password')}
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {isSubmitting ? 'Entrando…' : 'Iniciar sesión'}
      </button>

      <a href="/recuperar-password" className="text-center text-sm text-brand-600 hover:underline">
        ¿Has olvidado tu contraseña?
      </a>
    </form>
  );
}
