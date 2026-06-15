import { useListAttackTemplates, useHealthCheck } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, Shield, Key } from "lucide-react";

export default function Settings() {
  const { data: templates, isLoading } = useListAttackTemplates();
  const { data: health } = useHealthCheck();

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings & Configuration</h1>
        <p className="text-muted-foreground">Manage platform settings and view attack templates.</p>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="bg-muted/30 border-b border-border w-full justify-start rounded-none h-12 p-0 mb-6">
          <TabsTrigger value="templates" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">Attack Templates</TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">System Health</TabsTrigger>
          <TabsTrigger value="api" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 h-full font-medium">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Standard Attack Library</h2>
            <p className="text-sm text-muted-foreground">8 active templates</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoading ? (
              [1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 bg-card/50 rounded-xl" />)
            ) : templates?.map(template => (
              <Card key={template.id} className="bg-card/50 border-border flex flex-col hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <SeverityBadge severity={template.severity} />
                    <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">{template.category}</span>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <div className="bg-muted/30 p-3 rounded border border-border/50">
                    <p className="text-xs font-mono text-muted-foreground line-clamp-3 leading-relaxed">
                      {template.prompt}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card className="bg-card/50 border-border max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Server className="w-5 h-5" /> API Server Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${health?.status === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="font-medium text-foreground">Core Services</span>
                </div>
                <span className="font-mono text-sm">{health?.status === 'ok' ? 'Operational' : 'Degraded'}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card className="bg-card/50 border-border max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> Global API Keys</CardTitle>
              <CardDescription>Manage keys used for authenticating with the SentinelAI API.</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8 text-muted-foreground">
              API Key management is restricted to organization admins.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}