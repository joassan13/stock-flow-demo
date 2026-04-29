'use client';

import { useEffect, useState } from 'react';

interface Branch {
  _id: string;
  name: string;
  location: string;
}

const emptyForm = { name: '', location: '' };

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchBranches() {
    const res = await fetch('/api/branches');
    const data = await res.json();
    setBranches(data);
  }

  useEffect(() => {
    fetchBranches();
  }, []);

  function handleEdit(branch: Branch) {
    setEditingId(branch._id);
    setForm({ name: branch.name, location: branch.location });
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

    const url = editingId ? `/api/branches/${editingId}` : '/api/branches';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      setForm(emptyForm);
      setEditingId(null);
      await fetchBranches();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this branch?')) return;
    await fetch(`/api/branches/${id}`, { method: 'DELETE' });
    await fetchBranches();
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-6 text-white">Branches</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded-lg bg-white space-y-3">
        <h2 className="font-medium text-lg text-zinc-900">
          {editingId ? 'Edit branch' : 'New branch'}
        </h2>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
          />
          <input
            required
            placeholder="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="border rounded px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white text-sm px-4 py-2 rounded hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
              className="text-sm px-4 py-2 rounded border hover:bg-zinc-50 text-zinc-900"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Table */}
      <table className="w-full text-sm border rounded-lg overflow-hidden">
        <thead className="bg-zinc-100 text-left text-zinc-900 uppercase">
          <tr>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Location</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {branches.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-zinc-400">
                No branches yet.
              </td>
            </tr>
          )}
          {branches.map((b) => (
            <tr key={b._id} className="border-t bg-green hover:bg-cyan-100 text-zinc-900">
              <td className="px-4 py-2">{b.name}</td>
              <td className="px-4 py-2">{b.location}</td>
              <td className="px-4 py-2 flex gap-2 justify-end">
                <button
                  onClick={() => handleEdit(b)}
                  className="text-xs px-3 py-1 border rounded hover:bg-zinc-800 hover:text-white"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(b._id)}
                  className="text-xs px-3 py-1 border rounded text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
