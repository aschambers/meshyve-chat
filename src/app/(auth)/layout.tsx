import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-gray-900">
      <nav className="flex items-center px-8 py-4">
        <Image src="/logo.png" alt="Chatter" width={200} height={115} priority />
      </nav>
      <div className="flex flex-1 items-center justify-center">
        {children}
      </div>
    </main>
  );
}
