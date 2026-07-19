import Image from "next/image";

export default function Logo() {
  return (
    <div className="mb-6 flex justify-center">
      <Image
        src="/airtel_logo.png"
        alt="Airtel Zambia"
        width={180}
        height={60}
        priority
        className="h-auto w-40"
      />
    </div>
  );
}
