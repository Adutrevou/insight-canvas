import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, Plug } from "lucide-react";
import type { DataSource } from "@/lib/db-types";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/c/$clientId/data-sources")({ component: DataSourcesPage });

function DataSourcesPage() {
  const { clientId } = Route.useParams();
  const { user } = useAuth();
  const [sources, setSources] = useState<DataSource[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => supabase.from("data_sources").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).then(({ data }) => setSources((data ?? []) as DataSource[]));
  useEffect(load, [clientId]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    let rows: Record<string, unknown>[] = [];
    let headers: string[] = [];
    if (ext === "csv") {
      const text = await file.text();
      const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
      rows = parsed.data;
      headers = parsed.meta.fields ?? [];
    } else if (ext === "xlsx" || ext === "xls") {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet);
      headers = Object.keys(rows[0] ?? {});
    } else {
      return toast.error("Unsupported file type");
    }
    const schema = headers.map((h) => ({ name: h, type: "text" }));
    const { data: ds, error } = await supabase
      .from("data_sources")
      .insert({ client_id: clientId, name: file.name, type: ext === "csv" ? "csv" : "xlsx", schema_json: schema, row_count: rows.length, created_by: user.id })
      .select().single();
    if (error || !ds) return toast.error(error?.message ?? "Upload failed");
    const dataRows = rows.map((r, i) => ({ data_source_id: ds.id, row_index: i, row_data: r as never }));
    for (let i = 0; i < dataRows.length; i += 200) {
      await supabase.from("data_rows").insert(dataRows.slice(i, i + 200));
    }
    const mappings = headers.map((h) => ({ data_source_id: ds.id, source_field: h, label: h, field_type: "text" as const }));
    await supabase.from("field_mappings").insert(mappings);
    toast.success(`Imported ${rows.length} rows`);
    load();
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Sources</h1>
          <p className="text-sm text-muted-foreground">Upload CSV/Excel files. Map fields from each source individually.</p>
        </div>
        <Button onClick={() => fileRef.current?.click()}>
          <Upload className="mr-1.5 h-4 w-4" /> Upload file
        </Button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFile} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-4"><FileSpreadsheet className="h-5 w-5 text-primary" /><div><div className="font-medium text-sm">CSV / Excel</div><div className="text-xs text-muted-foreground">Drag & drop supported</div></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4 opacity-60"><Plug className="h-5 w-5" /><div><div className="font-medium text-sm">API connection</div><div className="text-xs text-muted-foreground">Coming soon</div></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4 opacity-60"><Plug className="h-5 w-5" /><div><div className="font-medium text-sm">Google Sheets</div><div className="text-xs text-muted-foreground">Coming soon</div></div></CardContent></Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Sources ({sources.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Rows</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {sources.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="uppercase text-xs">{s.type}</TableCell>
                  <TableCell>{s.row_count}</TableCell>
                  <TableCell>{s.status}</TableCell>
                </TableRow>
              ))}
              {sources.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No sources uploaded yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
