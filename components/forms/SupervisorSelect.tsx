"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/select";
import { apiFetch, getToken } from "@/lib/api-client";

interface Supervisor {
  _id: string;
  name: string;
  cugSuffix: string;
  region: string;
}

interface Props {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export default function SupervisorSelect({
  label = "Supervisor",
  value,
  onChange,
}: Props) {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSupervisors() {
      try {
        const token = getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        const data = await apiFetch<{ supervisors: Supervisor[] }>("/api/supervisors");
        setSupervisors(data.supervisors);
      } catch {
        setError("Failed to load supervisors");
      } finally {
        setLoading(false);
      }
    }
    fetchSupervisors();
  }, []);

  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <Select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-12 rounded-xl"
        disabled={loading}
      >
        <option value="">
          {loading ? "Loading supervisors..." : "Select a supervisor"}
        </option>
        {supervisors.map((sup) => (
          <option key={sup._id} value={sup.name}>
            {sup.name} {sup.region ? `(${sup.region})` : ""}
          </option>
        ))}
      </Select>

      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
