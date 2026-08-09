import Link from "next/link";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Auth Page Header Bar */}
      <header className="flex h-16 w-full items-center justify-between border-b border-border bg-card px-6 shadow-xs">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <Logo size="md" />
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
