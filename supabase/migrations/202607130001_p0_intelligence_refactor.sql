-- 竞对外宣情报系统 P0：向后兼容迁移
-- 保留旧表、旧字段和旧数据；新增字段均提供默认值或允许为空。
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

alter table public.competitors
  add column if not exists english_name text,
  add column if not exists region text,
  add column if not exists campus text,
  add column if not exists headquarters text,
  add column if not exists key_markets text[] not null default '{}',
  add column if not exists is_key boolean not null default false,
  add column if not exists monitoring_enabled boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

create table if not exists public.competitor_aliases (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.competitors(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(normalized_alias)
);

alter table public.monitor_tasks
  add column if not exists name text,
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

create table if not exists public.monitoring_runs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.monitor_tasks(id) on delete set null,
  status text not null default 'pending',
  started_at timestamptz,
  finished_at timestamptz,
  discovered_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.raw_leads (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid references public.competitors(id) on delete set null,
  original_organization text,
  title text not null,
  url text,
  normalized_url text,
  source text,
  platform text,
  extracted_text text,
  summary text,
  confidence numeric(5,2),
  relevance numeric(5,2),
  duplicate_status text not null default 'unchecked',
  review_status text not null default 'pending',
  suggested_tags text[] not null default '{}',
  published_at timestamptz,
  discovered_at timestamptz not null default now(),
  evidence_path text,
  monitor_run_id uuid references public.monitoring_runs(id) on delete set null,
  legacy_discovery_id uuid unique,
  review_note text,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.materials
  add column if not exists evidence_id text,
  add column if not exists original_organization text,
  add column if not exists account_name text,
  add column if not exists published_at timestamptz,
  add column if not exists raw_text text,
  add column if not exists focus_points text,
  add column if not exists content_type text,
  add column if not exists product_lines text[] not null default '{}',
  add column if not exists audience_tags text[] not null default '{}',
  add column if not exists theme_tags text[] not null default '{}',
  add column if not exists is_new boolean not null default true,
  add column if not exists collected_at timestamptz not null default now(),
  add column if not exists created_by text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists collection_status text not null default 'identified',
  add column if not exists review_status text not null default 'approved',
  add column if not exists analysis_status text not null default 'pending',
  add column if not exists human_review_status text not null default 'pending',
  add column if not exists report_status text not null default 'unused',
  add column if not exists normalized_url text,
  add column if not exists content_hash text,
  add column if not exists duplicate_of uuid references public.materials(id) on delete set null,
  add column if not exists import_job_id uuid;

update public.materials
set evidence_id = 'EVD-' || upper(substr(replace(id::text, '-', ''), 1, 12))
where evidence_id is null;

update public.materials set analysis_status = case
  when status in ('已分析','基础分析') then 'completed'
  when status in ('分析失败') then 'failed'
  else coalesce(analysis_status, 'pending') end;

create unique index if not exists materials_evidence_id_uidx on public.materials(evidence_id);
create index if not exists materials_status_idx on public.materials(review_status, analysis_status, human_review_status, report_status);
create index if not exists materials_published_idx on public.materials(competitor_id, published_at desc);
create index if not exists materials_import_idx on public.materials(import_job_id);
create index if not exists materials_normalized_url_idx on public.materials(normalized_url) where normalized_url is not null;
create index if not exists materials_content_hash_idx on public.materials(content_hash) where content_hash is not null;

create table if not exists public.material_assets (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  object_path text not null,
  filename text not null,
  mime_type text,
  size_bytes bigint,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(object_path)
);

insert into public.material_assets(material_id, object_path, filename, mime_type, size_bytes, created_at)
select material_id, object_path, coalesce(filename, object_path), content_type, size, created_at
from public.material_files
on conflict(object_path) do nothing;

create table if not exists public.marketing_events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null unique,
  name text not null,
  competitor_id uuid references public.competitors(id) on delete set null,
  event_type text,
  start_at timestamptz,
  end_at timestamptz,
  core_product text,
  target_audience text,
  core_message text,
  ai_summary text,
  confirmation_status text not null default 'pending',
  report_status text not null default 'unused',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.material_event_links (
  material_id uuid not null references public.materials(id) on delete cascade,
  event_id uuid not null references public.marketing_events(id) on delete cascade,
  relationship text not null default 'source',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(material_id, event_id)
);

create table if not exists public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  source text not null default 'internal_ai',
  status text not null default 'pending',
  current_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(material_id, source)
);

create table if not exists public.analysis_versions (
  id uuid primary key default gen_random_uuid(),
  analysis_result_id uuid not null references public.analysis_results(id) on delete cascade,
  version integer not null,
  model_name text,
  prompt_version text,
  structured_data jsonb not null default '{}',
  facts jsonb not null default '{}',
  inferences jsonb not null default '{}',
  actions jsonb not null default '{}',
  confidence numeric(5,2),
  status text not null default 'completed',
  error_code text,
  error_message text,
  human_review_status text not null default 'pending',
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(analysis_result_id, version)
);

create table if not exists public.analysis_evidence (
  id uuid primary key default gen_random_uuid(),
  analysis_version_id uuid not null references public.analysis_versions(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  evidence_id text not null,
  claim_path text,
  excerpt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.competitor_profiles (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.competitors(id) on delete cascade,
  period_start date,
  period_end date,
  material_count integer not null default 0,
  event_count integer not null default 0,
  business_directions jsonb not null default '[]',
  themes jsonb not null default '[]',
  audiences jsonb not null default '[]',
  platforms jsonb not null default '[]',
  content_formats jsonb not null default '[]',
  marketing_strategies jsonb not null default '[]',
  recent_moves jsonb not null default '[]',
  trend_status text not null default 'insufficient_data',
  rationale text,
  generated_from text not null default 'database',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.report_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  period_start date not null,
  period_end date not null,
  competitor_ids uuid[] not null default '{}',
  filters jsonb not null default '{}',
  reviewed_only boolean not null default false,
  status text not null default 'draft',
  version integer not null default 1,
  draft jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.report_sections (
  id uuid primary key default gen_random_uuid(),
  report_project_id uuid not null references public.report_projects(id) on delete cascade,
  section_key text not null,
  title text not null,
  sort_order integer not null default 0,
  content jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(report_project_id, section_key)
);

create table if not exists public.report_material_links (
  report_project_id uuid not null references public.report_projects(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  citation_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(report_project_id, material_id)
);

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  format text not null,
  status text not null default 'preview',
  mapping jsonb not null default '{}',
  total_rows integer not null default 0,
  success_rows integer not null default 0,
  skipped_rows integer not null default 0,
  failed_rows integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.materials
  drop constraint if exists materials_import_job_id_fkey;
alter table public.materials
  add constraint materials_import_job_id_fkey foreign key(import_job_id) references public.import_jobs(id) on delete set null;

create table if not exists public.import_job_rows (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references public.import_jobs(id) on delete cascade,
  row_number integer not null,
  raw_data jsonb not null default '{}',
  normalized_data jsonb not null default '{}',
  status text not null default 'pending',
  material_id uuid references public.materials(id) on delete set null,
  duplicate_material_id uuid references public.materials(id) on delete set null,
  errors jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(import_job_id, row_number)
);

create table if not exists public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  export_type text not null,
  status text not null default 'pending',
  filters jsonb not null default '{}',
  object_path text,
  item_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.external_ai_packages (
  id uuid primary key default gen_random_uuid(),
  export_job_id uuid references public.export_jobs(id) on delete set null,
  report_project_id uuid references public.report_projects(id) on delete set null,
  object_path text,
  schema_version text not null default '1.0',
  material_count integer not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.external_ai_imports (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references public.external_ai_packages(id) on delete set null,
  filename text not null,
  model_name text,
  status text not null default 'pending',
  matched_count integer not null default 0,
  unmatched_count integer not null default 0,
  created_count integer not null default 0,
  conflict_count integer not null default 0,
  error_count integer not null default 0,
  conflict_mode text not null default 'keep_both',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  version text not null,
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(key, version)
);

create table if not exists public.taxonomy (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  value text not null,
  aliases text[] not null default '{}',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(category, value)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default '{}',
  is_secret boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 把旧 discoveries 迁入新审核线索表；保留旧表作为兼容入口。
insert into public.raw_leads(
  competitor_id, title, url, normalized_url, source, platform, summary,
  confidence, review_status, published_at, discovered_at, evidence_path,
  legacy_discovery_id, created_at
)
select competitor_id, title, url, lower(regexp_replace(url, '[#?].*$', '')), source, source, summary,
  case when confidence ~ '^[0-9]+(\.[0-9]+)?$' then confidence::numeric else null end,
  case status when '已入库' then 'approved' when '已忽略' then 'ignored' else 'pending' end,
  published_at, created_at, evidence_path, id, created_at
from public.discoveries
on conflict(legacy_discovery_id) do nothing;

-- 为已有 analysis JSON 建立首个历史版本。
insert into public.analysis_results(material_id, source, status, current_version)
select id, 'legacy', 'completed', 1 from public.materials where analysis is not null
on conflict(material_id, source) do nothing;

insert into public.analysis_versions(analysis_result_id, version, model_name, prompt_version, structured_data, status, human_review_status)
select ar.id, 1, 'legacy', 'legacy-v1', m.analysis, 'completed', 'pending'
from public.analysis_results ar join public.materials m on m.id = ar.material_id
where ar.source = 'legacy' and m.analysis is not null
on conflict(analysis_result_id, version) do nothing;

create index if not exists raw_leads_review_idx on public.raw_leads(review_status, discovered_at desc);
create index if not exists raw_leads_competitor_idx on public.raw_leads(competitor_id, discovered_at desc);
create index if not exists material_assets_material_idx on public.material_assets(material_id, sort_order);
create index if not exists marketing_events_competitor_idx on public.marketing_events(competitor_id, start_at desc);
create index if not exists analysis_results_material_idx on public.analysis_results(material_id, updated_at desc);
create index if not exists analysis_evidence_evidence_idx on public.analysis_evidence(evidence_id);
create index if not exists report_projects_period_idx on public.report_projects(period_start, period_end);
create index if not exists import_rows_job_idx on public.import_job_rows(import_job_id, status);

do $$
declare t text;
begin
  foreach t in array array[
    'competitor_aliases','monitoring_runs','raw_leads','material_assets','marketing_events',
    'material_event_links','analysis_results','analysis_versions','analysis_evidence',
    'competitor_profiles','report_projects','report_sections','report_material_links',
    'import_jobs','import_job_rows','export_jobs','external_ai_packages','external_ai_imports',
    'prompt_templates','taxonomy','audit_logs','system_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

grant select, insert, update, delete on table public.competitors to service_role;
grant select, insert, update, delete on table public.monitor_tasks to service_role;
grant select, insert, update, delete on table public.discoveries to service_role;
grant select, insert, update, delete on table public.materials to service_role;
grant select, insert, update, delete on table public.material_files to service_role;
grant select, insert, update, delete on table public.reports to service_role;

do $$
declare t text;
begin
  foreach t in array array[
    'competitors','competitor_aliases','monitor_tasks','monitoring_runs','raw_leads',
    'materials','material_assets','marketing_events','analysis_results','analysis_versions',
    'competitor_profiles','report_projects','report_sections','import_jobs','import_job_rows',
    'export_jobs','external_ai_packages','external_ai_imports','prompt_templates','taxonomy','system_settings'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_set_updated_at', t);
  end loop;
end $$;
