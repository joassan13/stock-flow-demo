'use client';

import { useEffect, useState } from 'react';

interface Product {
  _id: string;
  sku: string;
  name: string;
  price: number;
  category: string;
}

const emptyForm = { sku: '', name: '', price: '', category: '' };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchProducts() {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  function handleEdit(product: Product) {
    setEditingId(product._id);
    setForm({
      sku: product.sku,
      name: product.name,
      price: String(product.price),
      category: product.category,
    });
    setError(null);
  }

  function handleCancel() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = { ...form, price: Number(form.price) };
    const url = editingId ? `/api/products/${editingId}` : '/api/products';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      setForm(emptyForm);
      setEditingId(null);
      await fetchProducts();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este producto?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    await fetchProducts();
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-6 text-white">Productos</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded-lg bg-white space-y-3">
        <h2 className="font-medium text-lg text-zinc-900">{editingId ? 'Editar producto' : 'Nuevo producto'}</h2>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <input
            required
            placeholder="SKU"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            className="border rounded px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
          />
          <input
            required
            placeholder="Nombre"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
          />
          <input
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="Precio"
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="border rounded px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
          />
          <input
            required
            placeholder="Categoría"
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="border rounded px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white text-sm px-4 py-2 rounded hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
              className="text-sm px-4 py-2 rounded border hover:bg-zinc-50"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Table */}
      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead className="bg-zinc-100 text-left text-zinc-600 uppercase">
          <tr>
            <th className="px-4 py-2">SKU</th>
            <th className="px-4 py-2">Nombre</th>
            <th className="px-4 py-2">Categoría</th>
            <th className="px-4 py-2">Precio</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="bg-white text-zinc-900">
          {products.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                No hay productos aún.
              </td>
            </tr>
          )}
          {products.map((p) => (
            <tr key={p._id} className="border-t hover:bg-cyan-100">
              <td className="px-4 py-2 font-mono">{p.sku}</td>
              <td className="px-4 py-2">{p.name}</td>
              <td className="px-4 py-2">{p.category}</td>
              <td className="px-4 py-2">${p.price.toFixed(2)}</td>
              <td className="px-4 py-2 flex gap-2 justify-end">
                <button
                  onClick={() => handleEdit(p)}
                  className="text-xs px-3 py-1 border rounded hover:bg-zinc-100"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(p._id)}
                  className="text-xs px-3 py-1 border rounded text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
