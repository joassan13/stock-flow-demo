'use client';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';

export function DashboardRedirect() {
  redirect('/');
}

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

export function DashboardPage() {
  const [products, setProducts] = useState<ProductDashboard[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((data) => setProducts(data))
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-zinc-500">Loading dashboard...</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-2 text-zinc-900">Dashboard</h1>
      <p className="text-sm text-zinc-500 mb-6">Products with total stock and stock per branch</p>

      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead className="bg-zinc-100 text-left text-zinc-900">
          <tr>
            <th className="px-4 py-2">SKU</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2 text-right">Price</th>
            <th className="px-4 py-2 text-right">Total stock</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {products.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                No products found.
              </td>
            </tr>
          )}
          {products.map((p) => (
            <>
              <tr
                key={p._id}
                className="border-t hover:bg-zinc-50 text-zinc-900 cursor-pointer"
                onClick={() => toggleExpand(p._id)}
              >
                <td className="px-4 py-2 font-mono text-xs text-zinc-500">{p.sku}</td>
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2 text-zinc-500">{p.category}</td>
                <td className="px-4 py-2 text-right">${p.price.toFixed(2)}</td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={`font-semibold ${
                      p.totalStock === 0 ? 'text-red-600' : 'text-zinc-900'
                    }`}
                  >
                    {p.totalStock}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-zinc-400 text-xs">
                  {p.branches.length > 0
                    ? expanded === p._id
                      ? '▲ hide'
                      : '▼ by branch'
                    : '—'}
                </td>
              </tr>

              {/* Expandable breakdown by branch */}
              {expanded === p._id && p.branches.length > 0 && (
                <tr key={`${p._id}-detail`} className="bg-zinc-50">
                  <td colSpan={6} className="px-8 py-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-zinc-500">
                          <th className="text-left pb-1 font-medium">Branch</th>
                          <th className="text-left pb-1 font-medium">Location</th>
                          <th className="text-right pb-1 font-medium">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.branches.map((b, i) => (
                          <tr key={i} className="border-t border-zinc-200">
                            <td className="py-1 text-zinc-900">{b.branchName}</td>
                            <td className="py-1 text-zinc-500">{b.location}</td>
                            <td className={`py-1 text-right font-semibold ${b.quantity === 0 ? 'text-red-500' : 'text-zinc-900'}`}>
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
  );
}
