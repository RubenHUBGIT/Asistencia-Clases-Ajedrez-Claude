'use client';

import { useEffect, useState } from 'react';

type School = {
  id: string;
  name: string;
  address: string | null;
  locality: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
};

type Permissions = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

const EMPTY_FORM = {
  name: '',
  address: '',
  locality: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  notes: '',
};

export function SchoolsPanel({ canCreate, canEdit, canDelete }: Permissions) {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSchools() {
    setLoading(true);
    const params = new URLSearchParams({ status: statusFilter });
    if (query) params.set('q', query);
    const response = await fetch(`/api/schools?${params.toString()}`);
    const data = (await response.json()) as { schools: School[] };
    setSchools(data.schools);
    setLoading(false);
  }

  useEffect(() => {
    loadSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    loadSchools();
  }

  async function handleToggleStatus(school: School) {
    setError(null);
    const nextStatus = school.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    const response = await fetch(`/api/schools/${school.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { message: string };
      setError(data.message);
      return;
    }
    loadSchools();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o localidad…"
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
          <option value="ARCHIVED">Archivados</option>
          <option value="ALL">Todos</option>
        </select>

        {canCreate && (
          <button
            type="button"
            onClick={() => setShowCreateForm((value) => !value)}
            className="ml-auto rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            {showCreateForm ? 'Cancelar' : 'Nuevo colegio'}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showCreateForm && canCreate && (
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <SchoolForm
            onSubmit={async (values) => {
              const response = await fetch('/api/schools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
              });
              if (!response.ok) {
                const data = (await response.json()) as { message: string };
                setError(data.message);
                return;
              }
              setShowCreateForm(false);
              loadSchools();
            }}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando colegios…</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">Nombre</th>
              <th className="py-2 pr-4">Localidad</th>
              <th className="py-2 pr-4">Contacto</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <SchoolRow
                key={school.id}
                school={school}
                canEdit={canEdit}
                canDelete={canDelete}
                isEditing={editingId === school.id}
                onToggleEdit={() => setEditingId(editingId === school.id ? null : school.id)}
                onToggleStatus={() => handleToggleStatus(school)}
                onSaved={() => {
                  setEditingId(null);
                  loadSchools();
                }}
              />
            ))}
            {schools.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-400">
                  No hay colegios que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SchoolRow({
  school,
  canEdit,
  canDelete,
  isEditing,
  onToggleEdit,
  onToggleStatus,
  onSaved,
}: {
  school: School;
  canEdit: boolean;
  canDelete: boolean;
  isEditing: boolean;
  onToggleEdit: () => void;
  onToggleStatus: () => void;
  onSaved: () => void;
}) {
  return (
    <>
      <tr className="border-b border-slate-100">
        <td className="py-2 pr-4">{school.name}</td>
        <td className="py-2 pr-4 text-slate-500">{school.locality ?? '—'}</td>
        <td className="py-2 pr-4 text-slate-500">
          {school.contactName ?? '—'}
          {school.contactPhone ? ` · ${school.contactPhone}` : ''}
        </td>
        <td className="py-2 pr-4">{school.status === 'ACTIVE' ? 'Activo' : 'Archivado'}</td>
        <td className="flex gap-3 py-2 pr-4">
          {canEdit && (
            <button type="button" onClick={onToggleEdit} className="text-sm text-brand-600 hover:underline">
              {isEditing ? 'Cerrar' : 'Editar'}
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={onToggleStatus} className="text-sm text-slate-600 hover:underline">
              {school.status === 'ACTIVE' ? 'Archivar' : 'Restaurar'}
            </button>
          )}
        </td>
      </tr>
      {isEditing && canEdit && (
        <tr className="border-b border-slate-100 bg-slate-50">
          <td colSpan={5} className="p-4">
            <SchoolForm
              initial={school}
              onSubmit={async (values) => {
                const response = await fetch(`/api/schools/${school.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(values),
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

function SchoolForm({
  initial,
  onSubmit,
}: {
  initial?: School;
  onSubmit: (values: typeof EMPTY_FORM) => Promise<void>;
}) {
  const [values, setValues] = useState(
    initial
      ? {
          name: initial.name,
          address: initial.address ?? '',
          locality: initial.locality ?? '',
          contactName: initial.contactName ?? '',
          contactPhone: initial.contactPhone ?? '',
          contactEmail: initial.contactEmail ?? '',
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

  function field(key: keyof typeof EMPTY_FORM, label: string, required = false) {
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
        {field('name', 'Nombre', true)}
        {field('locality', 'Localidad')}
        {field('address', 'Dirección')}
        {field('contactName', 'Persona de contacto')}
        {field('contactPhone', 'Teléfono de contacto')}
        {field('contactEmail', 'Email de contacto')}
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
        {submitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear colegio'}
      </button>
    </form>
  );
}
