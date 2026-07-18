import { Input } from "@/components/ui/input";

interface Props {
  value?: string;
  onChange?: (value: string) => void;
}

export default function CugInput({ value, onChange }: Props) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        CUG Number
      </label>

      <div className="flex overflow-hidden rounded-xl border">

        <div className="flex items-center bg-gray-100 px-4 font-semibold text-gray-700">
          097898
        </div>

        <Input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="1234"
          maxLength={4}
          className="h-12 border-0 shadow-none focus-visible:ring-0"
        />

      </div>

      <p className="mt-1 text-xs text-gray-500">
        Enter the last four digits of your CUG.
      </p>
    </div>
  );
}