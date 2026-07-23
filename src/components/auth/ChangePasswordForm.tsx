'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Introduce tu contraseña actual.'),
    newPassword: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .regex(/(?=.*[A-Za-z])(?=.*\d)/, 'La contraseña debe incluir al menos una letra y un número.'),
    confirmPassword: z.string().min(1, 'Confirma la nueva contraseña.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordForm({ forced = false }: { forced?: boolean }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const response = await fetch('/api/account/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    });
    const data = (await response.json()) as { message: string };

    if (!response.ok) {
      setServerError(data.message);
      return;
    }

    setSuccess(true);
    // El token JWT lleva el estado mustChangePassword incrustado: hay que
    // cerrar sesión para forzar un nuevo inicio de sesión con el token actualizado.
    setTimeout(() => signOut({ callbackUrl: '/login' }), 1500);
  };

  if (success) {
    return (
      <p className="text-sm text-slate-600">
        Contraseña actualizada. Vas a cerrar sesión para volver a entrar con tu nueva contraseña…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-sm flex-col gap-4">
      {forced && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Debes cambiar tu contraseña antes de continuar.
        </p>
      )}

      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700">
          Contraseña actual
        </label>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          {...register('currentPassword')}
        />
        {errors.currentPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700">
          Nueva contraseña
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          {...register('newPassword')}
        />
        {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
          Confirmar nueva contraseña
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}
