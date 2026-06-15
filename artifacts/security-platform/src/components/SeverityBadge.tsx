import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Severity = "critical" | "high" | "medium" | "low" | string;

export function SeverityBadge({ severity, className }: { severity?: Severity | null; className?: string }) {
  if (!severity) return null;
  
  const colors: Record<string, string> = {
    critical: "bg-red-950/50 text-red-400 border-red-500/50",
    high: "bg-amber-950/50 text-amber-400 border-amber-500/50",
    medium: "bg-yellow-950/50 text-yellow-400 border-yellow-500/50",
    low: "bg-emerald-950/50 text-emerald-400 border-emerald-500/50",
  };

  return (
    <Badge variant="outline" className={cn("uppercase text-[10px] font-bold tracking-wider", colors[severity.toLowerCase()] || "bg-muted text-muted-foreground", className)}>
      {severity}
    </Badge>
  );
}
