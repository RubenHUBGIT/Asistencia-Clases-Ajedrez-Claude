import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/recuperar-password', '/restablecer-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health');

  if (isPublic) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.invalid || !token.sub) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // El usuario debe cambiar su contraseña (alta inicial o restablecimiento
  // forzado) antes de poder acceder a cualquier otra parte de la aplicación.
  // La propia API que efectúa el cambio debe quedar excluida: si no, esta
  // redirección la intercepta y el formulario recibe HTML en vez de JSON.
  if (
    token.mustChangePassword &&
    pathname !== '/cambiar-password' &&
    pathname !== '/api/account/change-password'
  ) {
    return NextResponse.redirect(new URL('/cambiar-password', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
