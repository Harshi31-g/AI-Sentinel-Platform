import { Link, useLocation } from "wouter";
import { Shield, LayoutDashboard, Database, Activity, AlertTriangle, BarChart2, Settings, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Resources", href: "/resources", icon: Database },
  { name: "Security Scans", href: "/scans", icon: Radio }, // Might not have a global scans list, but good placeholder
  { name: "Findings", href: "/findings", icon: AlertTriangle },
  { name: "Activity Feed", href: "/activity", icon: Activity },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar px-4 py-6">
      <div className="flex items-center gap-2 px-2 mb-8">
        <Shield className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold tracking-tight text-sidebar-foreground">SentinelAI</span>
      </div>
      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-sidebar-primary/10 text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
