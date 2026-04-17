import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, ArrowLeft, ExternalLink } from "lucide-react";
import { slugify } from "@/lib/format";
import type { Client } from "@/lib/db-types";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/clients")({
  component: SuperAdminClients,
});

function SuperAdminClients() {
  const router = useRouter();
  const { user, loading, isSuperAdmin } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [industry, setIndustry] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) router.navigate({ to: "/auth" });
    else if (!isSuperAdmin) router.navigate({ to: "/select-client" });
    else load();
  }, [user, loading, isSuperAdmin, router]);

  async function load() {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setClients((data ?? []) as Client[]);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { data, error } = await supabase
      .from("clients")
      .insert({ name, slug: slugify(name), brand_color: color, industry, created_by: user.id })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("client_members").insert({ client_id: data.id, user_id: user.id, role: "client_admin" });
    toast.success("Client created");
    setOpen(false);
    setName("");
    setIndustry("");
    load();
  }

  return (
    <div className="min-h-screen bg-muted/30 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2">
              <Link to="/select-client"><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Link>
            </Button>
            <h1 className="text-2xl font-bold">All Clients</h1>
            <p className="text-sm text-muted-foreground">Super admin · manage every workspace.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-1.5 h-4 w-4" />New client</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create a new client</DialogTitle></DialogHeader>
              <form onSubmit={onCreate} className="space-y-3">
                <div><Label>Company name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label>Industry (optional)</Label><Input value={industry} onChange={(e) => setIndustry(e.target.value)} /></div>
                <div><Label>Brand color</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></div>
                <DialogFooter><Button type="submit">Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle>Workspaces ({clients.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Industry</TableHead><TableHead>Created</TableHead><TableHead></TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded" style={{ background: c.brand_color ?? "#6366f1" }} />
                      <span className="font-medium">{c.name}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.industry || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(c.created_at!).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/c/$clientId/overview" params={{ clientId: c.id }}>Open <ExternalLink className="ml-1 h-3 w-3" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {clients.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No clients yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
