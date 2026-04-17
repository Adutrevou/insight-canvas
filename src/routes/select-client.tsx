import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Sparkles, Building2, ArrowRight } from "lucide-react";
import type { Client } from "@/lib/db-types";
import { seedDemoClient } from "@/lib/seed";
import { toast } from "sonner";

export const Route = createFileRoute("/select-client")({
  component: SelectClient,
});

function SelectClient() {
  const router = useRouter();
  const { user, loading, isSuperAdmin } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.navigate({ to: "/auth" });
      return;
    }
    supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setClients((data ?? []) as Client[]));
  }, [user, loading, router]);

  const handleSeed = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const c = await seedDemoClient(user.id);
      toast.success("Demo client created!");
      router.navigate({ to: "/c/$clientId/overview", params: { clientId: c.id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Choose a workspace</h1>
          <p className="mt-1 text-muted-foreground">Pick a client to manage, or create a new one.</p>
        </div>

        <div className="space-y-3">
          {clients.map((c) => (
            <Link key={c.id} to="/c/$clientId/overview" params={{ clientId: c.id }}>
              <Card className="transition hover:border-primary hover:shadow-md">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                        style={{ background: c.brand_color ?? "#6366f1" }}
                      >
                        <Building2 className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.industry || "Workspace"}</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}

          {clients.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
                <div className="mt-3 font-medium">No workspaces yet</div>
                <p className="mt-1 text-sm text-muted-foreground">Get started with a demo workspace pre-loaded with sample metrics.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {isSuperAdmin && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={handleSeed} disabled={busy} variant="outline">
              <Sparkles className="mr-1.5 h-4 w-4" />
              {busy ? "Creating…" : "Create demo workspace"}
            </Button>
            <Button asChild>
              <Link to="/super-admin/clients">
                <Plus className="mr-1.5 h-4 w-4" /> Manage all clients
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
