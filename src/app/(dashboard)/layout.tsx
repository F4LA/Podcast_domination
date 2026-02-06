"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Mail,
  BarChart3,
  Settings,
  Mic2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Discovery", href: "/discovery", icon: Search },
  { name: "Pipeline", href: "/pipeline", icon: LayoutDashboard },
  { name: "Outreach", href: "/outreach", icon: Mail },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[#2D3142] border-r border-[#3d4156]">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-[#3d4156]">
          <Mic2 className="h-8 w-8 text-[#EF8354]" />
          <span className="font-semibold text-lg text-white">Podcast Domination</span>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-[#EF8354] text-white shadow-md"
                    : "text-[#c5c8d4] hover:bg-[#3d4156] hover:text-white hover:translate-x-1"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "text-white")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="pl-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
