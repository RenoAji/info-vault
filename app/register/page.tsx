"use client";
import React, { use, useState } from "react";
import Link from "next/link";
import { debug } from "console";
import { debuglog } from "util";
import { redirect } from "next/dist/server/api-utils";

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", password: "", confirm: "", username: "" });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
        setError("Passwords do not match.");
        return;
    }
    setError("");
    try {
        const res = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: form.email, password: form.password, username: form.username }),
        });
        if (!res.ok) {
            const data = await res.json();
            setError(data.error || "Registration failed.");
            return;
        }
        // Optionally redirect or show success message
        // window.location.href = "/login";
    } catch (err) {
        setError("Something went wrong. Please try again.");
    }
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-black dark:to-purple-900/20">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">Create Your Account</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">Username</label>
                <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your_username"
                required
                />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Password"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">Confirm Password</label>
            <input
              type="password"
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm Password"
              required
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-full font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow"
          >
            Register
          </button>
        </form>
        <div className="mt-6 text-center text-gray-600 dark:text-gray-300">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
