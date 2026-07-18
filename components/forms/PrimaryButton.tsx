import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
}

export default function PrimaryButton({
  children,
  type = "button",
  disabled = false,
}: Props) {
  return (
    <Button
      type={type}
      disabled={disabled}
      className="h-12 w-full rounded-xl bg-[#E60012] text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </Button>
  );
}