"use client";

import { Select } from "@/components/ui/select";
import { supervisors } from "@/constants/supervisors";

interface Props {
  label?: string;
}

export default function SupervisorSelect({
  label = "Supervisor",
}: Props) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <Select className="h-12 rounded-xl">
        <option value="">Select a supervisor</option>
        {supervisors.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </Select>
    </div>
  );
}
