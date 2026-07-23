import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/components/auth/LoginForm';

const signIn = vi.fn();
const push = vi.fn();
const refresh = vi.fn();

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => signIn(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('LoginForm', () => {
  it('shows validation errors and does not call signIn when fields are empty', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByText('Introduce tu usuario o email.')).toBeInTheDocument();
    expect(screen.getByText('Introduce tu contraseña.')).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('submits credentials and redirects on success', async () => {
    signIn.mockResolvedValueOnce({ error: undefined });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Usuario o email'), 'ana');
    await user.type(screen.getByLabelText('Contraseña'), 'Secreto123');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('credentials', {
      identifier: 'ana',
      password: 'Secreto123',
      redirect: false,
    }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'));
  });

  it('shows a translated error message when credentials are invalid', async () => {
    signIn.mockResolvedValueOnce({ error: 'INVALID_CREDENTIALS' });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Usuario o email'), 'ana');
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByText('Usuario o contraseña incorrectos.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
