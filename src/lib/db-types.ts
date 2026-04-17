import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type DataSourceType = Database["public"]["Enums"]["data_source_type"];
export type FieldType = Database["public"]["Enums"]["field_type"];
export type AlertCondition = Database["public"]["Enums"]["alert_condition"];

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type DataSource = Database["public"]["Tables"]["data_sources"]["Row"];
export type FieldMapping = Database["public"]["Tables"]["field_mappings"]["Row"];
export type Metric = Database["public"]["Tables"]["metrics"]["Row"];
export type Dashboard = Database["public"]["Tables"]["dashboards"]["Row"];
export type DashboardWidget = Database["public"]["Tables"]["dashboard_widgets"]["Row"];
export type ManualUpdate = Database["public"]["Tables"]["manual_updates"]["Row"];
export type AlertRule = Database["public"]["Tables"]["alert_rules"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];

export interface FieldFlags {
  reportable?: boolean;
  editable?: boolean;
  chartable?: boolean;
  exportable?: boolean;
  alertable?: boolean;
}
