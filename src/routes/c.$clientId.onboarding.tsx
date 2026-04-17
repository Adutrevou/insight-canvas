import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, Database, GaugeCircle, LayoutDashboard, Palette, Wand2 } from "lucide-react";

export const Route = createFileRoute("/c/$clientId/onboarding")({ component: Onboarding });

function Onboarding() {
  const { clientId } = Route.useParams();
  const steps = [
    { icon: Palette, title: "Brand your workspace", desc: "Logo, colors, and dashboard name.", to: `/c/${clientId}/settings/branding` },
    { icon: Database, title: "Upload data sources", desc: "Bring in CSV or Excel files.", to: `/c/${clientId}/data-sources` },
    { icon: GaugeCircle, title: "Build metrics", desc: "Define your KPIs.", to: `/c/${clientId}/metrics` },
    { icon: Wand2, title: "Submit manual updates", desc: "Enter values for individual metrics.", to: `/c/${clientId}/updates` },
    { icon: LayoutDashboard, title: "View your dashboard", desc: "See everything come together.", to: `/c/${clientId}/overview` },
  ];
  return (
    <AppShell>
      <div className="mb-6"><h1 className="text-2xl font-bold">Setup wizard</h1><p className="text-sm text-muted-foreground">Five quick steps to get fully configured.</p></div>
      <div className="space-y-3">
        {steps.map((s, i) => (
          <Link key={s.title} to={s.to}>
            <Card className="transition hover:border-primary hover:shadow-sm">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><s.icon className="h-4 w-4" /></div>
                <div className="flex-1"><div className="font-medium">Step {i + 1} · {s.title}</div><div className="text-sm text-muted-foreground">{s.desc}</div></div>
                {i === 0 ? <Circle className="h-4 w-4 text-muted-foreground" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
