import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RiskLevel = "critical" | "high" | "medium" | "low" | string;

export function RiskLevelBadge({ level, className }: { level?: RiskLevel | null; className?: string }) {
  if (!level) return <Badge variant="outline" className={cn("uppercase text-[10px] font-bold text-muted-foreground", className)}>UNKNOWN</Badge>;
  
  const colors: Record<string, string> = {
    critical: "bg-red-950/50 text-red-400 border-red-500/50",
    high: "bg-amber-950/50 text-amber-400 border-amber-500/50",
    medium: "bg-yellow-950/50 text-yellow-400 border-yellow-500/50",
    low: "bg-emerald-950/50 text-emerald-400 border-emerald-500/50",
  };

  return (
    <Badge variant="outline" className={cn("uppercase text-[10px] font-bold tracking-wider", colors[level.toLowerCase()] || "bg-muted text-muted-foreground", className)}>
      {level} RISK
    </Badge>
  );
}
