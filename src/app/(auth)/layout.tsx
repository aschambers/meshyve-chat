import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex h-[100dvh] flex-col bg-gray-900 overflow-y-auto">
      <nav className="flex items-center py-4 pl-[5%] md:absolute md:py-0 md:pl-0" style={{ top: '3%', left: '3%' }}>
        <Link href="/login">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Meshyve" width={200} />
        </Link>
      </nav>
      <div className="flex flex-1 items-center justify-center" style={{ paddingLeft: '5%', paddingRight: '5%' }}>
        {children}
      </div>
    </main>
  );
}
