import { useState } from "react";
import { Link } from "wouter";
import { useListResources, useDeleteResource, getListResourcesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Trash2, ArrowRight, ShieldCheck, ShieldAlert, Shield, Clock } from "lucide-react";
import { RiskLevelBadge } from "@/components/RiskLevelBadge";
import { formatDistanceToNow } from "date-fns";
import { AddResourceDialog } from "./add-resource-dialog";

export default function ResourcesList() {
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { data: resources, isLoading } = useListResources();
  const deleteResource = useDeleteResource();
  const queryClient = useQueryClient();

  const filteredResources = resources?.filter(r => 
    r.resourceName.toLowerCase().includes(search.toLowerCase()) || 
    r.accountName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">AI Resources</h1>
          <p className="text-muted-foreground">Manage and monitor connected AI agents.</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Add Resource
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or account..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/30 border-border" 
          />
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          [1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl bg-card border border-border" />)
        ) : filteredResources?.map((resource) => (
          <Card key={resource.id} className="bg-card/50 border-border flex flex-col hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">{resource.accountName}</div>
                  <CardTitle className="text-xl font-bold text-foreground">{resource.resourceName}</CardTitle>
                </div>
                <StatusBadge status={resource.validationStatus} />
              </div>
            </CardHeader>
            <CardContent className="pb-4 flex-1">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Shield className="w-4 h-4" /> Security Score</span>
                <span className={`font-mono font-bold ${resource.securityScore && resource.securityScore > 80 ? 'text-emerald-500' : resource.securityScore && resource.securityScore > 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {resource.securityScore || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Risk Level</span>
                <RiskLevelBadge level={resource.riskLevel} />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Last Scan</span>
                <span className="text-sm font-medium">
                  {resource.lastScanAt ? formatDistanceToNow(new Date(resource.lastScanAt), { addSuffix: true }) : 'Never'}
                </span>
              </div>
            </CardContent>
            <CardFooter className="pt-0 flex gap-2">
              <Link href={`/resources/${resource.id}`} className="flex-1">
                <Button variant="secondary" className="w-full">View Details <ArrowRight className="ml-2 w-4 h-4" /></Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      <AddResourceDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'valid') return <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/50 hover:bg-emerald-500/30 font-bold uppercase text-[10px] tracking-wider"><ShieldCheck className="w-3 h-3 mr-1" /> VALID</Badge>;
  if (status === 'invalid') return <Badge className="bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30 font-bold uppercase text-[10px] tracking-wider"><ShieldAlert className="w-3 h-3 mr-1" /> INVALID</Badge>;
  return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/50 hover:bg-amber-500/30 font-bold uppercase text-[10px] tracking-wider">PENDING</Badge>;
}