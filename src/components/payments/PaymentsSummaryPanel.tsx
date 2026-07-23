'use client';

import { useEffect, useState } from 'react';

type SchoolSummary = {
  schoolId: string;
  schoolName: string;
  paidCount: number;
  partialCount: number;
  pendingCount: number;
  exemptCount: number;
  expectedTotal: number;
  paidTotal: number;
};

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

const currencyFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export function PaymentsSummaryPanel() {
  const [{ month, year }, setPeriod] = useState(currentMonthYear());
  const [summary, setSummary] = useState<SchoolSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      const params = new URLSearchParams({ month: String(month), year: String(year) });
      const response = await fetch(`/api/payments/summary?${params.toString()}`);
      const data = (await response.json()) as { summary: SchoolSummary[] };
      setSummary(data.summary);
      setLoading(false);
    }
    loadSummary();
  }, [month, year]);

  const totals = summary.reduce(
    (acc, s) => ({
      expectedTotal: acc.expectedTotal + s.expectedTotal,
      paidTotal: acc.paidTotal + s.paidTotal,
    }),
    { expectedTotal: 0, paidTotal: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
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

      {loading ? (
        <p className="text-sm text-slate-500">Cargando resumen…</p>
      ) : (
        <>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4">Colegio</th>
                <th className="py-2 pr-4">Pagados</th>
                <th className="py-2 pr-4">Parciales</th>
                <th className="py-2 pr-4">Pendientes</th>
                <th className="py-2 pr-4">Exentos</th>
                <th className="py-2 pr-4">Esperado</th>
                <th className="py-2 pr-4">Cobrado</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.schoolId} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{s.schoolName}</td>
                  <td className="py-2 pr-4">{s.paidCount}</td>
                  <td className="py-2 pr-4">{s.partialCount}</td>
                  <td className="py-2 pr-4">{s.pendingCount}</td>
                  <td className="py-2 pr-4">{s.exemptCount}</td>
                  <td className="py-2 pr-4">{currencyFormatter.format(s.expectedTotal)}</td>
                  <td className="py-2 pr-4">{currencyFormatter.format(s.paidTotal)}</td>
                </tr>
              ))}
              {summary.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-400">
                    No hay colegios disponibles.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <p className="text-sm text-slate-600">
            Total esperado: <strong>{currencyFormatter.format(totals.expectedTotal)}</strong> · Total cobrado:{' '}
            <strong>{currencyFormatter.format(totals.paidTotal)}</strong>
          </p>
        </>
      )}
    </div>
  );
}
