import { describe, expect, it } from 'vitest';
import { ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLE_KEYS } from '@/lib/permissions';

describe('permissions', () => {
  it('has no duplicate permission keys', () => {
    const keys = PERMISSIONS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('grants the admin role every permission key', () => {
    expect(new Set(DEFAULT_ROLE_PERMISSIONS[ROLE_KEYS.ADMIN])).toEqual(new Set(ALL_PERMISSION_KEYS));
  });

  it('does not grant the teacher role sensitive permissions', () => {
    const teacherPermissions = DEFAULT_ROLE_PERMISSIONS[ROLE_KEYS.TEACHER];
    expect(teacherPermissions).not.toContain('payments.view');
    expect(teacherPermissions).not.toContain('payments.register');
    expect(teacherPermissions).not.toContain('users.manage');
    expect(teacherPermissions).not.toContain('audit.view');
    expect(teacherPermissions).not.toContain('students.delete');
    expect(teacherPermissions).not.toContain('schools.delete');
    expect(teacherPermissions).not.toContain('attendance.edit_past');
  });

  it('grants the teacher role basic school/student/attendance access', () => {
    const teacherPermissions = DEFAULT_ROLE_PERMISSIONS[ROLE_KEYS.TEACHER];
    expect(teacherPermissions).toContain('schools.view');
    expect(teacherPermissions).toContain('students.view');
    expect(teacherPermissions).toContain('attendance.register');
    expect(teacherPermissions).toContain('attendance.view_history');
  });
});
