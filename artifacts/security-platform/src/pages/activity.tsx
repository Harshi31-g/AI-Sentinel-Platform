import { useListActivity } from "@workspace/api-client-react";
import { formatDistanceToNow, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Activity, ShieldAlert, ShieldCheck, Play, Trash2, Edit, UserPlus, Info } from "lucide-react";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Link } from "wouter";

export default function ActivityFeed() {
  const { data: activities, isLoading } = useListActivity({ limit: 100 });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 max-w-4xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Activity Feed</h1>
        <p className="text-muted-foreground">Global timeline of all events across the platform.</p>
      </div>

      <div className="relative border-l border-border/50 ml-4 pl-8 space-y-6 mt-8">
        {isLoading ? (
          [1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 w-full bg-card/50 rounded-lg" />)
        ) : activities?.map((activity) => {
          let Icon = Info;
          let iconColor = "bg-muted text-muted-foreground border-muted-foreground/20";
          
          if (activity.eventType.includes('scan')) {
             Icon = Play;
             iconColor = "bg-primary/20 text-primary border-primary/30";
          } else if (activity.eventType.includes('finding')) {
             Icon = ShieldAlert;
             iconColor = "bg-red-500/20 text-red-500 border-red-500/30";
          } else if (activity.eventType.includes('valid')) {
             Icon = ShieldCheck;
             iconColor = "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
          }

          return (
            <div key={activity.id} className="relative">
              <div className={`absolute -left-12 top-2 h-8 w-8 rounded-full border flex items-center justify-center ${iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
              <Card className="bg-card/50 border-border p-4 hover:border-primary/30 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between gap-2 sm:items-center mb-2">
                   <div className="font-semibold text-foreground">{activity.message}</div>
                   <div className="text-xs text-muted-foreground whitespace-nowrap">
                     {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                   </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{format(new Date(activity.createdAt), 'MMM d, yyyy HH:mm:ss')}</span>
                  {activity.resourceName && (
                    <>
                      <span>•</span>
                      <Link href={`/resources/${activity.resourceId}`} className="font-mono hover:text-primary transition-colors cursor-pointer underline decoration-muted-foreground/30 underline-offset-2">
                        {activity.resourceName}
                      </Link>
                    </>
                  )}
                  {activity.severity && (
                    <>
                      <span>•</span>
                      <SeverityBadge severity={activity.severity} />
                    </>
                  )}
                </div>
              </Card>
            </div>
          );
        })}

        {activities?.length === 0 && !isLoading && (
          <div className="text-muted-foreground py-8">No activity recorded yet.</div>
        )}
      </div>
    </div>
  );
}