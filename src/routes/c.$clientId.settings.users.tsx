import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, UserPlus } from "lucide-react";
import type { AppRole } from "@/lib/db-types";
import { toast } from "sonner";

export const Route = createFileRoute("/c/$clientId/settings/users")({ component: UsersPage });

interface MemberRow { id: string; user_id: string; role: AppRole; created_at: string | null; }

function UsersPage() {
  const { clientId } = Route.useParams();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("user");
  const [busy, setBusy] = useState(false);

  const load = () => supabase.from("client_members").select("*").eq("client_id", clientId).then(({ data }) => setMembers((data ?? []) as MemberRow[]));
  useEffect(load, [clientId]);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("invite-user", { body: { email, client_id: clientId, role } });
    setBusy(false);
    if (error || (data as { error?: string })?.error) {
      toast.error(error?.message ?? (data as { error?: string })?.error ?? "Failed to invite");
      return;
    }
    toast.success(`${email} added`);
    setOpen(false); setEmail("");
    load();
  }

  async function changeRole(id: string, newRole: AppRole) {
    const { error } = await supabase.from("client_members").update({ role: newRole }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Role updated"); load(); }
  }

  async function removeMember(id: string) {
    const { error } = await supabase.from("client_members").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removed"); load(); }
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Users & Permissions</h1><p className="text-sm text-muted-foreground">Invite teammates and assign their role.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><UserPlus className="mr-1.5 h-4 w-4" />Invite member</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite member</DialogTitle></DialogHeader>
            <form onSubmit={invite} className="space-y-3">
              <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client_admin">Client Admin</SelectItem>
                    <SelectItem value="user">Standard User</SelectItem>
                    <SelectItem value="viewer">Read-Only Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Inviting…" : "Send invite"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle>Members ({members.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>User ID</TableHead><TableHead>Role</TableHead><TableHead>Joined</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.user_id.slice(0, 12)}…</TableCell>
                  <TableCell>
                    <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as AppRole)}>
                      <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client_admin">Client Admin</SelectItem>
                        <SelectItem value="user">Standard User</SelectItem>
                        <SelectItem value="viewer">Read-Only Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => removeMember(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No members.</TableCell></TableRow>}
            </TableBody>
          </Table>
          <Badge variant="secondary" className="mt-4">Invited users receive immediate access. Share their email's password reset link to let them set their own password.</Badge>
        </CardContent>
      </Card>
    </AppShell>
  );
}
