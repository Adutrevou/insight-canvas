-- ============ ENUMS ============
create type public.app_role as enum ('super_admin', 'client_admin', 'user', 'viewer');
create type public.data_source_type as enum ('csv', 'xlsx', 'manual', 'api');
create type public.field_type as enum ('number', 'currency', 'percentage', 'text', 'date', 'category', 'calculated');
create type public.alert_condition as enum ('above', 'below', 'change_pct', 'missing_update');

-- ============ CLIENTS ============
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

-- ============ MEMBERSHIP / ROLES ============
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

-- Security definer helpers
create or replace function public.is_super_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = 'super_admin')
$$;

create or replace function public.is_client_member(_user_id uuid, _client_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.client_members where user_id = _user_id and client_id = _client_id)
    or public.is_super_admin(_user_id)
$$;

create or replace function public.client_role(_user_id uuid, _client_id uuid)
returns app_role language sql stable security definer set search_path = public as $$
  select case when public.is_super_admin(_user_id) then 'super_admin'::app_role
              else (select role from public.client_members where user_id = _user_id and client_id = _client_id limit 1) end
$$;

-- ============ DATA SOURCES ============
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

-- ============ METRICS / DASHBOARDS ============
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

-- ============ MANUAL UPDATES ============
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

-- ============ ALERTS / NOTIFICATIONS ============
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

-- ============ REPORTS / AUDIT ============
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

