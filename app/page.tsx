'use client';

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

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent?: 'default' | 'red' | 'yellow' | 'green';
}

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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setProducts(data.products);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-1">Real-time inventory overview</p>
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
          <StatCard label="Products" value={stats.products} sub="registered" />
          <StatCard label="Branches" value={stats.branches} sub="active" />
          <StatCard label="Total stock" value={stats.totalStock} sub="units across all branches" accent="green" />
          <StatCard
            label="Out of stock"
            value={stats.outOfStock}
            sub="products at 0"
            accent={stats.outOfStock > 0 ? 'red' : 'default'}
          />
          <StatCard
            label="Pending"
            value={stats.pendingMovements}
            sub="movements"
            accent={stats.pendingMovements > 0 ? 'yellow' : 'default'}
          />
          <StatCard label="Processed" value={stats.processedMovements} sub="movements" accent="green" />
          <StatCard
            label="Failed"
            value={stats.failedMovements}
            sub="movements"
            accent={stats.failedMovements > 0 ? 'red' : 'default'}
          />
        </div>
      ) : null}

      {/* Product stock table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">Stock by product</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Click a row to expand branch breakdown</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-6 py-2 font-medium">SKU</th>
              <th className="px-6 py-2 font-medium">Name</th>
              <th className="px-6 py-2 font-medium">Category</th>
              <th className="px-6 py-2 font-medium text-right">Price</th>
              <th className="px-6 py-2 font-medium text-right">Total stock</th>
              <th className="px-6 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-400">
                  No products found.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-400">
                  Loading...
                </td>
              </tr>
            )}
            {products.map((p) => (
              <>
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
                            <th className="text-left py-1 font-medium">Branch</th>
                            <th className="text-left py-1 font-medium">Location</th>
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
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
