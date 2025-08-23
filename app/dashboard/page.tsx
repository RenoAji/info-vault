"use client";
import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { useSession } from "next-auth/react";

export default function Dashboard() {
  // All hooks must be called unconditionally
  type Vault = { id: string; name: string; description: string };
  const [Vaults, setVaults] = useState<Vault[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [editModal, setEditModal] = useState<{
    open: boolean;
    vault: Vault | null;
  }>({ open: false, vault: null });

  // Loading states
  const [vaultsLoading, setVaultsLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const { data: session, status } = useSession();

  React.useEffect(() => {
    setVaultsLoading(true);
    fetch("/api/vault")
      .then((res) => res.json())
      .then((data) => setVaults(data || []))
      .catch(() => setVaults([]))
      .finally(() => setVaultsLoading(false));
  }, []);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status !== "authenticated") {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const handleOpenModal = () => {
    setForm({ name: "", description: "" });
    setError("");
    setShowModal(true);
  };
  const handleCloseModal = () => setShowModal(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Vault name is required.");
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create vault.");
        return;
      }

      const newVault = await res.json();
      setVaults([...Vaults, newVault]);
      setShowModal(false);
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this vault?")) return;

    setDeleteLoading(id);
    try {
      const res = await fetch(`/api/vault/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete vault");
      setVaults(Vaults.filter((v) => v.id !== id));
    } catch {
      alert("Failed to delete vault.");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleEditOpen = (vault: Vault) => {
    setEditModal({ open: true, vault });
    setForm({ name: vault.name, description: vault.description });
    setError("");
  };
  const handleEditClose = () => setEditModal({ open: false, vault: null });

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Vault name is required.");
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetch(`/api/vault/${editModal.vault?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to update vault");
      const updatedVault = await res.json();
      setVaults(
        Vaults.map((v) => (v.id === updatedVault.id ? updatedVault : v))
      );
      setEditModal({ open: false, vault: null });
    } catch {
      setError("Failed to update vault.");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <Navbar />

      {/* Dashboard Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-12 gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Your Vaults
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Organize your notes, documents, and insights into separate spaces.
            </p>
          </div>
          <button
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-full text-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
            onClick={handleOpenModal}
          >
            + New Vault
          </button>
        </div>

        {/* Vault List */}
        <div className="grid md:grid-cols-3 gap-8">
          {vaultsLoading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow animate-pulse"
              >
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))
          ) : Vaults.length === 0 ? (
            // Empty state
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No vaults yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4 text-center">
                Create your first vault to start organizing your knowledge.
              </p>
              <button
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow"
                onClick={handleOpenModal}
              >
                Create First Vault
              </button>
            </div>
          ) : (
            // Vault cards
            Vaults.map((kb) => (
              <div key={kb.id} className="relative">
                <Link
                  href={`/vaults/${kb.id}/?vaultName=${encodeURIComponent(
                    kb.name
                  )}`}
                  className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow hover:shadow-lg transition-all hover:scale-[1.02]"
                >
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {kb.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {kb.description}
                  </p>
                  <span className="inline-block text-blue-600 dark:text-blue-400 font-medium">
                    Open &rarr;
                  </span>
                </Link>
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    className="px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-semibold hover:bg-yellow-200 dark:hover:bg-yellow-800 transition disabled:opacity-50"
                    onClick={() => handleEditOpen(kb)}
                    title="Edit"
                    disabled={deleteLoading === kb.id}
                  >
                    Edit
                  </button>
                  <button
                    className="px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => handleDelete(kb.id)}
                    title="Delete"
                    disabled={deleteLoading === kb.id}
                  >
                    {deleteLoading === kb.id ? (
                      <div className="flex items-center gap-1">
                        <div className="animate-spin rounded-full h-3 w-3 border border-red-800 dark:border-red-200 border-t-transparent"></div>
                        <span>...</span>
                      </div>
                    ) : (
                      "Delete"
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modal for new Vault */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
              onClick={handleCloseModal}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              New Vault
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">
                  Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Research Vault"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe this Vault (optional)"
                  rows={3}
                />
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={createLoading}
                >
                  {createLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </div>
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
              onClick={handleEditClose}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Edit Vault
            </h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">
                  Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Research Vault"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe this Vault (optional)"
                  rows={3}
                />
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  onClick={handleEditClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Updating...
                    </div>
                  ) : (
                    "Update"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
