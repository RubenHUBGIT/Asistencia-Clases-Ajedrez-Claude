'use client';

import { useEffect, useState } from 'react';

type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
};

const ENTITY_TYPES = ['School', 'Student', 'AttendanceSession', 'MonthlyPayment', 'User'];

export function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    setLoading(true);
    const params = new URLSearchParams();
    if (entityType) params.set('entityType', entityType);
    if (action) params.set('action', action);
    const response = await fetch(`/api/audit?${params.toString()}`);
    const data = (await response.json()) as { logs: AuditLogEntry[] };
    setLogs(data.logs);
    setLoading(false);
  }

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType]);

  async function handleFilterSubmit(event: React.FormEvent) {
    event.preventDefault();
    loadLogs();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-3">
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">Todos los tipos</option>
          {ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Buscar por acción…"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />

        <button
          type="submit"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Filtrar
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando auditoría…</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">Fecha</th>
              <th className="py-2 pr-4">Usuario</th>
              <th className="py-2 pr-4">Acción</th>
              <th className="py-2 pr-4">Entidad</th>
              <th className="py-2 pr-4">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-100">
                <td className="py-2 pr-4 text-slate-500">{new Date(log.createdAt).toLocaleString('es-ES')}</td>
                <td className="py-2 pr-4">{log.user?.name ?? '—'}</td>
                <td className="py-2 pr-4">{log.action}</td>
                <td className="py-2 pr-4 text-slate-500">
                  {log.entityType}
                  {log.entityId ? ` · ${log.entityId}` : ''}
                </td>
                <td className="py-2 pr-4 text-slate-500">{log.ipAddress ?? '—'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-400">
                  No hay registros de auditoría.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
