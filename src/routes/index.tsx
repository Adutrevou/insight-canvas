import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Database, Shield, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center justify-between border-b px-6 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight">Pulse</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-6 py-20 text-center lg:py-32">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" /> White-label business intelligence
        </div>
        <h1 className="mt-6 text-5xl font-bold tracking-tight lg:text-6xl">
          Configurable dashboards for <span className="text-primary">every client</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Upload any company database, map fields, build custom metrics, and ship a fully branded analytics dashboard — all from one platform.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" asChild>
            <Link to="/auth">
              Start building <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-20 grid gap-6 text-left md:grid-cols-3">
          {[
            { icon: Database, title: "Bring your data", body: "Upload CSV/Excel or connect manually. Map columns to business labels." },
            { icon: Sparkles, title: "Build any metric", body: "Choose aggregation, format, target and chart — no formulas required." },
            { icon: Shield, title: "Multi-tenant by design", body: "Roles, RLS isolation and per-client branding built in from day one." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border bg-card p-6">
              <Icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-semibold">{title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{body}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
