export const PERMISSIONS = [
  { key: 'schools.view', description: 'Ver colegios' },
  { key: 'schools.create', description: 'Crear colegios' },
  { key: 'schools.edit', description: 'Editar colegios' },
  { key: 'schools.delete', description: 'Archivar o eliminar colegios' },

  { key: 'students.view', description: 'Ver alumnos' },
  { key: 'students.create', description: 'Crear alumnos' },
  { key: 'students.edit', description: 'Editar alumnos' },
  { key: 'students.delete', description: 'Archivar o eliminar alumnos' },

  { key: 'attendance.register', description: 'Registrar asistencia' },
  { key: 'attendance.edit_past', description: 'Editar asistencias anteriores' },
  { key: 'attendance.view_history', description: 'Consultar historicos de asistencia' },

  { key: 'payments.view', description: 'Ver pagos' },
  { key: 'payments.register', description: 'Registrar pagos' },

  { key: 'users.manage', description: 'Administrar usuarios, roles y permisos' },
  { key: 'audit.view', description: 'Consultar el registro de auditoria' },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]['key'];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSIONS.map((p) => p.key);

export const ROLE_KEYS = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

// Permisos por defecto de cada rol. El administrador siempre tiene todos los
// permisos. Los permisos del profesor son deliberadamente limitados (sin pagos,
// sin gestion de usuarios, sin borrado, sin edicion de asistencias pasadas);
// el administrador puede conceder permisos adicionales a un usuario concreto
// mediante UserPermission, sin modificar el rol.
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  ADMIN: ALL_PERMISSION_KEYS,
  TEACHER: [
    'schools.view',
    'students.view',
    'students.create',
    'students.edit',
    'attendance.register',
    'attendance.view_history',
  ],
};

export const ROLE_DEFINITIONS: Record<RoleKey, { name: string; description: string }> = {
  ADMIN: {
    name: 'Administrador',
    description: 'Acceso completo a usuarios, colegios, alumnos, asistencia, pagos y auditoria.',
  },
  TEACHER: {
    name: 'Profesor',
    description: 'Acceso a los colegios asignados: alumnos y asistencia. Sin acceso a pagos por defecto.',
  },
};
