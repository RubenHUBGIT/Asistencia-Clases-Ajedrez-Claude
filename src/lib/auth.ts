import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import { verifyPassword } from './password';
import { getClientIp, isLoginLocked, recordLoginAttempt } from './login-rate-limit';
import { loadAuthorizedUser } from './rbac';

// El proveedor de credenciales de NextAuth v4 solo admite estrategia de sesión
// "jwt" (no puede persistir sesiones en BD mediante el adapter). Se mantiene el
// PrismaAdapter para la gestión de usuarios y para permitir añadir proveedores
// OAuth en el futuro sin cambiar el modelo de datos.
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Credenciales',
      credentials: {
        identifier: { label: 'Usuario o email', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials, req) {
        const identifier = credentials?.identifier?.trim();
        const password = credentials?.password;
        if (!identifier || !password) return null;

        const ipAddress = getClientIp(req?.headers ? new Headers(req.headers as HeadersInit) : undefined);

        if (await isLoginLocked(identifier, ipAddress)) {
          throw new Error('LOCKED');
        }

        const user = await prisma.user.findFirst({
          where: { OR: [{ email: identifier.toLowerCase() }, { username: identifier }] },
        });

        const passwordValid = user ? await verifyPassword(password, user.passwordHash) : false;
        const success = Boolean(user?.isActive && passwordValid);

        await recordLoginAttempt(identifier, ipAddress, success);

        if (!success || !user) {
          throw new Error('INVALID_CREDENTIALS');
        }

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const userId = user?.id ?? token.sub;
      if (!userId) return token;

      const authorizedUser = await loadAuthorizedUser(userId);
      if (!authorizedUser) {
        return { ...token, invalid: true };
      }

      token.sub = authorizedUser.id;
      token.name = authorizedUser.name;
      token.email = authorizedUser.email;
      token.username = authorizedUser.username;
      token.mustChangePassword = authorizedUser.mustChangePassword;
      token.roles = authorizedUser.roles;
      token.permissions = authorizedUser.permissions;
      token.schoolIds = authorizedUser.schoolIds;
      token.invalid = false;
      return token;
    },
    async session({ session, token }) {
      if (token.invalid || !token.sub) {
        return { ...session, user: undefined, expires: new Date(0).toISOString() };
      }

      session.user = {
        id: token.sub,
        name: token.name ?? '',
        email: token.email ?? '',
        username: token.username ?? '',
        mustChangePassword: token.mustChangePassword ?? false,
        roles: token.roles ?? [],
        permissions: token.permissions ?? [],
        schoolIds: token.schoolIds ?? [],
      };
      return session;
    },
  },
};
