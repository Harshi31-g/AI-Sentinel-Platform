import { Search, Bell, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useHealthCheck } from "@workspace/api-client-react";

export function Header() {
  const { data: health } = useHealthCheck();
  const isHealthy = health?.status === "ok";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search resources, findings, or activity..."
            className="w-full bg-muted/50 pl-9 border-none focus-visible:ring-1"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border text-xs font-medium">
          <div className={`h-2 w-2 rounded-full ${isHealthy ? "bg-emerald-500" : "bg-red-500"} animate-pulse`} />
          {isHealthy ? "System Operational" : "System Degraded"}
        </div>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>
        <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-semibold text-sm">
          SE
        </div>
      </div>
    </header>
  );
}
