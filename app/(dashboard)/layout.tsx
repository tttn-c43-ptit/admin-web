"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Leaf,
  Sprout,
  ClipboardList,
  Warehouse,
  Tractor,
  BarChart3,
  Search,
  Bell,
  User,
  Users,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { clearTokens } from "@/lib/auth";
import { getUserRole, type UserRole } from "@/lib/jwt";
import { useRouter } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: typeof BarChart3;
  ownerOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: BarChart3, ownerOnly: true },
  { href: "/gardens", label: "Gardens", icon: Leaf, ownerOnly: true },
  { href: "/plants", label: "Plants", icon: Sprout, ownerOnly: true },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/inventory", label: "Inventory", icon: Warehouse, ownerOnly: true },
  { href: "/harvests", label: "Harvests", icon: Tractor, ownerOnly: true },
  { href: "/reports", label: "Reports", icon: BarChart3, ownerOnly: true },
  { href: "/staff", label: "Staff", icon: Users, ownerOnly: true },
];

function useRole(): UserRole | null {
  // Safe to call in client component — getUserRole checks typeof window
  return useMemo(() => getUserRole(), []);
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const role = useRole();

  const handleLogout = () => {
    clearTokens();
    router.push("/login");
  };

  // Filter nav items based on role
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.ownerOnly || role === "OWNER",
  );

  return (
    <div className="flex h-screen w-full bg-surface overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar border-r border-border transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link
            href={role === "STAFF" ? "/tasks" : "/dashboard"}
            className="flex items-center gap-2 text-primary font-semibold text-xl"
          >
            <Leaf className="h-6 w-6" />
            <span>Admin Web</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface-card px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="relative hidden md:flex items-center">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search..."
                className="h-8 w-64 rounded-md border border-input bg-transparent pl-8 pr-4 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon">
              <User className="h-6 w-6 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut className="h-6 w-6 text-muted-foreground" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
