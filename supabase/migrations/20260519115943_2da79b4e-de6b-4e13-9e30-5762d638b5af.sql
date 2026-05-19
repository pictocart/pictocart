
create table if not exists public.theme_layout_archetypes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  best_for text[] not null default '{}',
  hero_style text not null,
  category_style text not null,
  product_style text not null,
  header_style text not null,
  density text not null default 'balanced',
  radius_hint text not null default '8px',
  section_order text[] not null default '{}',
  allowed_extra_sections text[] not null default '{}',
  forbidden_sections text[] not null default '{}',
  image_ratios jsonb not null default '{"hero":"16:9","category":"1:1","product":"4:5"}'::jsonb,
  motion_language text not null default 'subtle fades, no parallax',
  prompt_instructions text not null,
  editor_schema jsonb not null default '[]'::jsonb,
  preview_image text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.theme_layout_archetypes enable row level security;

create policy "Anyone reads active layouts"
  on public.theme_layout_archetypes for select
  to anon, authenticated
  using (is_active = true);

create policy "Admins manage layouts"
  on public.theme_layout_archetypes for all
  to authenticated
  using (has_role(auth.uid(), 'admin'))
  with check (has_role(auth.uid(), 'admin'));

create policy "Service role manages layouts"
  on public.theme_layout_archetypes for all
  to service_role
  using (true) with check (true);

create trigger theme_layout_archetypes_updated_at
  before update on public.theme_layout_archetypes
  for each row execute function public.update_updated_at_column();

alter table public.theme_packs add column if not exists layout_slug text;
alter table public.master_theme_deliveries add column if not exists layout_slug text;
alter table public.stores add column if not exists layout_slug text;
