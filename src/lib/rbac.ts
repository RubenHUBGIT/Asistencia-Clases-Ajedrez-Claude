import { prisma } from './prisma';

export type AuthorizedUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  mustChangePassword: boolean;
  roles: string[];
  permissions: string[];
  schoolIds: string[];
};

// Permisos efectivos = permisos de todos los roles del usuario, con las
// sobrescrituras individuales (UserPermission) aplicadas por encima: granted=true
// añade el permiso aunque el rol no lo incluya, granted=false lo revoca aunque
// el rol sí lo incluya.
export async function loadAuthorizedUser(userId: string): Promise<AuthorizedUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      permissionOverrides: { include: { permission: true } },
      schools: true,
    },
  });

  if (!user || !user.isActive) return null;

  const permissions = new Set<string>();
  for (const userRole of user.roles) {
    for (const rolePermission of userRole.role.permissions) {
      permissions.add(rolePermission.permission.key);
    }
  }
  for (const override of user.permissionOverrides) {
    if (override.granted) {
      permissions.add(override.permission.key);
    } else {
      permissions.delete(override.permission.key);
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    mustChangePassword: user.mustChangePassword,
    roles: user.roles.map((userRole) => userRole.role.key),
    permissions: Array.from(permissions),
    schoolIds: user.schools.map((userSchool) => userSchool.schoolId),
  };
}
