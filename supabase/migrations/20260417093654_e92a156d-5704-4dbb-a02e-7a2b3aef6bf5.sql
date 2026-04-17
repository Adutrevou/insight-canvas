-- ENUMS
create type public.app_role as enum ('super_admin', 'client_admin', 'user', 'viewer');
create type public.data_source_type as enum ('csv', 'xlsx', 'manual', 'api');
create type public.field_type as enum ('number', 'currency', 'percentage', 'text', 'date', 'category', 'calculated');
create type public.alert_condition as enum ('above', 'below', 'change_pct', 'missing_update');

-- CLIENTS
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  brand_color text default '#6366f1',
  industry text,
  timezone text default 'UTC',
  currency text default 'USD',
  dashboard_name text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.client_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'user',
  created_at timestamptz default now(),
  unique (client_id, user_id)
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz default now(),
  unique (user_id, role)
);

create or replace function public.is_super_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = 'super_admin')
$$;

create or replace function public.is_client_member(_user_id uuid, _client_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.client_members where user_id = _user_id and client_id = _client_id)
    or public.is_super_admin(_user_id)
$$;

create or replace function public.is_client_admin(_user_id uuid, _client_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin(_user_id)
    or exists (select 1 from public.client_members where user_id = _user_id and client_id = _client_id and role = 'client_admin')
$$;

-- DATA SOURCES
create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  type data_source_type not null,
  schema_json jsonb default '[]'::jsonb,
  row_count int default 0,
  status text default 'ready',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table public.data_rows (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  row_index int not null,
  row_data jsonb not null,
  created_at timestamptz default now()
);
create index idx_data_rows_source on public.data_rows(data_source_id);

create table public.field_mappings (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  source_field text not null,
  label text not null,
  field_type field_type not null default 'text',
  module text default 'general',
  flags jsonb default '{"reportable":true,"editable":false,"chartable":false,"exportable":true,"alertable":false}'::jsonb,
  created_at timestamptz default now(),
  unique (data_source_id, source_field)
);

-- METRICS / DASHBOARDS
create table public.metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  module text default 'general',
  data_source_id uuid references public.data_sources(id) on delete set null,
  field text,
  aggregation text default 'sum',
  formula_json jsonb,
  format text default 'number',
  target numeric,
  chart_type text default 'kpi',
  filters jsonb default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table public.dashboards (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  layout_json jsonb default '[]'::jsonb,
  is_default boolean default false,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  metric_id uuid references public.metrics(id) on delete cascade,
  widget_type text default 'kpi',
  position int default 0,
  size text default 'md',
  config jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table public.manual_updates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  metric_id uuid not null references public.metrics(id) on delete cascade,
  value numeric not null,
  period date not null,
  category text,
  note text,
  user_id uuid references auth.users(id),
  created_at timestamptz default now()
);
create index idx_updates_metric on public.manual_updates(metric_id, period);

create table public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  metric_id uuid not null references public.metrics(id) on delete cascade,
  name text not null,
  condition alert_condition not null,
  threshold numeric,
  active boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  alert_rule_id uuid references public.alert_rules(id) on delete set null,
  message text not null,
  level text default 'info',
  read boolean default false,
  created_at timestamptz default now()
);
create index idx_notif_user on public.notifications(user_id, read);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  config_json jsonb default '{}'::jsonb,
  last_generated_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  diff jsonb,
  created_at timestamptz default now()
);
create index idx_audit_client on public.audit_log(client_id, created_at desc);

-- First-user-becomes-super-admin trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_count int;
begin
  select count(*) into user_count from auth.users;
  if user_count <= 1 then
    insert into public.user_roles (user_id, role) values (new.id, 'super_admin') on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- RLS
alter table public.clients enable row level security;
alter table public.client_members enable row level security;
alter table public.user_roles enable row level security;
alter table public.data_sources enable row level security;
alter table public.data_rows enable row level security;
alter table public.field_mappings enable row level security;
alter table public.metrics enable row level security;
alter table public.dashboards enable row level security;
alter table public.dashboard_widgets enable row level security;
alter table public.manual_updates enable row level security;
alter table public.alert_rules enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;

-- clients
create policy "clients_select" on public.clients for select using (public.is_client_member(auth.uid(), id));
create policy "clients_insert" on public.clients for insert with check (public.is_super_admin(auth.uid()));
create policy "clients_update" on public.clients for update using (public.is_client_admin(auth.uid(), id));
create policy "clients_delete" on public.clients for delete using (public.is_super_admin(auth.uid()));

-- client_members
create policy "members_select" on public.client_members for select using (
  user_id = auth.uid() or public.is_client_admin(auth.uid(), client_id)
);
create policy "members_all" on public.client_members for all using (public.is_client_admin(auth.uid(), client_id))
  with check (public.is_client_admin(auth.uid(), client_id));

