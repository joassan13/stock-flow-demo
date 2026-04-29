'use client';

import React from 'react';
import { useEffect, useState } from 'react';

interface BranchStock {
  branchName: string;
  location: string;
  quantity: number;
}

interface ProductDashboard {
  _id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  totalStock: number;
  branches: BranchStock[];
}

interface DashboardStats {
  products: number;
  branches: number;
  totalStock: number;
  outOfStock: number;
  pendingMovements: number;
  processedMovements: number;
  failedMovements: number;
}

interface RecentMovement {
  _id: string;
  type: 'entry' | 'exit' | 'transfer';
  product: { name: string; sku: string };
  fromBranch?: { name: string };
  toBranch?: { name: string };
  quantity: number;
  status: 'pending' | 'processed' | 'failed';
  failureReason?: string;
  createdAt: string;
}

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent?: 'default' | 'red' | 'yellow' | 'green';
}

const TYPE_LABELS: Record<string, string> = {
  entry: 'Entrada',
  exit: 'Salida',
  transfer: 'Transferencia',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  processed: 'Procesado',
  failed: 'Fallido',
};

function StatCard({ label, value, sub, accent = 'default' }: StatCardProps) {
  const accentClass = {
    default: 'text-zinc-900',
    red: 'text-red-600',
    yellow: 'text-yellow-600',
    green: 'text-emerald-600',
  }[accent];

  return (
    <div className="bg-white rounded-xl border border-zinc-200 px-6 py-5 flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</span>
      <span className={`text-3xl font-bold ${accentClass}`}>{value}</span>
      {sub && <span className="text-xs text-zinc-400">{sub}</span>}
    </div>
  );
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<ProductDashboard[]>([]);
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setProducts(data.products);
        setRecentMovements(data.recentMovements ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Panel principal</h1>
        <p className="text-sm text-zinc-400 mt-1">Vista general del inventario en tiempo real</p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-zinc-100 rounded-xl border border-zinc-200 px-6 py-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Productos" value={stats.products} sub="registrados" />
          <StatCard label="Sucursales" value={stats.branches} sub="activas" />
          <StatCard label="Stock total" value={stats.totalStock} sub="unidades en todas las sucursales" accent="green" />
          <StatCard
            label="Sin stock"
            value={stats.outOfStock}
            sub="productos en 0"
            accent={stats.outOfStock > 0 ? 'red' : 'default'}
          />
          <StatCard
            label="Pendientes"
            value={stats.pendingMovements}
            sub="movimientos"
            accent={stats.pendingMovements > 0 ? 'yellow' : 'default'}
          />
          <StatCard label="Procesados" value={stats.processedMovements} sub="movimientos" accent="green" />
          <StatCard
            label="Fallidos"
            value={stats.failedMovements}
            sub="movimientos"
            accent={stats.failedMovements > 0 ? 'red' : 'default'}
          />
        </div>
      ) : null}

      {/* Product stock table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Stock por producto</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Haz clic en una fila para ver el detalle por sucursal</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-6 py-2 font-medium">SKU</th>
              <th className="px-6 py-2 font-medium">Nombre</th>
              <th className="px-6 py-2 font-medium">Categoría</th>
              <th className="px-6 py-2 font-medium text-right">Precio</th>
              <th className="px-6 py-2 font-medium text-right">Stock total</th>
              <th className="px-6 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-400">
                  No hay productos registrados.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-400">
                  Cargando...
                </td>
              </tr>
            )}
            {products.map((p) => (
              <React.Fragment key={p._id}>
                <tr
                  key={p._id}
                  className="border-t border-zinc-100 hover:bg-cyan-50 text-zinc-900 cursor-pointer transition-colors"
                  onClick={() => toggleExpand(p._id)}
                >
                  <td className="px-6 py-3 font-mono text-xs text-zinc-400">{p.sku}</td>
                  <td className="px-6 py-3 font-medium">{p.name}</td>
                  <td className="px-6 py-3 text-zinc-500">{p.category}</td>
                  <td className="px-6 py-3 text-right text-zinc-500">${p.price.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.totalStock === 0
                          ? 'bg-red-50 text-red-600'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {p.totalStock}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-zinc-300 text-xs">
                    {p.branches.length > 0 ? (expanded === p._id ? '▲' : '▼') : '—'}
                  </td>
                </tr>

                {expanded === p._id && p.branches.length > 0 && (
                  <tr key={`${p._id}-detail`} className="bg-zinc-50">
                    <td colSpan={6} className="px-10 py-2">
                      <table className="w-full text-xs mb-2">
                        <thead>
                          <tr className="text-zinc-400">
                            <th className="text-left py-1 font-medium">Sucursal</th>
                            <th className="text-left py-1 font-medium">Ubicación</th>
                            <th className="text-right py-1 font-medium">Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.branches.map((b, i) => (
                            <tr key={i} className="border-t border-zinc-200">
                              <td className="py-1.5 text-zinc-700">{b.branchName}</td>
                              <td className="py-1.5 text-zinc-400">{b.location}</td>
                              <td className={`py-1.5 text-right font-semibold ${b.quantity === 0 ? 'text-red-500' : 'text-zinc-900'}`}>
                                {b.quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent movements */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Movimientos recientes</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Últimos 10 movimientos en todas las sucursales</p>
          </div>
          <a href="/movements" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors">
            Ver todos →
          </a>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-6 py-2 font-medium">Tipo</th>
              <th className="px-6 py-2 font-medium">Producto</th>
              <th className="px-6 py-2 font-medium">Origen</th>
              <th className="px-6 py-2 font-medium">Destino</th>
              <th className="px-6 py-2 font-medium text-right">Cant.</th>
              <th className="px-6 py-2 font-medium">Estado</th>
              <th className="px-6 py-2 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {!loading && recentMovements.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-zinc-400">
                  Aún no hay movimientos.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-zinc-400">
                  Cargando...
                </td>
              </tr>
            )}
            {recentMovements.map((m) => (
              <tr key={m._id} className="border-t border-zinc-100 hover:bg-cyan-50 text-zinc-900 transition-colors">
                <td className="px-6 py-3 text-zinc-500">{TYPE_LABELS[m.type] ?? m.type}</td>
                <td className="px-6 py-3">
                  <span className="font-mono text-xs text-zinc-400 mr-1">{m.product?.sku}</span>
                  {m.product?.name}
                </td>
                <td className="px-6 py-3 text-zinc-500">{m.fromBranch?.name ?? '—'}</td>
                <td className="px-6 py-3 text-zinc-500">{m.toBranch?.name ?? '—'}</td>
                <td className="px-6 py-3 text-right font-medium">{m.quantity}</td>
                <td className="px-6 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.status === 'processed'
                        ? 'bg-green-100 text-green-800'
                        : m.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {STATUS_LABELS[m.status] ?? m.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-xs text-zinc-400">
                  {new Date(m.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
