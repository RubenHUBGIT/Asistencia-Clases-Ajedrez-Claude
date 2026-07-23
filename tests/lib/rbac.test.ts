import { describe, expect, it, vi } from 'vitest';

const findUnique = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique } },
}));

const { loadAuthorizedUser } = await import('@/lib/rbac');

function buildUser(overrides: Partial<Parameters<typeof findUnique>[0]> = {}) {
  return {
    id: 'user-1',
    name: 'Ana',
    email: 'ana@example.com',
    username: 'ana',
    mustChangePassword: false,
    isActive: true,
    roles: [
      {
        role: {
          key: 'TEACHER',
          permissions: [
            { permission: { key: 'students.view' } },
            { permission: { key: 'attendance.register' } },
          ],
        },
      },
    ],
    permissionOverrides: [],
    schools: [{ schoolId: 'school-a' }],
    ...overrides,
  };
}

describe('loadAuthorizedUser', () => {
  it('returns null when the user does not exist', async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(loadAuthorizedUser('missing')).resolves.toBeNull();
  });

  it('returns null when the user is inactive', async () => {
    findUnique.mockResolvedValueOnce(buildUser({ isActive: false }));
    await expect(loadAuthorizedUser('user-1')).resolves.toBeNull();
  });

  it('combines role permissions with the assigned schools', async () => {
    findUnique.mockResolvedValueOnce(buildUser());
    const result = await loadAuthorizedUser('user-1');
    expect(result?.permissions.sort()).toEqual(['attendance.register', 'students.view']);
    expect(result?.roles).toEqual(['TEACHER']);
    expect(result?.schoolIds).toEqual(['school-a']);
  });

  it('adds a permission granted as an override even if the role lacks it', async () => {
    findUnique.mockResolvedValueOnce(
      buildUser({
        permissionOverrides: [{ granted: true, permission: { key: 'payments.view' } }],
      }),
    );
    const result = await loadAuthorizedUser('user-1');
    expect(result?.permissions).toContain('payments.view');
  });

  it('revokes a permission the role grants when overridden with granted=false', async () => {
    findUnique.mockResolvedValueOnce(
      buildUser({
        permissionOverrides: [{ granted: false, permission: { key: 'students.view' } }],
      }),
    );
    const result = await loadAuthorizedUser('user-1');
    expect(result?.permissions).not.toContain('students.view');
    expect(result?.permissions).toContain('attendance.register');
  });
});
