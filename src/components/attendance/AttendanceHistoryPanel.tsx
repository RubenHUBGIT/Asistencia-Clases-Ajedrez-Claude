'use client';

import { useEffect, useState } from 'react';

type School = { id: string; name: string };
type Group = { id: string; name: string };

type AttendanceRecord = {
  id: string;
  classDate: string;
  status: string;
  note: string | null;
  student: { id: string; firstName: string; lastName: string };
  classGroup: { id: string; name: string };
  school: { id: string; name: string };
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Presente',
  ABSENT: 'Ausente',
  JUSTIFIED: 'Justificada',
  CANCELLED: 'Clase cancelada',
  MAKEUP: 'Recuperación',
  UNRECORDED: 'Sin registrar',
};

export function AttendanceHistoryPanel() {
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchools() {
      const response = await fetch('/api/schools?status=ALL');
      const data = (await response.json()) as { schools: School[] };
      setSchools(data.schools);
    }
    loadSchools();
  }, []);

  useEffect(() => {
    if (!schoolId) {
      setGroups([]);
      setGroupId('');
      return;
    }
    async function loadGroups() {
      const response = await fetch(`/api/schools/${schoolId}/groups`);
      const data = (await response.json()) as { groups: Group[] };
      setGroups(data.groups);
      setGroupId('');
    }
    loadGroups();
  }, [schoolId]);

  async function loadHistory() {
    setLoading(true);
    const params = new URLSearchParams();
    if (schoolId) params.set('schoolId', schoolId);
    if (groupId) params.set('groupId', groupId);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (status) params.set('status', status);
    const response = await fetch(`/api/attendance/history?${params.toString()}`);
    const data = (await response.json()) as { attendances: AttendanceRecord[] };
    setRecords(data.attendances);
    setLoading(false);
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, groupId]);

  async function handleFilterSubmit(event: React.FormEvent) {
    event.preventDefault();
    loadHistory();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-3">
        <select
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todos los colegios</option>
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>

        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          disabled={!schoolId}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-60"
        >
          <option value="">Todos los grupos</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <span className="text-sm text-slate-500">a</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Filtrar
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando histórico…</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">Fecha</th>
              <th className="py-2 pr-4">Colegio</th>
              <th className="py-2 pr-4">Grupo</th>
              <th className="py-2 pr-4">Alumno</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2 pr-4">Nota</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-b border-slate-100">
                <td className="py-2 pr-4">{record.classDate.slice(0, 10)}</td>
                <td className="py-2 pr-4 text-slate-500">{record.school.name}</td>
                <td className="py-2 pr-4 text-slate-500">{record.classGroup.name}</td>
                <td className="py-2 pr-4">
                  {record.student.lastName}, {record.student.firstName}
                </td>
                <td className="py-2 pr-4">{STATUS_LABELS[record.status] ?? record.status}</td>
                <td className="py-2 pr-4 text-slate-500">{record.note ?? '—'}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-400">
                  No hay registros que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
