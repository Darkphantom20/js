/* ============================================================
 * schema.js — the SQL that creates the database schema.
 * Shown to the user in the setup wizard. Standalone copy at sql/schema.sql.
 * ============================================================ */

const SQL_SCHEMA = `-- ============================================================
-- Golden Grain Rice Shop — full reset + setup
-- Drops any previous tables first, then creates everything fresh.
-- Safe to run repeatedly.
-- ============================================================

-- ---------- CLEAN SLATE ----------
drop table if exists products cascade;
drop table if exists orders   cascade;
drop table if exists settings cascade;
drop function if exists place_order  cascade;
drop function if exists cancel_order cascade;

create extension if not exists "pgcrypto";
create sequence if not exists order_no_seq;

-- ---------- TABLES ----------
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  variety text not null,
  grade text default 'Grade A',
  price_per_kg numeric not null default 0,
  cost_per_kg numeric default 0,
  stock_kg numeric not null default 0,
  reorder_kg numeric default 100,
  image_url text,
  origin text,
  description text,
  posted boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_address text,
  delivery_method text not null default 'pickup',
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  delivery_fee numeric not null default 0,
  total numeric not null default 0,
  notes text,
  status text not null default 'Pending',
  created_at timestamptz not null default now()
);

create table settings (
  id int primary key default 1,
  shop_name text default 'Golden Grain',
  tagline text default 'Freshly milled rice, straight from the farm to your table.',
  phone text default '0917 555 0123',
  address text default '123 Rizal Ave, Poblacion',
  delivery_fee numeric default 100,
  free_delivery_over numeric default 1500,
  updated_at timestamptz default now(),
  constraint settings_single_row check (id = 1)
);

insert into settings (id) values (1);

-- ---------- ATOMIC ORDER FUNCTIONS ----------
create or replace function place_order(
  p_customer_name text, p_customer_phone text, p_customer_address text,
  p_delivery_method text, p_items jsonb, p_subtotal numeric,
  p_delivery_fee numeric, p_total numeric, p_notes text
) returns orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order orders;
  v_item jsonb;
  v_product products;
  v_product_id uuid;
  v_qty numeric;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_delivery_fee numeric := 0;
  v_total numeric;
  v_order_no text;
  v_settings settings;
begin
  if coalesce(trim(p_customer_name), '') = '' or coalesce(trim(p_customer_phone), '') = '' then
    raise exception 'Customer name and phone are required.';
  end if;
  if p_delivery_method is null or p_delivery_method not in ('pickup', 'delivery') then
    raise exception 'Invalid delivery method.';
  end if;
  if p_delivery_method = 'delivery' and coalesce(trim(p_customer_address), '') = '' then
    raise exception 'A delivery address is required.';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Order items must be an array.';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'An order must contain at least one item.';
  end if;

  select * into v_settings from settings where id = 1;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) is distinct from 'object' then
      raise exception 'Invalid order item.';
    end if;

    begin
      v_product_id := nullif(v_item->>'productId', '')::uuid;
      v_qty := nullif(v_item->>'qty', '')::numeric;
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'Invalid product or quantity in order.';
    end;

    if v_product_id is null or v_qty is null or v_qty <= 0
       or v_qty::text in ('NaN', 'Infinity', '-Infinity') then
      raise exception 'Each item must have a valid product and positive quantity.';
    end if;

    select * into v_product
      from products
      where id = v_product_id and posted = true
      for update;
    if not found then
      raise exception 'A selected rice product is no longer available.';
    end if;
    if v_product.stock_kg < v_qty then
      raise exception 'Only % kg of % is currently available.', v_product.stock_kg, v_product.name;
    end if;

    update products
      set stock_kg = stock_kg - v_qty,
          updated_at = now()
      where id = v_product.id;

    v_subtotal := v_subtotal + (v_qty * v_product.price_per_kg);
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id,
      'name', v_product.name,
      'qty', v_qty,
      'price', v_product.price_per_kg
    ));
  end loop;

  v_subtotal := round(v_subtotal, 2);
  if p_delivery_method = 'delivery'
     and v_subtotal < coalesce(v_settings.free_delivery_over, 1500) then
    v_delivery_fee := coalesce(v_settings.delivery_fee, 100);
  end if;
  v_total := v_subtotal + v_delivery_fee;
  v_order_no := 'SO-' || lpad(nextval('public.order_no_seq')::text, 4, '0');

  insert into orders (
    order_no, customer_name, customer_phone, customer_address,
    delivery_method, items, subtotal, delivery_fee, total, notes
  ) values (
    v_order_no,
    p_customer_name, p_customer_phone, p_customer_address,
    p_delivery_method, v_items, v_subtotal, v_delivery_fee, v_total, p_notes
  ) returning * into v_order;
  return v_order;
end;
$$;

create or replace function cancel_order(p_order_id uuid)
returns void language plpgsql security definer as $$
declare v_item jsonb; v_status text;
begin
  select status into v_status from orders where id = p_order_id;
  if v_status = 'Cancelled' then return; end if;
  for v_item in select * from jsonb_array_elements((select items from orders where id = p_order_id)) loop
    update products
      set stock_kg = stock_kg + (v_item->>'qty')::numeric,
          updated_at = now()
      where id = (v_item->>'productId')::uuid;
  end loop;
  update orders set status = 'Cancelled' where id = p_order_id;
end;
$$;

-- ---------- ROW LEVEL SECURITY ----------
alter table products enable row level security;
alter table orders   enable row level security;
alter table settings enable row level security;

create policy "products_public_read" on products for select using (true);
create policy "products_all"         on products for all    using (true) with check (true);
create policy "orders_insert"        on orders   for insert with check (true);
create policy "orders_read"          on orders   for select using (true);
create policy "orders_update"        on orders   for update using (true);
create policy "settings_read"        on settings for select using (true);
create policy "settings_update"      on settings for update using (true);

-- ---------- STORAGE BUCKET FOR RICE PHOTOS ----------
insert into storage.buckets (id, name, public)
values ('rice-photos', 'rice-photos', true)
on conflict (id) do nothing;

create policy "rice_photos_public_read"
on storage.objects for select
using (bucket_id = 'rice-photos');

create policy "rice_photos_anon_insert"
on storage.objects for insert
with check (bucket_id = 'rice-photos');

create policy "rice_photos_anon_update"
on storage.objects for update
using (bucket_id = 'rice-photos');

create policy "rice_photos_anon_delete"
on storage.objects for delete
using (bucket_id = 'rice-photos');

-- ---------- SEED DEMO PRODUCTS ----------
insert into products (name, variety, grade, price_per_kg, cost_per_kg, stock_kg, reorder_kg, image_url, origin, description, posted)
values
  ('Jasmine Rice','Jasmine','Premium',68,58,450,100,'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80','Nueva Ecija','Fragrant long-grain rice with a soft, fluffy texture. Perfect for everyday meals.',true),
  ('Sinandomeng','Sinandomeng','Grade A',52,44,800,150,'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=800&q=80','Tarlac','The Filipino household staple — versatile, affordable, always reliable.',true),
  ('Dinorado','Dinorado','Premium',72,62,220,100,'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=80','Isabela','Premium aromatic rice with a distinct nutty aroma. Great for special occasions.',true),
  ('Brown Rice','Brown','Grade A',65,55,85,100,'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=800&q=80','Nueva Ecija','Unpolished whole-grain rice, high in fiber. A healthier choice for the family.',true),
  ('Malagkit (Glutinous)','Glutinous','Grade A',75,64,130,50,'https://images.unsplash.com/photo-1614961233913-a5113a4a34ed?auto=format&fit=crop&w=800&q=80','Bulacan','Sticky rice for kakanin, bibingka and puto. Sold by the kilo.',true),
  ('Basmati','Basmati','Premium',120,105,60,40,'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?auto=format&fit=crop&w=800&q=80','Imported','Extra-long aromatic grains that cook up light and separate. Restaurant favourite.',true);
`;
