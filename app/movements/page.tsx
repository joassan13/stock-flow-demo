'use client';

import { useEffect, useState } from 'react';

interface Product {
  _id: string;
  sku: string;
  name: string;
}

interface Branch {
  _id: string;
  name: string;
  location: string;
}

interface Movement {
  _id: string;
  type: 'entry' | 'exit' | 'transfer';
  product: Product;
  fromBranch?: Branch;
  toBranch?: Branch;
  quantity: number;
  status: 'pending' | 'processed' | 'failed';
  failureReason?: string;
  createdAt: string;
}

const emptyForm = {
  type: 'entry' as 'entry' | 'exit' | 'transfer',
  product: '',
  fromBranch: '',
  toBranch: '',
  quantity: '',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  processed: 'Procesado',
  failed: 'Fallido',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export default function MovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [triggering, setTriggering] = useState(false);

  async function fetchMovements() {
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterBranch) params.set('branch', filterBranch);
    const res = await fetch(`/api/movements?${params.toString()}`);
    const data = await res.json();
    setMovements(data);
    return data as Movement[];
  }

  async function triggerWorker() {
    setTriggering(true);
    try {
      await fetch('/api/worker', { method: 'POST' });
      await fetchMovements();
    } finally {
      setTriggering(false);
    }
  }

  useEffect(() => {
    fetch('/api/products').then((r) => r.json()).then(setProducts);
    fetch('/api/branches').then((r) => r.json()).then(setBranches);
  }, []);

  useEffect(() => {
    fetchMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterBranch]);

  // Auto-refresh every 3s while there are pending movements
  useEffect(() => {
    const hasPending = movements.some((m) => m.status === 'pending');
    if (!hasPending) return;
    const interval = setInterval(fetchMovements, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movements]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      type: form.type,
      product: form.product,
      fromBranch: form.fromBranch || undefined,
      toBranch: form.toBranch || undefined,
      quantity: Number(form.quantity),
    };

    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      setForm(emptyForm);
      await fetchMovements();
    } finally {
      setLoading(false);
    }
  }

  const showFrom = form.type === 'exit' || form.type === 'transfer';
  const showTo = form.type === 'entry' || form.type === 'transfer';
  const pendingCount = movements.filter((m) => m.status === 'pending').length;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Movimientos</h1>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={triggerWorker}
            disabled={triggering || pendingCount === 0}
            className="text-sm px-4 py-2 rounded border bg-white text-zinc-900 hover:bg-zinc-50 disabled:opacity-40"
          >
            {triggering ? 'Procesando...' : 'Procesar siguiente'}
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded-lg bg-white space-y-3">
        <h2 className="font-medium text-lg text-zinc-900">Nuevo movimiento</h2>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          {/* Type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500">Tipo</label>
            <select
              required
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as typeof form.type, fromBranch: '', toBranch: '' })
              }
              className="border rounded px-3 py-2 text-sm text-zinc-900"
            >
              <option value="entry">Entrada (compra)</option>
              <option value="exit">Salida (venta)</option>
              <option value="transfer">Transferencia entre sucursales</option>
            </select>
          </div>

          {/* Product */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500">Producto</label>
            <select
              required
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
              className="border rounded px-3 py-2 text-sm text-zinc-900"
            >
              <option value="">Seleccionar producto...</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* From branch */}
          {showFrom && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">Sucursal origen</label>
              <select
                required
                value={form.fromBranch}
                onChange={(e) => setForm({ ...form, fromBranch: e.target.value })}
                className="border rounded px-3 py-2 text-sm text-zinc-900"
              >
                <option value="">Seleccionar sucursal...</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* To branch */}
          {showTo && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">Sucursal destino</label>
              <select
                required
                value={form.toBranch}
                onChange={(e) => setForm({ ...form, toBranch: e.target.value })}
                className="border rounded px-3 py-2 text-sm text-zinc-900"
              >
                <option value="">Seleccionar sucursal...</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500">Cantidad</label>
            <input
              required
              type="number"
              min="1"
              placeholder="Cantidad"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="border rounded px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white text-sm px-4 py-2 rounded hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? 'Registrando...' : 'Registrar movimiento'}
        </button>
      </form>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <label className="text-sm text-zinc-500">Filtrar por:</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded px-3 py-2 text-sm text-white bg-zinc-900"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="processed">Procesado</option>
          <option value="failed">Fallido</option>
        </select>

        <label className="text-sm text-zinc-500">Sucursal:</label>
        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          className="border rounded px-3 py-2 text-sm text-white bg-zinc-900"
        >
          <option value="">Todas las sucursales</option>
          {branches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead className="bg-zinc-100 text-left text-zinc-900">
          <tr>
            <th className="px-4 py-2">Tipo</th>
            <th className="px-4 py-2">Producto</th>
            <th className="px-4 py-2">Origen</th>
            <th className="px-4 py-2">Destino</th>
            <th className="px-4 py-2">Cant.</th>
            <th className="px-4 py-2">Estado</th>
            <th className="px-4 py-2">Motivo</th>
            <th className="px-4 py-2">Fecha</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {movements.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-zinc-400">
                  Aún no hay movimientos.
              </td>
            </tr>
          )}
          {movements.map((m) => (
            <tr key={m._id} className="border-t hover:bg-cyan-100 text-zinc-900">
              <td className="px-4 py-2 capitalize">{m.type === 'entry' ? 'Entrada' : m.type === 'exit' ? 'Salida' : 'Transferencia'}</td>
              <td className="px-4 py-2">
                <span className="font-mono text-xs text-zinc-500">{m.product?.sku}</span>{' '}
                {m.product?.name}
              </td>
              <td className="px-4 py-2">{m.fromBranch?.name ?? '—'}</td>
              <td className="px-4 py-2">{m.toBranch?.name ?? '—'}</td>
              <td className="px-4 py-2">{m.quantity}</td>
              <td className="px-4 py-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[m.status]}`}>
                  {STATUS_LABELS[m.status]}
                </span>
              </td>
              <td className="px-4 py-2 text-xs text-zinc-500 max-w-[200px]">
                {m.failureReason ?? '—'}
              </td>
              <td className="px-4 py-2 text-zinc-500">
                {new Date(m.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