-- ============ AUTO PROFILE / FIRST-USER SUPER ADMIN ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  user_count int;
begin
  select count(*) into user_count from auth.users;
  if user_count <= 1 then
    insert into public.user_roles (user_id, role) values (new.id, 'super_admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ ENABLE RLS ============
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

-- ============ POLICIES ============
-- clients
create policy "members or super read" on public.clients for select
  using (public.is_client_member(auth.uid(), id));
create policy "super admin insert" on public.clients for insert
  with check (public.is_super_admin(auth.uid()));
create policy "admin update" on public.clients for update
  using (public.is_super_admin(auth.uid()) or exists (
    select 1 from public.client_members where client_id = clients.id and user_id = auth.uid() and role in ('client_admin')
  ));
create policy "super delete" on public.clients for delete using (public.is_super_admin(auth.uid()));

-- client_members
create policy "view own memberships" on public.client_members for select
  using (user_id = auth.uid() or public.is_super_admin(auth.uid())
    or exists (select 1 from public.client_members cm2 where cm2.client_id = client_members.client_id and cm2.user_id = auth.uid() and cm2.role = 'client_admin'));
create policy "admin manage members" on public.client_members for all
  using (public.is_super_admin(auth.uid()) or exists (
    select 1 from public.client_members cm2 where cm2.client_id = client_members.client_id and cm2.user_id = auth.uid() and cm2.role = 'client_admin'
  ))
  with check (public.is_super_admin(auth.uid()) or exists (
    select 1 from public.client_members cm2 where cm2.client_id = client_members.client_id and cm2.user_id = auth.uid() and cm2.role = 'client_admin'
  ));

-- user_roles
create policy "view own roles" on public.user_roles for select using (user_id = auth.uid() or public.is_super_admin(auth.uid()));
create policy "super admin manage roles" on public.user_roles for all
  using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

-- generic helper for tenant tables
do $$
declare
  t text;
begin
  for t in select unnest(array['data_sources','metrics','dashboards','manual_updates','alert_rules','notifications','reports','audit_log','field_mappings']) loop
    -- handled below per-table for clarity
    null;
  end loop;
end $$;

-- data_sources
create policy "members read ds" on public.data_sources for select using (public.is_client_member(auth.uid(), client_id));
create policy "admins write ds" on public.data_sources for all
  using (public.is_super_admin(auth.uid()) or exists (select 1 from public.client_members where client_id = data_sources.client_id and user_id = auth.uid() and role = 'client_admin'))
  with check (public.is_super_admin(auth.uid()) or exists (select 1 from public.client_members where client_id = data_sources.client_id and user_id = auth.uid() and role = 'client_admin'));

-- data_rows (via parent ds)
create policy "members read rows" on public.data_rows for select
  using (exists (select 1 from public.data_sources ds where ds.id = data_rows.data_source_id and public.is_client_member(auth.uid(), ds.client_id)));
create policy "admins write rows" on public.data_rows for all
  using (exists (select 1 from public.data_sources ds where ds.id = data_rows.data_source_id and (public.is_super_admin(auth.uid()) or exists (select 1 from public.client_members cm where cm.client_id = ds.client_id and cm.user_id = auth.uid() and cm.role = 'client_admin'))))
  with check (exists (select 1 from public.data_sources ds where ds.id = data_rows.data_source_id and (public.is_super_admin(auth.uid()) or exists (select 1 from public.client_members cm where cm.client_id = ds.client_id and cm.user_id = auth.uid() and cm.role = 'client_admin'))));

-- field_mappings
create policy "members read map" on public.field_mappings for select
  using (exists (select 1 from public.data_sources ds where ds.id = field_mappings.data_source_id and public.is_client_member(auth.uid(), ds.client_id)));
create policy "admins write map" on public.field_mappings for all
  using (exists (select 1 from public.data_sources ds where ds.id = field_mappings.data_source_id and (public.is_super_admin(auth.uid()) or exists (select 1 from public.client_members cm where cm.client_id = ds.client_id and cm.user_id = auth.uid() and cm.role = 'client_admin'))))
  with check (exists (select 1 from public.data_sources ds where ds.id = field_mappings.data_source_id and (public.is_super_admin(auth.uid()) or exists (select 1 from public.client_members cm where cm.client_id = ds.client_id and cm.user_id = auth.uid() and cm.role = 'client_admin'))));

-- metrics
create policy "members read metrics" on public.metrics for select using (public.is_client_member(auth.uid(), client_id));
create policy "admins write metrics" on public.metrics for all
  using (public.is_super_admin(auth.uid()) or exists (select 1 from public.client_members where client_id = metrics.client_id and user_id = auth.uid() and role = 'client_admin'))
  with check (public.is_super_admin(auth.uid()) or exists (select 1 from public.client_members where client_id = metrics.client_id and user_id = auth.uid() and role = 'client_admin'));

-- dashboards
create policy "members read dash" on public.dashboards for select using (public.is_client_member(auth.uid(), client_id));
create policy "admins write dash" on public.dashboards for all
  using (public.is_super_admin(auth.uid()) or exists (select 1 from public.client_members where client_id = dashboards.client_id and user_id = auth.uid() and role = 'client_admin'))
  with check (public.is_super_admin(auth.uid()) or exists (select 1 from public.client_members where client_id = dashboards.client_id and user_id = auth.uid() and role = 'client_admin'));

create policy "members read widgets" on public.dashboard_widgets for select
  using (exists (select 1 from public.dashboards d where d.id = dashboard_widgets.dashboard_id and public.is_client_member(auth.uid(), d.client_id)));
create policy "admins write widgets" on public.dashboard_widgets for all
  using (exists (select 1 from public.dashboards d where d.id = dashboard_widgets.dashboard_id and (public.is_super_admin(auth.uid()) or exists (select 1 from public.client_members cm where cm.client_id = d.client_id and cm.user_id = auth.uid() and cm.role = 'client_admin'))))
  with check (exists (select 1 from public.dashboards d where d.id = dashboard_widgets.dashboard_id and (public.is_super_admin(auth.uid()) or exists (select 1 from public.client_members cm where cm.client_id = d.client_id and cm.user_id = auth.uid() and cm.role = 'client_admin'))));

-- manual_updates
create policy "members read updates" on public.manual_updates for select using (public.is_client_member(auth.uid(), client_id));
create policy "members insert updates" on public.manual_updates for insert
  with check (public.is_client_member(auth.uid(), client_id) and user_id = auth.uid()
    and exists (select 1 from public.client_members where client_id = manual_updates.client_id and user_id = auth.uid() and role in ('client_admin','user')));

-- alert_rules
create policy "members read alerts" on public.alert_rules for select using (public.is_client_member(auth.uid(), client_id));
create policy "admins write alerts" on public.alert_rules for all
  using (public.is_super_admin(auth.uid()) or exists (select 1 from public.client_members where client_id = alert_rules.client_id and user_id = auth.uid() and role = 'client_admin'))
  with check (public.is_super_admin(auth.uid()) or exists (select 1 from public.client_members where client_id = alert_rules.client_id and user_id = auth.uid() and role = 'client_admin'));

-- notifications
create policy "see own notifs" on public.notifications for select using (user_id = auth.uid() or public.is_super_admin(auth.uid()));
create policy "update own notifs" on public.notifications for update using (user_id = auth.uid());
create policy "system insert notifs" on public.notifications for insert with check (public.is_client_member(auth.uid(), client_id));

-- reports
create policy "members read reports" on public.reports for select using (public.is_client_member(auth.uid(), client_id));
create policy "admins write reports" on public.reports for all
  using (public.is_super_admin(auth.uid()) or exists (select 1 from public.client_members where client_id = reports.client_id and user_id = auth.uid() and role = 'client_admin'))
  with check (public.is_super_admin(auth.uid()) or exists (select 1 from public.client_members where client_id = reports.client_id and user_id = auth.uid() and role = 'client_admin'));

-- audit_log
create policy "members read audit" on public.audit_log for select using (client_id is null or public.is_client_member(auth.uid(), client_id));
create policy "members insert audit" on public.audit_log for insert with check (public.is_client_member(auth.uid(), client_id) and user_id = auth.uid());

-- ============ STORAGE BUCKET FOR LOGOS ============
insert into storage.buckets (id, name, public) values ('client-logos', 'client-logos', true)
on conflict (id) do nothing;

create policy "Public read logos" on storage.objects for select using (bucket_id = 'client-logos');
create policy "Auth upload logos" on storage.objects for insert
  with check (bucket_id = 'client-logos' and auth.uid() is not null);
create policy "Auth update logos" on storage.objects for update
  using (bucket_id = 'client-logos' and auth.uid() is not null);
