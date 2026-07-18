"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";

export default function NewProspectPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", location: "", address: "", expectedPurchaseDate: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.phone.trim() || !form.location.trim() || !form.expectedPurchaseDate) {
      setError("Please fill in all required fields.");
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
            <label className="mb-2 block text-sm font-semibold text-gray-700">Full Name</label>
            <Input value={form.name} onChange={(event) => handleChange("name", event.target.value)} placeholder="Prospect full name" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Phone Number</label>
            <Input value={form.phone} onChange={(event) => handleChange("phone", event.target.value)} placeholder="+2609xxxxxxxx" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Location</label>
            <Input value={form.location} onChange={(event) => handleChange("location", event.target.value)} placeholder="Field location" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Address</label>
            <Input value={form.address} onChange={(event) => handleChange("address", event.target.value)} placeholder="Meeting address" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Follow-up Date</label>
            <Input value={form.expectedPurchaseDate} onChange={(event) => handleChange("expectedPurchaseDate", event.target.value)} type="date" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Prospect"}
          </Button>
        </form>
      </div>
    </main>
  );
}
