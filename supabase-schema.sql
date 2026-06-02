create table if not exists public.guides (
  id text primary key,
  city text not null default '',
  name text not null default '',
  address text not null default '',
  dob text not null default '',
  sex text not null default '',
  id_number text not null default '',
  expire text not null default '',
  guide_id text not null default '',
  guide_expire text not null default '',
  phone text not null default '',
  bank_account text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurants (
  id text primary key,
  city text not null default '',
  name text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  contact_person text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_menus (
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  menu_name text not null,
  detail text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (restaurant_id, menu_name)
);

alter table public.guides enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_menus enable row level security;

create policy "Allow anon read guides"
  on public.guides for select
  to anon
  using (true);

create policy "Allow anon write guides"
  on public.guides for all
  to anon
  using (true)
  with check (true);

create policy "Allow anon read restaurants"
  on public.restaurants for select
  to anon
  using (true);

create policy "Allow anon write restaurants"
  on public.restaurants for all
  to anon
  using (true)
  with check (true);

create policy "Allow anon read restaurant menus"
  on public.restaurant_menus for select
  to anon
  using (true);

create policy "Allow anon write restaurant menus"
  on public.restaurant_menus for all
  to anon
  using (true)
  with check (true);
