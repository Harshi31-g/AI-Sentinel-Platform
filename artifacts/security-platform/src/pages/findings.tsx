import { useState } from "react";
import { useListFindings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SeverityBadge } from "@/components/SeverityBadge";
import { formatDistanceToNow } from "date-fns";
import { Filter, Search, ChevronDown, Clock, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "wouter";

export default function FindingsList() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const { data: findings, isLoading } = useListFindings({ severity: severityFilter === "all" ? undefined : severityFilter, limit: 50 });
  const [search, setSearch] = useState("");

  const severities = ["all", "critical", "high", "medium", "low"];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Vulnerability Findings</h1>
        <p className="text-muted-foreground">Comprehensive list of all identified vulnerabilities across all agents.</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search findings..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/30 border-border" 
          />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground mr-2" />
          {severities.map(s => (
            <Badge 
              key={s} 
              variant={severityFilter === s ? "default" : "outline"} 
              className={`cursor-pointer uppercase text-xs font-bold ${severityFilter === s ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}
              onClick={() => setSeverityFilter(s)}
            >
              {s}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          [1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full bg-card/50 rounded-xl" />)
        ) : (
          findings?.filter(f => search === "" || f.attackName?.toLowerCase().includes(search.toLowerCase())).map((finding) => (
            <FindingRow key={finding.id} finding={finding} />
          ))
        )}
        
        {findings?.length === 0 && !isLoading && (
          <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
            <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No findings match your current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FindingRow({ finding }: { finding: any }) {
  const [open, setOpen] = useState(false);
  
  const borderColors: Record<string, string> = {
    critical: "border-l-red-500",
    high: "border-l-amber-500",
    medium: "border-l-yellow-500",
    low: "border-l-emerald-500",
  };
  
  return (
    <Card className={`bg-card/50 border-border overflow-hidden border-l-4 ${borderColors[finding.severity] || 'border-l-muted'}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 gap-4 cursor-pointer hover:bg-muted/10 transition-colors" onClick={() => setOpen(!open)}>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <SeverityBadge severity={finding.severity} />
            <span className="font-mono font-semibold text-foreground">{finding.attackName || finding.attackId}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {formatDistanceToNow(new Date(finding.createdAt), { addSuffix: true })}</span>
            <Link href={`/resources/${finding.resourceId}`} className="hover:text-primary transition-colors hover:underline">
              Resource ID: {finding.resourceId}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-6 w-full sm:w-auto">
          <div className="flex flex-col items-end">
             <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Risk Score</span>
             <span className="text-xl font-mono font-bold">{finding.riskScore}</span>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>
      
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleContent className="border-t border-border bg-background/30 p-4 space-y-4">
           {finding.findings && finding.findings.length > 0 && (
             <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center"><ShieldAlert className="w-4 h-4 mr-2" /> Identified Vulnerabilities</h4>
                <ul className="list-disc pl-5 text-sm space-y-1 text-red-400">
                  {finding.findings.map((f: string, i: number) => <li key={i}>{f}</li>)}
                </ul>
             </div>
           )}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Prompt Sent</h4>
                <div className="bg-muted/50 border border-border p-3 rounded font-mono text-sm text-foreground/90 whitespace-pre-wrap">
                  {finding.prompt}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Agent Response</h4>
                <div className="bg-muted/50 border border-border p-3 rounded font-mono text-sm text-foreground/90 whitespace-pre-wrap">
                  {finding.response}
                </div>
              </div>
           </div>
           <div className="flex justify-end pt-2">
              <Link href={`/scans/${finding.id}`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-colors">
                  View Full Scan context
                </Badge>
              </Link>
           </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}