'use client';

import { useEffect, useState } from 'react';

type School = { id: string; name: string };
type Group = { id: string; name: string };

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  weekday: number | null;
  schedule: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  group: Group;
  school: School;
};

type Permissions = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

const WEEKDAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
];

const EMPTY_FORM = {
  groupId: '',
  firstName: '',
  lastName: '',
  weekday: '',
  schedule: '',
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  notes: '',
};

export function StudentsPanel({ canCreate, canEdit, canDelete }: Permissions) {
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSchools() {
      const response = await fetch('/api/schools?status=ALL');
      const data = (await response.json()) as { schools: School[] };
      setSchools(data.schools);
      if (data.schools.length > 0 && data.schools[0]) {
        setSchoolId((current) => current || data.schools[0]!.id);
      }
    }
    loadSchools();
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    async function loadGroups() {
      const response = await fetch(`/api/schools/${schoolId}/groups`);
      const data = (await response.json()) as { groups: Group[] };
      setGroups(data.groups);
      setGroupId('');
    }
    loadGroups();
  }, [schoolId]);

  async function loadStudents() {
    if (!schoolId) return;
    setLoading(true);
    const params = new URLSearchParams({ schoolId, status: statusFilter });
    if (groupId) params.set('groupId', groupId);
    if (query) params.set('q', query);
    const response = await fetch(`/api/students?${params.toString()}`);
    const data = (await response.json()) as { students: Student[] };
    setStudents(data.students);
    setLoading(false);
  }

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, groupId, statusFilter]);

  async function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    loadStudents();
  }

  async function handleToggleStatus(student: Student) {
    setError(null);
    const nextStatus = student.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
    const response = await fetch(`/api/students/${student.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { message: string };
      setError(data.message);
      return;
    }
    loadStudents();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>

        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todos los grupos</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o apellidos…"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Buscar
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="ACTIVE">Activos</option>
          <option value="INACTIVE">Inactivos</option>
          <option value="ARCHIVED">Archivados</option>
          <option value="ALL">Todos</option>
        </select>

        {canCreate && (
          <button
            type="button"
            onClick={() => setShowCreateForm((value) => !value)}
            disabled={!schoolId}
            className="ml-auto rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {showCreateForm ? 'Cancelar' : 'Nuevo alumno'}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showCreateForm && canCreate && schoolId && (
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <StudentForm
            groups={groups}
            onSubmit={async (values) => {
              const response = await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...values,
                  schoolId,
                  groupId: values.groupId || undefined,
                  weekday: values.weekday ? Number(values.weekday) : undefined,
                }),
              });
              if (!response.ok) {
                const data = (await response.json()) as { message: string };
                setError(data.message);
                return;
              }
              setShowCreateForm(false);
              loadStudents();
            }}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando alumnos…</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">Nombre</th>
              <th className="py-2 pr-4">Grupo</th>
              <th className="py-2 pr-4">Día</th>
              <th className="py-2 pr-4">Familia</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <StudentRow
                key={student.id}
                student={student}
                groups={groups}
                canEdit={canEdit}
                canDelete={canDelete}
                isEditing={editingId === student.id}
                onToggleEdit={() => setEditingId(editingId === student.id ? null : student.id)}
                onToggleStatus={() => handleToggleStatus(student)}
                onSaved={() => {
                  setEditingId(null);
                  loadStudents();
                }}
              />
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-400">
                  No hay alumnos que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StudentRow({
  student,
  groups,
  canEdit,
  canDelete,
  isEditing,
  onToggleEdit,
  onToggleStatus,
  onSaved,
}: {
  student: Student;
  groups: Group[];
  canEdit: boolean;
  canDelete: boolean;
  isEditing: boolean;
  onToggleEdit: () => void;
  onToggleStatus: () => void;
  onSaved: () => void;
}) {
  const statusLabel =
    student.status === 'ACTIVE' ? 'Activo' : student.status === 'INACTIVE' ? 'Inactivo' : 'Archivado';

  return (
    <>
      <tr className="border-b border-slate-100">
        <td className="py-2 pr-4">
          {student.lastName}, {student.firstName}
        </td>
        <td className="py-2 pr-4 text-slate-500">{student.group.name}</td>
        <td className="py-2 pr-4 text-slate-500">
          {WEEKDAYS.find((w) => w.value === student.weekday)?.label ?? '—'}
        </td>
        <td className="py-2 pr-4 text-slate-500">
          {student.guardianName ?? '—'}
          {student.guardianPhone ? ` · ${student.guardianPhone}` : ''}
        </td>
        <td className="py-2 pr-4">{statusLabel}</td>
        <td className="flex gap-3 py-2 pr-4">
          {canEdit && (
            <button type="button" onClick={onToggleEdit} className="text-sm text-brand-600 hover:underline">
              {isEditing ? 'Cerrar' : 'Editar'}
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={onToggleStatus} className="text-sm text-slate-600 hover:underline">
              {student.status === 'ARCHIVED' ? 'Restaurar' : 'Archivar'}
            </button>
          )}
        </td>
      </tr>
      {isEditing && canEdit && (
        <tr className="border-b border-slate-100 bg-slate-50">
          <td colSpan={6} className="p-4">
            <StudentForm
              groups={groups}
              initial={student}
              onSubmit={async (values) => {
                const response = await fetch(`/api/students/${student.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...values,
                    groupId: values.groupId || undefined,
                    weekday: values.weekday ? Number(values.weekday) : undefined,
                  }),
                });
                if (response.ok) onSaved();
              }}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function StudentForm({
  groups,
  initial,
  onSubmit,
}: {
  groups: Group[];
  initial?: Student;
  onSubmit: (values: typeof EMPTY_FORM) => Promise<void>;
}) {
  const [values, setValues] = useState(
    initial
      ? {
          groupId: initial.group.id,
          firstName: initial.firstName,
          lastName: initial.lastName,
          weekday: initial.weekday ? String(initial.weekday) : '',
          schedule: initial.schedule ?? '',
          guardianName: initial.guardianName ?? '',
          guardianPhone: initial.guardianPhone ?? '',
          guardianEmail: initial.guardianEmail ?? '',
          notes: initial.notes ?? '',
        }
      : EMPTY_FORM,
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    await onSubmit(values);
    setSubmitting(false);
  }

  function textField(key: keyof typeof EMPTY_FORM, label: string, required = false) {
    return (
      <label className="flex flex-col gap-1 text-sm text-slate-700">
        {label}
        <input
          required={required}
          value={values[key]}
          onChange={(e) => setValues((current) => ({ ...current, [key]: e.target.value }))}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </label>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {textField('firstName', 'Nombre', true)}
        {textField('lastName', 'Apellidos', true)}

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Grupo
          <select
            value={values.groupId}
            onChange={(e) => setValues((current) => ({ ...current, groupId: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">General (por defecto)</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Día de clase
          <select
            value={values.weekday}
            onChange={(e) => setValues((current) => ({ ...current, weekday: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">Sin especificar</option>
            {WEEKDAYS.map((weekday) => (
              <option key={weekday.value} value={weekday.value}>
                {weekday.label}
              </option>
            ))}
          </select>
        </label>

        {textField('schedule', 'Horario')}
        {textField('guardianName', 'Nombre de la familia')}
        {textField('guardianPhone', 'Teléfono de la familia')}
        {textField('guardianEmail', 'Email de la familia')}
      </div>
      <label className="flex flex-col gap-1 text-sm text-slate-700">
        Notas
        <textarea
          value={values.notes}
          onChange={(e) => setValues((current) => ({ ...current, notes: e.target.value }))}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          rows={2}
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="w-fit rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear alumno'}
      </button>
    </form>
  );
}
