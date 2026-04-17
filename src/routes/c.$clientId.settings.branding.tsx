import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import type { Client } from "@/lib/db-types";
import { toast } from "sonner";

export const Route = createFileRoute("/c/$clientId/settings/branding")({ component: BrandingPage });

function BrandingPage() {
  const { clientId } = Route.useParams();
  const [client, setClient] = useState<Client | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { supabase.from("clients").select("*").eq("id", clientId).maybeSingle().then(({ data }) => setClient(data as Client)); }, [clientId]);

  async function save() {
    if (!client) return;
    const { error } = await supabase.from("clients").update({
      name: client.name, dashboard_name: client.dashboard_name, brand_color: client.brand_color, industry: client.industry,
    }).eq("id", clientId);
    if (error) toast.error(error.message); else toast.success("Saved");
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !client) return;
    const path = `${clientId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("client-logos").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("client-logos").getPublicUrl(path);
    await supabase.from("clients").update({ logo_url: data.publicUrl }).eq("id", clientId);
    setClient({ ...client, logo_url: data.publicUrl });
    toast.success("Logo updated");
  }

  if (!client) return <AppShell><div>Loading…</div></AppShell>;

  return (
    <AppShell>
      <div className="mb-6"><h1 className="text-2xl font-bold">Branding</h1><p className="text-sm text-muted-foreground">Make this workspace yours.</p></div>
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Workspace</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {client.logo_url ? <img src={client.logo_url} className="h-16 w-16 rounded-lg object-cover" alt="" /> : <div className="h-16 w-16 rounded-lg" style={{ background: client.brand_color ?? "#6366f1" }} />}
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-1.5 h-4 w-4" />Upload logo</Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
          </div>
          <div><Label>Company name</Label><Input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} /></div>
          <div><Label>Dashboard name (optional)</Label><Input value={client.dashboard_name ?? ""} onChange={(e) => setClient({ ...client, dashboard_name: e.target.value })} /></div>
          <div><Label>Industry</Label><Input value={client.industry ?? ""} onChange={(e) => setClient({ ...client, industry: e.target.value })} /></div>
          <div><Label>Brand color</Label><Input type="color" value={client.brand_color ?? "#6366f1"} onChange={(e) => setClient({ ...client, brand_color: e.target.value })} /></div>
          <Button onClick={save}>Save changes</Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
