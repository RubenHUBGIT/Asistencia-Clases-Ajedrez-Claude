'use client';

import { useEffect, useState } from 'react';

type School = { id: string; name: string };
type Group = { id: string; name: string };

type RosterEntry = {
  studentId: string;
  firstName: string;
  lastName: string;
  status: AttendanceStatusKey;
  note: string;
};

type AttendanceStatusKey = 'PRESENT' | 'ABSENT' | 'JUSTIFIED' | 'CANCELLED' | 'MAKEUP' | 'UNRECORDED';

const STATUS_LABELS: Record<AttendanceStatusKey, string> = {
  PRESENT: 'Presente',
  ABSENT: 'Ausente',
  JUSTIFIED: 'Justificada',
  CANCELLED: 'Clase cancelada',
  MAKEUP: 'Recuperación',
  UNRECORDED: 'Sin registrar',
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceRegisterPanel() {
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState('');
  const [date, setDate] = useState(todayString());
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSchools() {
      const response = await fetch('/api/schools?status=ACTIVE');
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
      setGroupId(data.groups[0]?.id ?? '');
    }
    loadGroups();
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId || !groupId || !date) return;
    async function loadRoster() {
      setLoading(true);
      setMessage(null);
      const params = new URLSearchParams({ schoolId, groupId, date });
      const response = await fetch(`/api/attendance/session?${params.toString()}`);
      if (!response.ok) {
        const data = (await response.json()) as { message: string };
        setError(data.message);
        setRoster([]);
        setLoading(false);
        return;
      }
      const data = (await response.json()) as { roster: RosterEntry[] };
      setRoster(data.roster);
      setError(null);
      setLoading(false);
    }
    loadRoster();
  }, [schoolId, groupId, date]);

  function updateEntry(studentId: string, patch: Partial<RosterEntry>) {
    setRoster((current) => current.map((entry) => (entry.studentId === studentId ? { ...entry, ...patch } : entry)));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const response = await fetch('/api/attendance/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolId,
        groupId,
        classDate: date,
        records: roster.map((entry) => ({ studentId: entry.studentId, status: entry.status, note: entry.note })),
      }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { message: string };
      setError(data.message);
      setSaving(false);
      return;
    }
    setMessage('Asistencia guardada correctamente.');
    setSaving(false);
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
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          max={todayString()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading || roster.length === 0}
          className="ml-auto rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar asistencia'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando alumnos…</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">Alumno</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2 pr-4">Nota</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((entry) => (
              <tr key={entry.studentId} className="border-b border-slate-100">
                <td className="py-2 pr-4">
                  {entry.lastName}, {entry.firstName}
                </td>
                <td className="py-2 pr-4">
                  <select
                    value={entry.status}
                    onChange={(e) => updateEntry(entry.studentId, { status: e.target.value as AttendanceStatusKey })}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  >
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-4">
                  <input
                    value={entry.note}
                    onChange={(e) => updateEntry(entry.studentId, { note: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                </td>
              </tr>
            ))}
            {roster.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-400">
                  No hay alumnos en este grupo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
