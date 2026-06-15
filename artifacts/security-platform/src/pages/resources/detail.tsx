import { useParams, useLocation } from "wouter";
import { 
  useGetResource, getGetResourceQueryKey, 
  useValidateResource, 
  useStartScan,
  useListScans,
  useGetResourceActivity
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, ShieldAlert, Play, ArrowLeft, Activity, TerminalSquare, Settings2, AlertTriangle, ChevronDown } from "lucide-react";
import { SeverityBadge } from "@/components/SeverityBadge";
import { RiskLevelBadge } from "@/components/RiskLevelBadge";
import { formatDistanceToNow, format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

export default function ResourceDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const resourceId = parseInt(id || "0", 10);

  const { data: resource, isLoading } = useGetResource(resourceId, { 
    query: { enabled: !!resourceId, queryKey: getGetResourceQueryKey(resourceId) } 
  });

  const { data: scans } = useListScans(resourceId, {
    query: { enabled: !!resourceId }
  });

  const { data: activity } = useGetResourceActivity(resourceId, {
    query: { enabled: !!resourceId }
  });

  const validateMutation = useValidateResource();
  const scanMutation = useStartScan();

  const handleValidate = () => {
    validateMutation.mutate({ id: resourceId }, {
      onSuccess: (data) => {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: getGetResourceQueryKey(resourceId) });
      },
      onError: () => toast.error("Validation failed")
    });
  };

  const handleScan = () => {
    scanMutation.mutate({ id: resourceId, data: {} }, {
      onSuccess: (data) => {
        toast.success("Scan initiated");
        setLocation(`/scans/${data.jobId}`);
      },
      onError: () => toast.error("Failed to start scan")
    });
  };

  if (isLoading || !resource) {
    return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 text-muted-foreground mb-2">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/resources')} className="p-0 h-auto hover:bg-transparent hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Resources
        </Button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/50 p-6 rounded-xl border border-border">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{resource.resourceName}</h1>
            {resource.validationStatus === 'valid' ? (
              <span className="flex items-center text-xs font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20"><ShieldCheck className="w-3 h-3 mr-1" /> Valid</span>
            ) : (
              <span className="flex items-center text-xs font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">Pending Validation</span>
            )}
          </div>
          <p className="text-muted-foreground font-mono text-sm">{resource.accountName}</p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleValidate} disabled={validateMutation.isPending} className="border-border">
            {validateMutation.isPending ? "Validating..." : "Validate Connection"}
          </Button>
          <Button onClick={handleScan} disabled={scanMutation.isPending || resource.validationStatus !== 'valid'} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Play className="mr-2 h-4 w-4 fill-current" /> Run Security Scan
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted/30 border-b border-border w-full justify-start rounded-none h-12 p-0">
          <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">Overview</TabsTrigger>
          <TabsTrigger value="scans" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">Scan History</TabsTrigger>
          <TabsTrigger value="findings" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">Findings</TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">Activity</TabsTrigger>
          <TabsTrigger value="config" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">Configuration</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview" className="space-y-6 m-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-card/50 border-border">
                <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
                  <div className="text-5xl font-bold mb-2 text-foreground">
                    {resource.securityScore || '--'}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Security Score</div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 border-border">
                <CardContent className="pt-6">
                  <div className="text-sm font-medium text-muted-foreground mb-4">Risk Level</div>
                  <RiskLevelBadge level={resource.riskLevel} className="text-sm px-3 py-1" />
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border">
                <CardContent className="pt-6">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Total Findings</div>
                  <div className="text-3xl font-bold text-foreground">{resource.totalFindings || 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border">
                <CardContent className="pt-6">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Avg Latency</div>
                  <div className="text-3xl font-bold text-foreground">{resource.avgLatencyMs || 0}<span className="text-lg text-muted-foreground ml-1">ms</span></div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle>Recent Findings Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground bg-muted/10 rounded-lg border border-border/50 border-dashed">
                  Charts rendering area (Findings by severity)
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scans" className="m-0 space-y-4">
            {scans?.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">No scans have been run yet.</div>
            ) : (
              <div className="space-y-3">
                {scans?.map(scan => (
                  <ScanResultRow key={scan.id} scan={scan} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="findings" className="m-0">
             <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">Detailed findings view.</div>
          </TabsContent>

          <TabsContent value="activity" className="m-0 space-y-4">
            <div className="space-y-4">
              {activity?.map(item => (
                <div key={item.id} className="flex gap-4 items-start p-4 bg-card/50 rounded-lg border border-border">
                  <Activity className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{item.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(item.createdAt), 'MMM d, yyyy HH:mm:ss')}</p>
                  </div>
                  {item.severity && <SeverityBadge severity={item.severity} />}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="config" className="m-0">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5" /> Resource Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Resource ID</p>
                    <p className="font-mono bg-muted/30 p-2 rounded border border-border">{resource.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Created At</p>
                    <p className="bg-muted/30 p-2 rounded border border-border">{format(new Date(resource.createdAt), 'PPpp')}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Webhook ID</p>
                    <p className="font-mono bg-muted/30 p-2 rounded border border-border">{resource.webhookId}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground mb-1">User ID</p>
                    <p className="font-mono bg-muted/30 p-2 rounded border border-border">{resource.userId}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                    <p className="bg-muted/30 p-3 rounded border border-border min-h-[60px] text-sm">
                      {resource.description || "No description provided."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function ScanResultRow({ scan }: { scan: any }) {
  const [open, setOpen] = useState(false);
  
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="bg-card/50 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/10 transition-colors" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-4">
          <TerminalSquare className="text-muted-foreground h-5 w-5" />
          <div>
            <div className="font-medium text-foreground">{scan.attackName || scan.attackId}</div>
            <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })} • {scan.latencyMs}ms</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SeverityBadge severity={scan.severity} />
          <div className="font-mono font-bold text-sm w-12 text-right">{scan.riskScore}/100</div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>
      <CollapsibleContent className="border-t border-border/50 bg-background/50">
        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Prompt Sent</p>
            <div className="bg-muted/30 border border-border rounded-md p-3 font-mono text-sm text-foreground/90 whitespace-pre-wrap">
              {scan.prompt}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Agent Response</p>
            <div className="bg-muted/30 border border-border rounded-md p-3 font-mono text-sm text-foreground/90 whitespace-pre-wrap">
              {scan.response}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}