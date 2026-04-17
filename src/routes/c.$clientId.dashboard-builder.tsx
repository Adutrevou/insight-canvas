import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/c/$clientId/dashboard-builder")({ component: () => (
  <AppShell>
    <div className="mb-6"><h1 className="text-2xl font-bold">Dashboard Builder</h1><p className="text-sm text-muted-foreground">Compose your dashboard from saved metrics.</p></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Coming soon</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">The current Overview already renders all metrics. Drag-and-drop layout customization is on the way — for now, every metric you create automatically appears on Overview.</CardContent>
    </Card>
  </AppShell>
)});
