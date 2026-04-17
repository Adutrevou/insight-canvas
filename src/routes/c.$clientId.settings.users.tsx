import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AppRole } from "@/lib/db-types";

export const Route = createFileRoute("/c/$clientId/settings/users")({ component: UsersPage });

interface MemberRow { id: string; user_id: string; role: AppRole; created_at: string | null; }

function UsersPage() {
  const { clientId } = Route.useParams();
  const [members, setMembers] = useState<MemberRow[]>([]);

  useEffect(() => {
    supabase.from("client_members").select("*").eq("client_id", clientId).then(({ data }) => setMembers((data ?? []) as MemberRow[]));
  }, [clientId]);

  return (
    <AppShell>
      <div className="mb-6"><h1 className="text-2xl font-bold">Users & Permissions</h1><p className="text-sm text-muted-foreground">Manage who has access to this workspace.</p></div>
      <Card>
        <CardHeader><CardTitle>Members ({members.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>User ID</TableHead><TableHead>Role</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.user_id.slice(0, 12)}…</TableCell>
                  <TableCell><Badge variant="secondary">{m.role}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-xs">{m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
              {members.length === 0 && <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No members.</TableCell></TableRow>}
            </TableBody>
          </Table>
          <p className="mt-4 text-xs text-muted-foreground">Email-based invitations are coming in the next iteration.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
