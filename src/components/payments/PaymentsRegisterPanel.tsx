'use client';

import { useEffect, useState } from 'react';

type School = { id: string; name: string };
type Group = { id: string; name: string };

type PaymentStatusKey = 'PENDING' | 'PAID' | 'PARTIAL' | 'EXEMPT' | 'NOT_APPLICABLE';
type PaymentMethodKey = 'CASH' | 'TRANSFER' | 'BIZUM' | 'CARD' | 'OTHER' | '';

type RosterEntry = {
  studentId: string;
  firstName: string;
  lastName: string;
  group: Group;
  status: PaymentStatusKey;
  expectedAmount: number;
  paidAmount: number;
  paymentDate: string;
  method: PaymentMethodKey;
  notes: string;
};

const STATUS_LABELS: Record<PaymentStatusKey, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  PARTIAL: 'Parcial',
  EXEMPT: 'Exento',
  NOT_APPLICABLE: 'No aplica',
};

const METHOD_LABELS: Record<Exclude<PaymentMethodKey, ''>, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  BIZUM: 'Bizum',
  CARD: 'Tarjeta',
  OTHER: 'Otro',
};

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function PaymentsRegisterPanel() {
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState('');
  const [{ month, year }, setPeriod] = useState(currentMonthYear());
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
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
      setGroupId('');
    }
    loadGroups();
  }, [schoolId]);

  async function loadRoster() {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ schoolId, month: String(month), year: String(year) });
    if (groupId) params.set('groupId', groupId);
    const response = await fetch(`/api/payments?${params.toString()}`);
    if (!response.ok) {
      const data = (await response.json()) as { message: string };
      setError(data.message);
      setRoster([]);
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { roster: RosterEntry[] };
    setRoster(data.roster);
    setLoading(false);
  }

  useEffect(() => {
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, groupId, month, year]);

  function updateEntry(studentId: string, patch: Partial<RosterEntry>) {
    setRoster((current) => current.map((entry) => (entry.studentId === studentId ? { ...entry, ...patch } : entry)));
  }

  async function handleSave(entry: RosterEntry) {
    setSavingId(entry.studentId);
    setError(null);
    const response = await fetch('/api/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: entry.studentId,
        schoolId,
        month,
        year,
        status: entry.status,
        expectedAmount: entry.expectedAmount,
        paidAmount: entry.paidAmount,
        paymentDate: entry.paymentDate || undefined,
        method: entry.method || undefined,
        notes: entry.notes,
      }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { message: string };
      setError(data.message);
      setSavingId(null);
      return;
    }
    setSavingId(null);
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

        <select
          value={month}
          onChange={(e) => setPeriod((current) => ({ ...current, month: Number(e.target.value) }))}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={year}
          onChange={(e) => setPeriod((current) => ({ ...current, year: Number(e.target.value) }))}
          className="w-24 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando alumnos…</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">Alumno</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2 pr-4">Importe esperado</th>
              <th className="py-2 pr-4">Importe pagado</th>
              <th className="py-2 pr-4">Fecha de pago</th>
              <th className="py-2 pr-4">Método</th>
              <th className="py-2 pr-4" />
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
                    onChange={(e) => updateEntry(entry.studentId, { status: e.target.value as PaymentStatusKey })}
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
                    type="number"
                    min={0}
                    step="0.01"
                    value={entry.expectedAmount}
                    onChange={(e) => updateEntry(entry.studentId, { expectedAmount: Number(e.target.value) })}
                    className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="py-2 pr-4">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={entry.paidAmount}
                    onChange={(e) => updateEntry(entry.studentId, { paidAmount: Number(e.target.value) })}
                    className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="py-2 pr-4">
                  <input
                    type="date"
                    value={entry.paymentDate}
                    onChange={(e) => updateEntry(entry.studentId, { paymentDate: e.target.value })}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="py-2 pr-4">
                  <select
                    value={entry.method}
                    onChange={(e) => updateEntry(entry.studentId, { method: e.target.value as PaymentMethodKey })}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="">—</option>
                    {Object.entries(METHOD_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-4">
                  <button
                    type="button"
                    onClick={() => handleSave(entry)}
                    disabled={savingId === entry.studentId}
                    className="rounded-md bg-brand-600 px-3 py-1 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {savingId === entry.studentId ? 'Guardando…' : 'Guardar'}
                  </button>
                </td>
              </tr>
            ))}
            {roster.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-slate-400">
                  No hay alumnos en este colegio.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
