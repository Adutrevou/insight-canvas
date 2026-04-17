import { supabase } from "@/integrations/supabase/client";
import type { AlertRule, Metric } from "./db-types";

// Evaluate active alert rules for a metric after a manual update
// and insert notifications for the current user when triggered.
export async function evaluateAlertsForMetric(opts: {
  clientId: string;
  metricId: string;
  newValue: number;
  userId: string;
}) {
  const { clientId, metricId, newValue, userId } = opts;
  const [{ data: rules }, { data: metric }] = await Promise.all([
    supabase.from("alert_rules").select("*").eq("client_id", clientId).eq("metric_id", metricId).eq("active", true),
    supabase.from("metrics").select("*").eq("id", metricId).maybeSingle(),
  ]);
  const m = metric as Metric | null;
  if (!rules || !m) return [];

  const triggered: AlertRule[] = [];
  for (const r of rules as AlertRule[]) {
    let fire = false;
    let msg = "";
    if (r.condition === "above" && r.threshold != null && newValue > r.threshold) {
      fire = true;
      msg = `${m.name} (${newValue}) is above threshold ${r.threshold}.`;
    } else if (r.condition === "below" && r.threshold != null && newValue < r.threshold) {
      fire = true;
      msg = `${m.name} (${newValue}) is below threshold ${r.threshold}.`;
    } else if (r.condition === "change_pct" && r.threshold != null) {
      // need previous value
      const { data: prev } = await supabase
        .from("manual_updates")
        .select("value")
        .eq("metric_id", metricId)
        .order("created_at", { ascending: false })
        .range(1, 1)
        .maybeSingle();
      const prevVal = prev ? Number((prev as { value: number }).value) : null;
      if (prevVal != null && prevVal !== 0) {
        const change = ((newValue - prevVal) / Math.abs(prevVal)) * 100;
        if (Math.abs(change) >= r.threshold) {
          fire = true;
          msg = `${m.name} changed ${change.toFixed(1)}% (threshold ${r.threshold}%).`;
        }
      }
    }
    if (fire) {
      triggered.push(r);
      await supabase.from("notifications").insert({
        client_id: clientId,
        user_id: userId,
        alert_rule_id: r.id,
        message: `[${r.name}] ${msg}`,
        level: "warn",
      });
    }
  }
  return triggered;
}
