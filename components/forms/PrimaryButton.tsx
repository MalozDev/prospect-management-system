import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  type?: "button" | "submit";
}

export default function PrimaryButton({
  children,
  type = "button",
}: Props) {
  return (
    <Button
      type={type}
      className="h-12 w-full rounded-xl bg-[#E60012] text-white hover:bg-red-700"
    >
      {children}
    </Button>
  );
}