-- user_roles
create policy "roles_select" on public.user_roles for select using (user_id = auth.uid() or public.is_super_admin(auth.uid()));
create policy "roles_all" on public.user_roles for all using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

-- data_sources
create policy "ds_select" on public.data_sources for select using (public.is_client_member(auth.uid(), client_id));
create policy "ds_all" on public.data_sources for all using (public.is_client_admin(auth.uid(), client_id)) with check (public.is_client_admin(auth.uid(), client_id));

-- data_rows
create policy "rows_select" on public.data_rows for select using (
  exists (select 1 from public.data_sources ds where ds.id = data_rows.data_source_id and public.is_client_member(auth.uid(), ds.client_id))
);
create policy "rows_all" on public.data_rows for all using (
  exists (select 1 from public.data_sources ds where ds.id = data_rows.data_source_id and public.is_client_admin(auth.uid(), ds.client_id))
) with check (
  exists (select 1 from public.data_sources ds where ds.id = data_rows.data_source_id and public.is_client_admin(auth.uid(), ds.client_id))
);

-- field_mappings
create policy "fm_select" on public.field_mappings for select using (
  exists (select 1 from public.data_sources ds where ds.id = field_mappings.data_source_id and public.is_client_member(auth.uid(), ds.client_id))
);
create policy "fm_all" on public.field_mappings for all using (
  exists (select 1 from public.data_sources ds where ds.id = field_mappings.data_source_id and public.is_client_admin(auth.uid(), ds.client_id))
) with check (
  exists (select 1 from public.data_sources ds where ds.id = field_mappings.data_source_id and public.is_client_admin(auth.uid(), ds.client_id))
);

-- metrics
create policy "metrics_select" on public.metrics for select using (public.is_client_member(auth.uid(), client_id));
create policy "metrics_all" on public.metrics for all using (public.is_client_admin(auth.uid(), client_id)) with check (public.is_client_admin(auth.uid(), client_id));

-- dashboards
create policy "dash_select" on public.dashboards for select using (public.is_client_member(auth.uid(), client_id));
create policy "dash_all" on public.dashboards for all using (public.is_client_admin(auth.uid(), client_id)) with check (public.is_client_admin(auth.uid(), client_id));

create policy "wid_select" on public.dashboard_widgets for select using (
  exists (select 1 from public.dashboards d where d.id = dashboard_widgets.dashboard_id and public.is_client_member(auth.uid(), d.client_id))
);
create policy "wid_all" on public.dashboard_widgets for all using (
  exists (select 1 from public.dashboards d where d.id = dashboard_widgets.dashboard_id and public.is_client_admin(auth.uid(), d.client_id))
) with check (
  exists (select 1 from public.dashboards d where d.id = dashboard_widgets.dashboard_id and public.is_client_admin(auth.uid(), d.client_id))
);

-- manual_updates
create policy "mu_select" on public.manual_updates for select using (public.is_client_member(auth.uid(), client_id));
create policy "mu_insert" on public.manual_updates for insert with check (
  public.is_client_member(auth.uid(), client_id) and user_id = auth.uid()
);

-- alerts
create policy "ar_select" on public.alert_rules for select using (public.is_client_member(auth.uid(), client_id));
create policy "ar_all" on public.alert_rules for all using (public.is_client_admin(auth.uid(), client_id)) with check (public.is_client_admin(auth.uid(), client_id));

create policy "notif_select" on public.notifications for select using (user_id = auth.uid());
create policy "notif_update" on public.notifications for update using (user_id = auth.uid());
create policy "notif_insert" on public.notifications for insert with check (public.is_client_member(auth.uid(), client_id));

-- reports
create policy "rep_select" on public.reports for select using (public.is_client_member(auth.uid(), client_id));
create policy "rep_all" on public.reports for all using (public.is_client_admin(auth.uid(), client_id)) with check (public.is_client_admin(auth.uid(), client_id));

-- audit
create policy "audit_select" on public.audit_log for select using (client_id is null or public.is_client_member(auth.uid(), client_id));
create policy "audit_insert" on public.audit_log for insert with check (
  client_id is null or (public.is_client_member(auth.uid(), client_id) and user_id = auth.uid())
);

-- STORAGE BUCKET
insert into storage.buckets (id, name, public) values ('client-logos', 'client-logos', true) on conflict (id) do nothing;

create policy "logos_read" on storage.objects for select using (bucket_id = 'client-logos');
create policy "logos_upload" on storage.objects for insert with check (bucket_id = 'client-logos' and auth.uid() is not null);
create policy "logos_update" on storage.objects for update using (bucket_id = 'client-logos' and auth.uid() is not null);