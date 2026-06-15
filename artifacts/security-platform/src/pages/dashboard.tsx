import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useGetDashboardSummary, useGetSecurityTrends, useGetVulnerabilityDistribution, useListActivity } from "@workspace/api-client-react";
import { Shield, Users, Activity, AlertTriangle, Zap, CheckCircle2, ShieldAlert } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { SeverityBadge } from "@/components/SeverityBadge";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: trends, isLoading: isLoadingTrends } = useGetSecurityTrends();
  const { data: dist, isLoading: isLoadingDist } = useGetVulnerabilityDistribution();
  const { data: activities, isLoading: isLoadingActivities } = useListActivity({ limit: 10 });

  const COLORS = ['#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (isLoadingSummary || !summary) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl bg-muted/50" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
        <p className="text-muted-foreground">Global security overview across all connected AI agents.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Security Score" value={summary.securityScore} icon={Shield} suffix="/ 100" />
        <MetricCard title="Connected Agents" value={summary.connectedAgents} icon={Users} />
        <MetricCard title="Active Scans" value={summary.activeScans} icon={Activity} />
        <MetricCard title="Total Findings" value={summary.totalFindings} icon={AlertTriangle} />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card/50 border-border">
          <CardHeader>
            <CardTitle>Security Score Trend</CardTitle>
            <CardDescription>14-day trailing average</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoadingTrends ? <Skeleton className="w-full h-full bg-muted/50" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends?.scoreHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                  <XAxis dataKey="date" stroke="#A1A1AA" tickFormatter={(v) => format(new Date(v), 'MMM d')} />
                  <YAxis stroke="#A1A1AA" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A', color: '#FAFAFA' }} />
                  <Line type="monotone" dataKey="value" stroke="#06B6D4" strokeWidth={3} dot={{ r: 4, fill: '#06B6D4' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-card/50 border-border">
          <CardHeader>
            <CardTitle>Vulnerability Distribution</CardTitle>
            <CardDescription>By category type</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {isLoadingDist ? <Skeleton className="w-full h-full bg-muted/50" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dist} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="count" nameKey="category">
                    {dist?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A', color: '#FAFAFA' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
         <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingActivities ? <Skeleton className="w-full h-[400px] bg-muted/50" /> : (
              <div className="space-y-4">
                {activities?.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className={`mt-0.5 rounded-full p-1.5 ${
                      activity.eventType.includes('scan') ? 'bg-primary/20 text-primary' : 
                      activity.eventType.includes('finding') ? 'bg-red-500/20 text-red-500' : 
                      'bg-emerald-500/20 text-emerald-500'
                    }`}>
                      {activity.eventType.includes('scan') ? <Activity className="h-4 w-4" /> : 
                       activity.eventType.includes('finding') ? <ShieldAlert className="h-4 w-4" /> : 
                       <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
                        {activity.resourceName && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{activity.resourceName}</span>
                          </>
                        )}
                        {activity.severity && (
                          <>
                            <span>•</span>
                            <SeverityBadge severity={activity.severity} />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle>Scan Volume</CardTitle>
            <CardDescription>Scans executed per day</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {isLoadingTrends ? <Skeleton className="w-full h-full bg-muted/50" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends?.scanVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                  <XAxis dataKey="date" stroke="#A1A1AA" tickFormatter={(v) => format(new Date(v), 'MMM d')} />
                  <YAxis stroke="#A1A1AA" />
                  <Tooltip contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A', color: '#FAFAFA' }} />
                  <Bar dataKey="value" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, suffix }: { title: string, value: string | number, icon: any, suffix?: string }) {
  return (
    <Card className="bg-card/50 border-border overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">
          {value}{suffix && <span className="text-lg text-muted-foreground font-normal ml-1">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}