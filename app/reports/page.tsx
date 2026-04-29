'use client';

import { useEffect, useState } from 'react';

interface ReportData {
  dateRange: { from: string; to: string };
  total: number;
  byType: { type: string; count: number }[];
  byBranch: { branchName: string; asOrigin: number; asDestination: number; total: number }[];
}

function toInputDate(iso: string) {
  return iso.split('T')[0];
}

function defaultRange() {
  const to = new Date();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return {
    from: toInputDate(from.toISOString()),
    to: toInputDate(to.toISOString()),
  };
}

const TYPE_LABELS: Record<string, string> = {
  entry: 'Entrada (compra)',
  exit: 'Salida (venta)',
  transfer: 'Transferencia',
};

const TYPE_COLORS: Record<string, string> = {
  entry: 'bg-emerald-100 text-emerald-800',
  exit: 'bg-red-100 text-red-800',
  transfer: 'bg-blue-100 text-blue-800',
};

export default function ReportsPage() {
  const range = defaultRange();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports?from=${from}&to=${to}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to load report');
        return;
      }
      setReport(data);
    } catch {
      setError('Could not reach the server. Is the dev server running?');
    } finally {
      setLoading(false);
    }
  }

  // Load on mount with default range
  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Reportes</h1>
        <p className="text-sm text-zinc-400 mt-1">Totales de movimientos por tipo y por sucursal para un rango de fechas</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-zinc-200 px-6 py-5 mb-6 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-3 py-2 text-sm text-zinc-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-3 py-2 text-sm text-zinc-900"
          />
        </div>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="bg-black text-white text-sm px-5 py-2 rounded hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? 'Cargando...' : 'Generar'}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {report && (
        <>
          {/* Summary */}
          <div className="bg-white rounded-xl border border-zinc-200 px-6 py-5 mb-6 flex items-center gap-6">
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Total de movimientos</p>
              <p className="text-3xl font-bold text-zinc-900">{report.total}</p>
            </div>
            <div className="text-xs text-zinc-400 border-l pl-6">
              {new Date(report.dateRange.from).toLocaleDateString()} →{' '}
              {new Date(report.dateRange.to).toLocaleDateString()}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* By type */}
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100">
                <h2 className="text-sm font-semibold text-zinc-900">Por tipo</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-500">
                  <tr>
                    <th className="px-6 py-2 font-medium">Tipo</th>
                    <th className="px-6 py-2 font-medium text-right">Cantidad</th>
                    <th className="px-6 py-2 font-medium text-right">% del total</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {report.byType.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-6 text-center text-zinc-400">
                        Sin movimientos en el rango.
                      </td>
                    </tr>
                  )}
                  {report.byType.map((t) => (
                    <tr key={t.type} className="border-t border-zinc-100 text-zinc-900">
                      <td className="px-6 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[t.type] ?? 'bg-zinc-100 text-zinc-700'}`}>
                          {TYPE_LABELS[t.type] ?? t.type}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold">{t.count}</td>
                      <td className="px-6 py-3 text-right text-zinc-400">
                        {report.total > 0 ? `${Math.round((t.count / report.total) * 100)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* By branch */}
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100">
                <h2 className="text-sm font-semibold text-zinc-900">Por sucursal</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left text-zinc-500">
                  <tr>
                    <th className="px-6 py-2 font-medium">Sucursal</th>
                    <th className="px-6 py-2 font-medium text-right">Como origen</th>
                    <th className="px-6 py-2 font-medium text-right">Como destino</th>
                    <th className="px-6 py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {report.byBranch.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-6 text-center text-zinc-400">
                        Sin movimientos en el rango.
                      </td>
                    </tr>
                  )}
                  {report.byBranch.map((b) => (
                    <tr key={b.branchName} className="border-t border-zinc-100 text-zinc-900">
                      <td className="px-6 py-3 font-medium">{b.branchName}</td>
                      <td className="px-6 py-3 text-right text-zinc-500">{b.asOrigin}</td>
                      <td className="px-6 py-3 text-right text-zinc-500">{b.asDestination}</td>
                      <td className="px-6 py-3 text-right font-semibold">{b.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
