import type { Session } from 'next-auth';
import { describe, expect, it } from 'vitest';
import { hasSchoolAccess, isAdmin } from '@/lib/school-scope';

function buildSession(overrides: Partial<Session['user']>): Session {
  return {
    user: {
      id: 'user-1',
      username: 'user1',
      mustChangePassword: false,
      roles: [],
      permissions: [],
      schoolIds: [],
      ...overrides,
    },
    expires: '2999-01-01T00:00:00.000Z',
  };
}

describe('isAdmin', () => {
  it('returns true when the user has the ADMIN role', () => {
    expect(isAdmin(buildSession({ roles: ['ADMIN'] }))).toBe(true);
  });

  it('returns false when the user does not have the ADMIN role', () => {
    expect(isAdmin(buildSession({ roles: ['TEACHER'] }))).toBe(false);
  });
});

describe('hasSchoolAccess', () => {
  it('grants admins access to any school', () => {
    const session = buildSession({ roles: ['ADMIN'], schoolIds: [] });
    expect(hasSchoolAccess(session, 'school-x')).toBe(true);
  });

  it('grants non-admins access only to their assigned schools', () => {
    const session = buildSession({ roles: ['TEACHER'], schoolIds: ['school-a'] });
    expect(hasSchoolAccess(session, 'school-a')).toBe(true);
    expect(hasSchoolAccess(session, 'school-b')).toBe(false);
  });
});
