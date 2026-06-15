import { useParams, useLocation } from "wouter";
import { useGetScan, getGetScanQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Clock, ShieldAlert, Zap, Search } from "lucide-react";
import { SeverityBadge } from "@/components/SeverityBadge";
import { formatDistanceToNow, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScanDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const scanId = parseInt(id || "0", 10);

  const { data: scan, isLoading } = useGetScan(scanId, {
    query: {
      enabled: !!scanId,
      queryKey: getGetScanQueryKey(scanId),
      refetchInterval: (query) => {
        // Poll every 2 seconds if the scan is not completed or failed
        const status = query.state.data?.status;
        return status && ['completed', 'failed', 'timeout'].includes(status) ? false : 2000;
      }
    }
  });

  const steps = [
    { id: 'init', label: 'Initializing', icon: Zap },
    { id: 'validate', label: 'Validating Target', icon: Search },
    { id: 'payload', label: 'Sending Payload', icon: Zap },
    { id: 'analyze', label: 'Analyzing Findings', icon: ShieldAlert },
    { id: 'complete', label: 'Completed', icon: CheckCircle2 }
  ];

  if (isLoading || !scan) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Derive current step (mock logic based on status)
  const isFinished = ['completed', 'failed', 'timeout'].includes(scan.status);
  
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 text-muted-foreground mb-2">
        <Button variant="ghost" size="sm" onClick={() => setLocation(`/resources/${scan.resourceId}`)} className="p-0 h-auto hover:bg-transparent hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Resource
        </Button>
      </div>

      <div className="flex justify-between items-center bg-card/50 p-6 rounded-xl border border-border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">Scan Details</h1>
          <p className="text-muted-foreground font-mono text-sm">Scan ID: {scan.id} • Started {formatDistanceToNow(new Date(scan.createdAt))} ago</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className={`font-bold uppercase tracking-wider ${
              scan.status === 'completed' ? 'text-emerald-500' :
              scan.status === 'failed' ? 'text-red-500' :
              scan.status === 'timeout' ? 'text-amber-500' : 'text-primary animate-pulse'
            }`}>
              {scan.status}
            </span>
          </div>
        </div>
      </div>

      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle>Scan Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center relative">
            <div className="absolute left-0 right-0 top-1/2 h-1 bg-muted/30 -translate-y-1/2 z-0" />
            {steps.map((step, index) => {
              const isPast = isFinished || index < 3; // Mocking progress
              const isCurrent = !isFinished && index === 3;
              const Icon = step.icon;
              
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isPast ? 'bg-primary border-primary text-primary-foreground' :
                    isCurrent ? 'bg-card border-primary text-primary animate-pulse' :
                    'bg-card border-border text-muted-foreground'
                  }`}>
                    {isCurrent ? <Loader2 className="w-6 h-6 animate-spin" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <span className={`text-sm font-medium ${isPast || isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {isFinished && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle>Result Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded border border-border">
                <span className="text-muted-foreground font-medium">Severity</span>
                <SeverityBadge severity={scan.severity} />
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded border border-border">
                <span className="text-muted-foreground font-medium">Risk Score</span>
                <span className={`font-mono font-bold ${scan.riskScore > 80 ? 'text-red-500' : scan.riskScore > 60 ? 'text-amber-500' : 'text-emerald-500'}`}>{scan.riskScore} / 100</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded border border-border">
                <span className="text-muted-foreground font-medium">Latency</span>
                <span className="font-mono">{scan.latencyMs || '--'} ms</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded border border-border">
                <span className="text-muted-foreground font-medium">Attack Vector</span>
                <span className="font-mono">{scan.attackName || scan.attackId}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle>Payload Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Prompt Sent</h3>
                  <div className="bg-muted/30 border border-border p-3 rounded font-mono text-sm text-foreground whitespace-pre-wrap">
                    {scan.prompt}
                  </div>
               </div>
               <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Agent Response</h3>
                  <div className="bg-muted/30 border border-border p-3 rounded font-mono text-sm text-foreground whitespace-pre-wrap">
                    {scan.response}
                  </div>
               </div>
               {scan.findings && scan.findings.length > 0 && (
                 <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center"><ShieldAlert className="w-4 h-4 mr-2" /> Identified Vulnerabilities</h3>
                    <ul className="list-disc pl-5 text-sm space-y-1 text-red-400">
                      {scan.findings.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
