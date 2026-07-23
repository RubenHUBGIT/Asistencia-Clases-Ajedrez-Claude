import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      mustChangePassword: boolean;
      roles: string[];
      permissions: string[];
      schoolIds: string[];
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username?: string;
    mustChangePassword?: boolean;
    roles?: string[];
    permissions?: string[];
    schoolIds?: string[];
    invalid?: boolean;
  }
}
