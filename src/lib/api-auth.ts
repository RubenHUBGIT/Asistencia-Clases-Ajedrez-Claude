import { getServerSession, type Session } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';
import type { PermissionKey } from './permissions';

type SessionResult =
  | { session: Session; response: null }
  | { session: null; response: NextResponse };

export async function requireSession(): Promise<SessionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { session: null, response: NextResponse.json({ message: 'No autenticado.' }, { status: 401 }) };
  }
  return { session, response: null };
}

export async function requirePermission(permission: PermissionKey): Promise<SessionResult> {
  const result = await requireSession();
  if (!result.session) return result;

  if (!result.session.user.permissions.includes(permission)) {
    return { session: null, response: NextResponse.json({ message: 'No autorizado.' }, { status: 403 }) };
  }
  return result;
}
