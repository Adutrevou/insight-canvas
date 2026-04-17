import { supabase } from "@/integrations/supabase/client";
import { slugify } from "./format";

const METRIC_DEFS = [
  { name: "Revenue", format: "currency", target: 120000, agg: "sum", chart: "kpi" },
  { name: "Cost", format: "currency", target: 80000, agg: "sum", chart: "kpi" },
  { name: "Units Sold", format: "number", target: 5000, agg: "sum", chart: "bar" },
  { name: "Conversion Rate", format: "percentage", target: 0.12, agg: "avg", chart: "line" },
  { name: "Tasks Completed", format: "number", target: 200, agg: "sum", chart: "bar" },
  { name: "Staff Count", format: "number", target: 50, agg: "avg", chart: "kpi" },
  { name: "Compliance Score", format: "percentage", target: 0.95, agg: "avg", chart: "line" },
  { name: "Customer Satisfaction", format: "percentage", target: 0.9, agg: "avg", chart: "line" },
  { name: "Target Achievement", format: "percentage", target: 1.0, agg: "avg", chart: "kpi" },
  { name: "Incident Count", format: "number", target: 5, agg: "sum", chart: "bar" },
];
const CATEGORIES = ["North", "South", "Central"];

export async function seedDemoClient(userId: string) {
  const slug = slugify(`demo-${Date.now().toString(36)}`);
  const { data: client, error } = await supabase
    .from("clients")
    .insert({ name: "Demo Company", slug, brand_color: "#6366f1", industry: "General", created_by: userId })
    .select()
    .single();
  if (error || !client) throw error;

  await supabase.from("client_members").insert({ client_id: client.id, user_id: userId, role: "client_admin" });

  // metrics
  const metricRows = METRIC_DEFS.map((m) => ({
    client_id: client.id,
    name: m.name,
    module: "general",
    field: m.name.toLowerCase().replace(/ /g, "_"),
    aggregation: m.agg,
    format: m.format,
    target: m.target,
    chart_type: m.chart,
    created_by: userId,
  }));
  const { data: metrics } = await supabase.from("metrics").insert(metricRows).select();

  // 12 months × 3 categories of manual updates per metric
  if (metrics) {
    const updates: Array<Record<string, unknown>> = [];
    const now = new Date();
    for (const m of metrics) {
      const def = METRIC_DEFS.find((d) => d.name === m.name)!;
      for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
        const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
        for (const cat of CATEGORIES) {
          const noise = 0.7 + Math.random() * 0.6;
          const trend = 1 + (11 - monthsAgo) * 0.02;
          const v = (def.target / CATEGORIES.length) * noise * trend;
          updates.push({
            client_id: client.id,
            metric_id: m.id,
            value: def.format === "percentage" ? Math.min(1, v) : Math.round(v),
            period: d.toISOString().slice(0, 10),
            category: cat,
            user_id: userId,
          });
        }
      }
    }
    // chunk insert
    for (let i = 0; i < updates.length; i += 200) {
      await supabase.from("manual_updates").insert(updates.slice(i, i + 200));
    }
  }

  // default dashboard with all KPIs + a few charts
  const { data: dashboard } = await supabase
    .from("dashboards")
    .insert({ client_id: client.id, name: "Main Dashboard", is_default: true, created_by: userId })
    .select()
    .single();
  if (dashboard && metrics) {
    const widgets = metrics.map((m, i) => ({
      dashboard_id: dashboard.id,
      metric_id: m.id,
      widget_type: i < 4 ? "kpi" : i < 7 ? "line" : "bar",
      position: i,
    }));
    await supabase.from("dashboard_widgets").insert(widgets);
  }

  return client;
}
