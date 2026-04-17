import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Save } from "lucide-react";
import type { DataSource, FieldMapping, FieldType, FieldFlags } from "@/lib/db-types";
import { toast } from "sonner";

export const Route = createFileRoute("/c/$clientId/data-sources/$sourceId")({ component: MappingPage });

const FIELD_TYPES: FieldType[] = ["number", "currency", "percentage", "text", "date", "category", "calculated"];

function MappingPage() {
  const { clientId, sourceId } = Route.useParams();
  const [source, setSource] = useState<DataSource | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);

  async function load() {
    const [{ data: ds }, { data: fm }, { data: rows }] = await Promise.all([
      supabase.from("data_sources").select("*").eq("id", sourceId).maybeSingle(),
      supabase.from("field_mappings").select("*").eq("data_source_id", sourceId).order("created_at"),
      supabase.from("data_rows").select("row_data").eq("data_source_id", sourceId).order("row_index").limit(20),
    ]);
    setSource(ds as DataSource);
    setMappings((fm ?? []) as FieldMapping[]);
    setPreview(((rows ?? []) as { row_data: Record<string, unknown> }[]).map((r) => r.row_data));
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sourceId]);

  function update(id: string, patch: Partial<FieldMapping>) {
    setMappings((cur) => cur.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function updateFlag(id: string, key: keyof FieldFlags, val: boolean) {
    setMappings((cur) =>
      cur.map((m) => (m.id === id ? { ...m, flags: { ...(m.flags as FieldFlags ?? {}), [key]: val } } : m)),
    );
  }

  async function saveAll() {
    const updates = mappings.map((m) =>
      supabase
        .from("field_mappings")
        .update({ label: m.label, field_type: m.field_type, module: m.module, flags: m.flags })
        .eq("id", m.id),
    );
    const results = await Promise.all(updates);
    const err = results.find((r) => r.error)?.error;
    if (err) toast.error(err.message); else toast.success("Mapping saved");
  }

  if (!source) return <AppShell><div>Loading…</div></AppShell>;

  return (
    <AppShell>
      <Button variant="ghost" size="sm" asChild className="mb-2">
        <Link to="/c/$clientId/data-sources" params={{ clientId }}><ArrowLeft className="mr-1.5 h-4 w-4" />Data sources</Link>
      </Button>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{source.name}</h1>
          <p className="text-sm text-muted-foreground">{source.row_count} rows · map fields, choose types, and set flags.</p>
        </div>
        <Button onClick={saveAll}><Save className="mr-1.5 h-4 w-4" />Save mapping</Button>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Field mapping</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source field</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Reportable</TableHead>
                <TableHead>Editable</TableHead>
                <TableHead>Chartable</TableHead>
                <TableHead>Exportable</TableHead>
                <TableHead>Alertable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((m) => {
                const flags = (m.flags as FieldFlags) ?? {};
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.source_field}</TableCell>
                    <TableCell><Input className="h-8 min-w-[140px]" value={m.label} onChange={(e) => update(m.id, { label: e.target.value })} /></TableCell>
                    <TableCell>
                      <Select value={m.field_type} onValueChange={(v) => update(m.id, { field_type: v as FieldType })}>
                        <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{FIELD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input className="h-8 w-[120px]" value={m.module ?? ""} onChange={(e) => update(m.id, { module: e.target.value })} /></TableCell>
                    {(["reportable", "editable", "chartable", "exportable", "alertable"] as const).map((k) => (
                      <TableCell key={k}><Checkbox checked={!!flags[k]} onCheckedChange={(v) => updateFlag(m.id, k, !!v)} /></TableCell>
                    ))}
                  </TableRow>
                );
              })}
              {mappings.length === 0 && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">No fields detected.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Preview (first {preview.length} rows)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>{mappings.map((m) => <TableHead key={m.id}>{m.label}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((row, i) => (
                <TableRow key={i}>
                  {mappings.map((m) => <TableCell key={m.id} className="text-xs">{String(row[m.source_field] ?? "")}</TableCell>)}
                </TableRow>
              ))}
              {preview.length === 0 && <TableRow><TableCell colSpan={mappings.length || 1} className="py-8 text-center text-muted-foreground">No rows.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
