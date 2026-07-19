"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { PROSPECT_TITLES } from "@/lib/prospect-titles";

export default function NewProspectPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "Mr", name: "", phone: "", location: "", address: "", expectedPurchaseDate: "", notes: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.phone.trim() || !form.location.trim() || !form.address.trim() || !form.expectedPurchaseDate) {
      setError("Please fill in all required fields (name, phone, location, address, and follow-up date).");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/api/prospects", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.push("/prospects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create prospect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f8f8] p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">New Prospect</h1>
        <p className="mt-2 text-sm text-gray-500">Capture the prospect details quickly so follow-up is easy.</p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Title / Salutation</label>
            <Select
              value={form.title}
              onChange={(event) => handleChange("title", event.target.value)}
            >
              {PROSPECT_TITLES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Full Name <span className="text-red-500">*</span></label>
            <Input value={form.name} onChange={(event) => handleChange("name", event.target.value)} placeholder="Prospect full name" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Phone Number <span className="text-red-500">*</span></label>
            <Input value={form.phone} onChange={(event) => handleChange("phone", event.target.value)} placeholder="+2609xxxxxxxx" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Location <span className="text-red-500">*</span></label>
            <Input value={form.location} onChange={(event) => handleChange("location", event.target.value)} placeholder="Field location" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Address <span className="text-red-500">*</span></label>
            <Input value={form.address} onChange={(event) => handleChange("address", event.target.value)} placeholder="Meeting address" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Follow-up Date <span className="text-red-500">*</span></label>
            <Input value={form.expectedPurchaseDate} onChange={(event) => handleChange("expectedPurchaseDate", event.target.value)} type="date" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Notes <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(event) => handleChange("notes", event.target.value)}
              placeholder="Any reminders, preferences, or special details..."
              rows={3}
              className="flex w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </span>
            ) : (
              "Save Prospect"
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
