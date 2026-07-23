'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  ROLE_DEFINITIONS,
  ROLE_KEYS,
  type PermissionKey,
  type RoleKey,
} from '@/lib/permissions';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  isActive: boolean;
  mustChangePassword: boolean;
  roleKey: RoleKey | null;
  schoolIds: string[];
  permissionOverrides: { key: string; granted: boolean }[];
};

type School = { id: string; name: string };

function effectivePermissionsOf(user: AdminUser): Set<PermissionKey> {
  const defaults = new Set<string>(user.roleKey ? DEFAULT_ROLE_PERMISSIONS[user.roleKey] : []);
  for (const override of user.permissionOverrides) {
    if (override.granted) defaults.add(override.key);
    else defaults.delete(override.key);
  }
  return defaults as Set<PermissionKey>;
}

export function UsersAdminPanel({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const [usersRes, schoolsRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/schools'),
    ]);
    const usersData = (await usersRes.json()) as { users: AdminUser[] };
    const schoolsData = (await schoolsRes.json()) as { schools: School[] };
    setUsers(usersData.users);
    setSchools(schoolsData.schools);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-500">Cargando usuarios…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <div className="rounded-md bg-brand-50 px-4 py-3 text-sm text-brand-700">{notice}</div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowCreateForm((value) => !value)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {showCreateForm ? 'Cancelar' : 'Nuevo usuario'}
        </button>
        {showCreateForm && (
          <div className="mt-4 rounded-md border border-slate-200 bg-white p-4">
            <CreateUserForm
              schools={schools}
              onCreated={(message) => {
                setNotice(message);
                setShowCreateForm(false);
                loadData();
              }}
            />
          </div>
        )}
      </div>

      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="py-2 pr-4">Nombre</th>
            <th className="py-2 pr-4">Usuario / email</th>
            <th className="py-2 pr-4">Rol</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2 pr-4" />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              schools={schools}
              isSelf={user.id === currentUserId}
              isEditing={editingId === user.id}
              onToggleEdit={() => setEditingId(editingId === user.id ? null : user.id)}
              onSaved={(message) => {
                setNotice(message);
                setEditingId(null);
                loadData();
              }}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreateUserForm({
  schools,
  onCreated,
}: {
  schools: School[];
  onCreated: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [roleKey, setRoleKey] = useState<RoleKey>(ROLE_KEYS.TEACHER);
  const [schoolIds, setSchoolIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, username, roleKey, schoolIds }),
    });
    const data = (await response.json()) as { message?: string; temporaryPassword?: string };
    setSubmitting(false);

    if (!response.ok) {
      setError(data.message ?? 'No se ha podido crear el usuario.');
      return;
    }

    onCreated(
      `Usuario creado. Contraseña temporal (compártela de forma segura): ${data.temporaryPassword}`,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Nombre
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Usuario
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Rol
          <select
            value={roleKey}
            onChange={(e) => setRoleKey(e.target.value as RoleKey)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            {Object.values(ROLE_KEYS).map((key) => (
              <option key={key} value={key}>
                {ROLE_DEFINITIONS[key].name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm text-slate-700">Colegios asignados</legend>
        <div className="flex flex-wrap gap-3">
          {schools.map((school) => (
            <label key={school.id} className="flex items-center gap-1.5 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={schoolIds.includes(school.id)}
                onChange={(e) =>
                  setSchoolIds((current) =>
                    e.target.checked
                      ? [...current, school.id]
                      : current.filter((id) => id !== school.id),
                  )
                }
              />
              {school.name}
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-fit rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? 'Creando…' : 'Crear usuario'}
      </button>
    </form>
  );
}

function UserRow({
  user,
  schools,
  isSelf,
  isEditing,
  onToggleEdit,
  onSaved,
}: {
  user: AdminUser;
  schools: School[];
  isSelf: boolean;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSaved: (message: string) => void;
}) {
  return (
    <>
      <tr className="border-b border-slate-100">
        <td className="py-2 pr-4">{user.name}</td>
        <td className="py-2 pr-4 text-slate-500">
          {user.username} · {user.email}
        </td>
        <td className="py-2 pr-4">{user.roleKey ? ROLE_DEFINITIONS[user.roleKey].name : '—'}</td>
        <td className="py-2 pr-4">{user.isActive ? 'Activo' : 'Inactivo'}</td>
        <td className="py-2 pr-4">
          <button type="button" onClick={onToggleEdit} className="text-sm text-brand-600 hover:underline">
            {isEditing ? 'Cerrar' : 'Editar'}
          </button>
        </td>
      </tr>
      {isEditing && (
        <tr className="border-b border-slate-100 bg-slate-50">
          <td colSpan={5} className="p-4">
            <EditUserForm user={user} schools={schools} isSelf={isSelf} onSaved={onSaved} />
          </td>
        </tr>
      )}
    </>
  );
}

function EditUserForm({
  user,
  schools,
  isSelf,
  onSaved,
}: {
  user: AdminUser;
  schools: School[];
  isSelf: boolean;
  onSaved: (message: string) => void;
}) {
  const [roleKey, setRoleKey] = useState<RoleKey>(user.roleKey ?? ROLE_KEYS.TEACHER);
  const [isActive, setIsActive] = useState(user.isActive);
  const [schoolIds, setSchoolIds] = useState<string[]>(user.schoolIds);
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(effectivePermissionsOf(user));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const roleDefaults = new Set<string>(DEFAULT_ROLE_PERMISSIONS[roleKey]);

  async function handleSave() {
    setError(null);
    setSubmitting(true);

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(isSelf ? {} : { roleKey, isActive }),
        schoolIds,
        effectivePermissions: Array.from(permissions),
      }),
    });
    const data = (await response.json()) as { message: string };
    setSubmitting(false);

    if (!response.ok) {
      setError(data.message);
      return;
    }

    onSaved('Usuario actualizado correctamente.');
  }

  async function handleResetPassword() {
    setError(null);
    const response = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: 'POST' });
    const data = (await response.json()) as { message: string };
    if (!response.ok) {
      setError(data.message);
      return;
    }
    onSaved(data.message);
  }

  return (
    <div className="flex flex-col gap-4">
      {isSelf && (
        <p className="text-sm text-amber-700">
          No puedes cambiar tu propio rol o estado desde aquí. Pide a otro administrador que lo haga.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Rol
          <select
            disabled={isSelf}
            value={roleKey}
            onChange={(e) => setRoleKey(e.target.value as RoleKey)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-100"
          >
            {Object.values(ROLE_KEYS).map((key) => (
              <option key={key} value={key}>
                {ROLE_DEFINITIONS[key].name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-slate-700">
          <input
            type="checkbox"
            disabled={isSelf}
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Usuario activo
        </label>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm text-slate-700">Colegios asignados</legend>
        <div className="flex flex-wrap gap-3">
          {schools.map((school) => (
            <label key={school.id} className="flex items-center gap-1.5 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={schoolIds.includes(school.id)}
                onChange={(e) =>
                  setSchoolIds((current) =>
                    e.target.checked
                      ? [...current, school.id]
                      : current.filter((id) => id !== school.id),
                  )
                }
              />
              {school.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm text-slate-700">
          Permisos efectivos (marcados en gris = incluidos por el rol «{ROLE_DEFINITIONS[roleKey].name}»)
        </legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {PERMISSIONS.map((permission) => (
            <label key={permission.key} className="flex items-center gap-1.5 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={permissions.has(permission.key)}
                onChange={(e) =>
                  setPermissions((current) => {
                    const next = new Set(current);
                    if (e.target.checked) next.add(permission.key);
                    else next.delete(permission.key);
                    return next;
                  })
                }
              />
              <span className={roleDefaults.has(permission.key) ? 'text-slate-400' : ''}>
                {permission.description}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting}
          className="w-fit rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button
          type="button"
          onClick={handleResetPassword}
          className="w-fit rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Enviar enlace de restablecimiento de contraseña
        </button>
      </div>
    </div>
  );
}
