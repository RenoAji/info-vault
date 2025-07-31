"use client";
import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

export default function Dashboard() {
  // Dummy data for Vaults
  const [Vaults, setVaults] = useState([
    {
      id: 1,
      name: "Work Notes",
      description: "Docs and notes for work projects.",
    },
    {
      id: 2,
      name: "Personal Library",
      description: "Books, articles, and personal research.",
    },
    {
      id: 3,
      name: "Learning",
      description: "Courses, tutorials, and learning resources.",
    },
  ]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");

  const handleOpenModal = () => {
    setForm({ name: "", description: "" });
    setError("");
    setShowModal(true);
  };
  const handleCloseModal = () => setShowModal(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setVaults([
      ...Vaults,
      {
        id: Date.now(),
        name: form.name,
        description: form.description,
      },
    ]);
    setShowModal(false);
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
          {Vaults.map((kb) => (
            <Link
              key={kb.id}
              href={`/vaults/${kb.id}`}
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
          ))}
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
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">New Vault</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">Name<span className="text-red-500">*</span></label>
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
                <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">Description</label>
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
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
