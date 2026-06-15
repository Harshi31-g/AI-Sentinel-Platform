import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";

import Dashboard from "@/pages/dashboard";
import ResourcesList from "@/pages/resources/index";
import ResourceDetail from "@/pages/resources/detail";
import ScanDetail from "@/pages/scans/detail";
import FindingsList from "@/pages/findings";
import ActivityFeed from "@/pages/activity";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/resources" component={ResourcesList} />
        <Route path="/resources/:id" component={ResourceDetail} />
        <Route path="/scans/:id" component={ScanDetail} />
        <Route path="/findings" component={FindingsList} />
        <Route path="/activity" component={ActivityFeed} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster theme="dark" position="bottom-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
