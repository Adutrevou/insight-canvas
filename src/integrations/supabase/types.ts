export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alert_rules: {
        Row: {
          active: boolean | null
          client_id: string
          condition: Database["public"]["Enums"]["alert_condition"]
          created_at: string | null
          created_by: string | null
          id: string
          metric_id: string
          name: string
          threshold: number | null
        }
        Insert: {
          active?: boolean | null
          client_id: string
          condition: Database["public"]["Enums"]["alert_condition"]
          created_at?: string | null
          created_by?: string | null
          id?: string
          metric_id: string
          name: string
          threshold?: number | null
        }
        Update: {
          active?: boolean | null
          client_id?: string
          condition?: Database["public"]["Enums"]["alert_condition"]
          created_at?: string | null
          created_by?: string | null
          id?: string
          metric_id?: string
          name?: string
          threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rules_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          client_id: string | null
          created_at: string | null
          diff: Json | null
          entity: string
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          client_id?: string | null
          created_at?: string | null
          diff?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          client_id?: string | null
          created_at?: string | null
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_members: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          brand_color: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          dashboard_name: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          slug: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          brand_color?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          dashboard_name?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          slug: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_color?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          dashboard_name?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          slug?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dashboard_widgets: {
        Row: {
          config: Json | null
          created_at: string | null
          dashboard_id: string
          id: string
          metric_id: string | null
          position: number | null
          size: string | null
          widget_type: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          dashboard_id: string
          id?: string
          metric_id?: string | null
          position?: number | null
          size?: string | null
          widget_type?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          dashboard_id?: string
          id?: string
          metric_id?: string | null
          position?: number | null
          size?: string | null
          widget_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_widgets_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_default: boolean | null
          layout_json: Json | null
          name: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          layout_json?: Json | null
          name: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          layout_json?: Json | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      data_rows: {
        Row: {
          created_at: string | null
          data_source_id: string
          id: string
          row_data: Json
          row_index: number
        }
        Insert: {
          created_at?: string | null
          data_source_id: string
          id?: string
          row_data: Json
          row_index: number
        }
        Update: {
          created_at?: string | null
          data_source_id?: string
          id?: string
          row_data?: Json
          row_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "data_rows_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          row_count: number | null
          schema_json: Json | null
          status: string | null
          type: Database["public"]["Enums"]["data_source_type"]
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          row_count?: number | null
          schema_json?: Json | null
          status?: string | null
          type: Database["public"]["Enums"]["data_source_type"]
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          row_count?: number | null
          schema_json?: Json | null
          status?: string | null
          type?: Database["public"]["Enums"]["data_source_type"]
        }
        Relationships: [
          {
            foreignKeyName: "data_sources_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      field_mappings: {
        Row: {
          created_at: string | null
          data_source_id: string
          field_type: Database["public"]["Enums"]["field_type"]
          flags: Json | null
          id: string
          label: string
          module: string | null
          source_field: string
        }
        Insert: {
          created_at?: string | null
          data_source_id: string
          field_type?: Database["public"]["Enums"]["field_type"]
          flags?: Json | null
          id?: string
          label: string
          module?: string | null
          source_field: string
        }
        Update: {
          created_at?: string | null
          data_source_id?: string
          field_type?: Database["public"]["Enums"]["field_type"]
          flags?: Json | null
          id?: string
          label?: string
          module?: string | null
          source_field?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_mappings_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_updates: {
        Row: {
          category: string | null
          client_id: string
          created_at: string | null
          id: string
          metric_id: string
          note: string | null
          period: string
          user_id: string | null
          value: number
        }
        Insert: {
          category?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          metric_id: string
          note?: string | null
          period: string
          user_id?: string | null
          value: number
        }
        Update: {
          category?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          metric_id?: string
          note?: string | null
          period?: string
          user_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "manual_updates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_updates_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          aggregation: string | null
          chart_type: string | null
          client_id: string
          created_at: string | null
          created_by: string | null
          data_source_id: string | null
          field: string | null
          filters: Json | null
          format: string | null
          formula_json: Json | null
          id: string
          module: string | null
          name: string
          target: number | null
        }
        Insert: {
          aggregation?: string | null
          chart_type?: string | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          data_source_id?: string | null
          field?: string | null
          filters?: Json | null
          format?: string | null
          formula_json?: Json | null
          id?: string
          module?: string | null
          name: string
          target?: number | null
        }
        Update: {
          aggregation?: string | null
          chart_type?: string | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          data_source_id?: string | null
          field?: string | null
          filters?: Json | null
          format?: string | null
          formula_json?: Json | null
          id?: string
          module?: string | null
          name?: string
          target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          alert_rule_id: string | null
          client_id: string
          created_at: string | null
          id: string
          level: string | null
          message: string
          read: boolean | null
          user_id: string | null
        }
        Insert: {
          alert_rule_id?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          level?: string | null
          message: string
          read?: boolean | null
          user_id?: string | null
        }
        Update: {
          alert_rule_id?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          level?: string | null
          message?: string
          read?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_alert_rule_id_fkey"
            columns: ["alert_rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          client_id: string
          config_json: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          last_generated_at: string | null
          name: string
        }
        Insert: {
          client_id: string
          config_json?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_generated_at?: string | null
          name: string
        }
        Update: {
          client_id?: string
          config_json?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_generated_at?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_client_admin: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      is_client_member: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      alert_condition: "above" | "below" | "change_pct" | "missing_update"
      app_role: "super_admin" | "client_admin" | "user" | "viewer"
      data_source_type: "csv" | "xlsx" | "manual" | "api"
      field_type:
        | "number"
        | "currency"
        | "percentage"
        | "text"
        | "date"
        | "category"
        | "calculated"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_condition: ["above", "below", "change_pct", "missing_update"],
      app_role: ["super_admin", "client_admin", "user", "viewer"],
      data_source_type: ["csv", "xlsx", "manual", "api"],
      field_type: [
        "number",
        "currency",
        "percentage",
        "text",
        "date",
        "category",
        "calculated",
      ],
    },
  },
} as const
