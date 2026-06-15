import { useGetSecurityTrends, useGetVulnerabilityDistribution, useGetDashboardSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import { format } from "date-fns";

export default function Analytics() {
  const { data: trends, isLoading: isLoadingTrends } = useGetSecurityTrends();
  const { data: dist, isLoading: isLoadingDist } = useGetVulnerabilityDistribution();
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();

  const COLORS = ['#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Deep dive into security posture and trends.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {isLoadingSummary ? (
          [1,2,3,4].map(i => <Skeleton key={i} className="h-24 bg-card/50 rounded-xl" />)
        ) : (
          <>
            <StatsCard title="Global Success Rate" value={`${summary?.successRate || 0}%`} />
            <StatsCard title="Critical Findings" value={summary?.criticalCount || 0} className="text-red-500" />
            <StatsCard title="High Findings" value={summary?.highCount || 0} className="text-amber-500" />
            <StatsCard title="Total Scans" value={summary?.activeScans || 0} />
          </>
        )}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle>Security Score History</CardTitle>
            <CardDescription>Daily average across all agents</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoadingTrends ? <Skeleton className="w-full h-full bg-muted/50" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends?.scoreHistory}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                  <XAxis dataKey="date" stroke="#A1A1AA" tickFormatter={(v) => format(new Date(v), 'MMM d')} />
                  <YAxis stroke="#A1A1AA" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A', color: '#FAFAFA' }} />
                  <Area type="monotone" dataKey="value" stroke="#06B6D4" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle>Vulnerability Distribution</CardTitle>
            <CardDescription>By category type</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoadingDist ? <Skeleton className="w-full h-full bg-muted/50" /> : (
              <div className="flex h-full items-center">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie data={dist} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="count" nameKey="category">
                      {dist?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A', color: '#FAFAFA' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-[40%] space-y-3">
                  {dist?.map((item, i) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm font-medium">{item.category}</span>
                      </div>
                      <span className="text-sm text-muted-foreground font-mono">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle>Scan Volume</CardTitle>
            <CardDescription>Number of scans executed</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoadingTrends ? <Skeleton className="w-full h-full bg-muted/50" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends?.scanVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                  <XAxis dataKey="date" stroke="#A1A1AA" tickFormatter={(v) => format(new Date(v), 'MMM d')} />
                  <YAxis stroke="#A1A1AA" />
                  <Tooltip contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A', color: '#FAFAFA' }} />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle>Average Latency</CardTitle>
            <CardDescription>Response time in milliseconds</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             {isLoadingTrends ? <Skeleton className="w-full h-full bg-muted/50" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends?.latencyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                  <XAxis dataKey="date" stroke="#A1A1AA" tickFormatter={(v) => format(new Date(v), 'MMM d')} />
                  <YAxis stroke="#A1A1AA" />
                  <Tooltip contentStyle={{ backgroundColor: '#18181B', borderColor: '#27272A', color: '#FAFAFA' }} />
                  <Line type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, className }: { title: string, value: string | number, className?: string }) {
  return (
    <Card className="bg-card/50 border-border">
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
        <p className={`text-3xl font-bold font-mono ${className || 'text-foreground'}`}>{value}</p>
      </CardContent>
    </Card>
  );
}