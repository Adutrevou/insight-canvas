
The user wants a single-module focus: a configurable dashboard with metrics & analytics, plus all the admin/upload/configuration machinery described (multi-tenant, data upload, mapping, metric builder, manual updates, alerts, reports, branding, users). Inspired by the referenced Ecomotel ONE project. Let me peek at that project briefly for visual cues, then present a focused plan.

Skipping deep cross-project exploration to stay concise — I'll match a clean light BI style consistent with shadcn defaults and refine after first build if needed.

# Plan: White-Label Dashboard Platform — Phase 1

A multi-tenant, configurable **Dashboard & Analytics module** with the full admin/setup stack around it. One consumption module (Dashboard), but every supporting system (clients, upload, mapping, metrics, updates, alerts, reports, users, branding) is built in.

## Stack & Storage

- **Lovable Cloud** (auth + Postgres with RLS) for true multi-tenant persistence
- CSV/Excel parsed in the browser (PapaParse + SheetJS), rows stored as JSONB per dataset
- Charts: Recharts. PDF export: jsPDF + html2canvas. Excel export: SheetJS
- Roles: Super Admin, Client Admin, Standard User, Read-Only — all enforced via route guards + RLS

## Data Model (Cloud tables)

```text
clients            id, name, slug, logo_url, brand_color, timezone, currency, industry, created_by
client_members     client_id, user_id, role  (super_admin|client_admin|user|viewer)
user_roles         user_id, role  (global super_admin)  -- security definer has_role()
data_sources       client_id, name, type (csv|xlsx|manual|api), schema_json, status
data_rows          data_source_id, row_data jsonb, row_index
field_mappings     data_source_id, source_field, label, type, module, flags jsonb
metrics            client_id, name, module, formula_json, format, target, chart_type, filters
dashboards         client_id, name, layout_json, is_default
dashboard_widgets  dashboard_id, metric_id, position, size, type
manual_updates     client_id, metric_id, value, period, category, note, user_id, created_at
alert_rules        client_id, metric_id, condition, threshold, channel, active
notifications      client_id, user_id, alert_rule_id, message, read, created_at
reports            client_id, name, config_json, last_generated_at
audit_log          client_id, user_id, action, entity, entity_id, diff jsonb, created_at
```

RLS: every table scoped by `client_id` via `client_members`. Roles checked via `has_role()` security definer function.

## Routes

```text
/                              → marketing/landing
/auth                          → login/signup
/_authenticated/
  select-client                → client switcher
  super-admin/                 → super-admin only
    clients                    → list/create/manage tenants
    users                      → global users
  c/$clientId/
    overview                   → main dashboard (KPIs, charts, recent updates, alerts)
    onboarding                 → 5-step wizard (profile→source→mapping→metrics→done)
    data-sources               → list + upload CSV/XLSX, manual table
    data-sources/$id/mapping   → field mapping UI
    metrics                    → metric library + builder
    dashboard-builder          → drag/reorder widgets, save views
    updates                    → manual metric input + history
    alerts                     → rules + notification center
    reports                    → builder + PDF/Excel export
    settings/
      branding                 → logo, colors, name
      users                    → invite + role assignment
      modules                  → rename/reorder (config-only for phase 1)
```

## Screens (13)

1. **Super Admin → Clients** — table, create client, impersonate, usage
2. **Onboarding Wizard** — Profile → Data Source → Mapping → Metrics → Launch
3. **Data Source Upload** — drag-drop CSV/XLSX, preview first 50 rows, manual table builder, API placeholder card
4. **Mapping Configuration** — column-by-column: label, type (number/currency/%/text/date/category/calc), module, flags (reportable/editable/chartable/exportable/alertable)
5. **Metric Builder** — pick fields → choose aggregation (sum/avg/count/min/max/custom formula) → format → target → chart type → filters → preview
6. **Dashboard Builder** — grid (react-grid-layout), add/remove/resize widgets, save layouts
7. **Main Dashboard Overview** — KPI cards row, charts grid, recent updates panel, alerts panel, quick filters (date range, category)
8. **Module Page** (single generic module) — same shell, filtered to module's metrics
9. **Manual Metric Update** — single + bulk forms, period/category, notes, history table with audit
10. **Alerts Center** — rules table + builder dialog (above/below/Δ%/missing update), in-app notifications panel
11. **Report Builder** — pick metrics + date range + notes → preview → PDF/Excel download with branding
12. **Users & Permissions** — invite by email, assign role, per-module visibility
13. **Branding & Settings** — logo upload (Cloud Storage), brand color picker, dashboard name, terminology overrides

## Demo Seed

On first super-admin login, seed one demo client with a generic dataset: Revenue, Cost, Units Sold, Conversion Rate, Tasks Completed, Staff Count, Compliance Score, Customer Satisfaction, Target Achievement, Incident Count — across 12 months × 3 categories.

## Visual Direction

Light, premium BI: white surfaces, slate borders, subtle shadows, single configurable accent (defaults to indigo, overridden per-client via CSS vars from `brand_color`). Persistent left sidebar with module nav, top bar with client switcher + date range + notifications + user menu. shadcn/ui throughout.

## Build Order (atomic tasks)

1. Enable Lovable Cloud + auth + all tables with RLS
2. Auth pages + role guards + client switcher + app shell (sidebar/topbar)
3. Super Admin clients page + onboarding wizard skeleton
4. Data source upload (CSV/XLSX parsing, JSONB storage) + preview
5. Mapping UI
6. Metric builder + storage
7. Dashboard builder + main overview rendering metrics from real data
8. Manual updates + audit log
9. Alerts engine (evaluated on update) + notifications panel
10. Report builder + PDF/Excel export
11. Users & permissions UI
12. Branding (logo upload to Storage, dynamic theme)
13. Demo seed + polish

## Out of Scope (Phase 2)

Real API/Google Sheets connectors, email delivery for alerts, multi-module navigation beyond one generic module, scheduled report delivery, advanced calculated-field formula language (Phase 1 supports basic arithmetic between fields).

## Confirm before I build

- Phase 1 = everything above. This is a large build (~25–35 files) but ships a real, working multi-tenant prototype on Cloud.
- I'll default the accent to indigo and a clean light BI theme — easy to retheme later.
- Demo client auto-seeded so the dashboard isn't empty on first login.

Approve and I'll start with Cloud setup + schema, then build outward in the order above.
