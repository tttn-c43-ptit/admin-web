import Link from "next/link";
import { LanguageToggle } from "@/components/layout/language-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Auth Page Header Bar */}
      <header className="flex h-16 w-full items-center justify-between border-b border-border bg-card px-6 shadow-xs">
        <Link href="/" className="flex items-center gap-3 text-primary font-bold text-xl tracking-tight">
          <div className="bg-white overflow-hidden rounded-lg h-8 w-8 flex items-center justify-center shadow-sm border border-border">
            <img src="/images/logo.png" alt="Logo" className="h-full w-full object-cover" />
          </div>
          <span>PlantCare</span>
        </Link>

        <div className="flex items-center gap-2">
          <LanguageToggle />
        </div>
      </header>

      {/* Main Auth Form Container */}
      <main className="flex flex-1 items-center justify-center p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
