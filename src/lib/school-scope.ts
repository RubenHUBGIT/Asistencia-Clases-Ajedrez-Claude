import type { Session } from 'next-auth';
import { ROLE_KEYS } from './permissions';

// Los administradores ven y gestionan todos los colegios; el resto de
// usuarios (p. ej. profesores) quedan restringidos a los colegios que
// tengan asignados en UserSchool, independientemente de qué permisos
// tengan concedidos.
export function isAdmin(session: Session): boolean {
  return session.user.roles.includes(ROLE_KEYS.ADMIN);
}

export function hasSchoolAccess(session: Session, schoolId: string): boolean {
  return isAdmin(session) || session.user.schoolIds.includes(schoolId);
}
