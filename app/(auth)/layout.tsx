export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center px-4 py-8">
      {children}
    </main>
  );
}