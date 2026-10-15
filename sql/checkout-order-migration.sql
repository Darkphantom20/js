-- Safely updates order pricing and stock checks without dropping shop data.
create sequence if not exists public.order_no_seq;

select setval(
  'public.order_no_seq',
  coalesce(max(substring(order_no from '^SO-([0-9]+)$')::bigint), 1),
  coalesce(max(substring(order_no from '^SO-([0-9]+)$')::bigint), 0) > 0
)
from public.orders;

create or replace function public.place_order(
  p_customer_name text, p_customer_phone text, p_customer_address text,
  p_delivery_method text, p_items jsonb, p_subtotal numeric,
  p_delivery_fee numeric, p_total numeric, p_notes text
) returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_product public.products;
  v_product_id uuid;
  v_qty numeric;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_delivery_fee numeric := 0;
  v_total numeric;
  v_order_no text;
  v_settings public.settings;
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

  select * into v_settings from public.settings where id = 1;

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
      from public.products
      where id = v_product_id and posted = true
      for update;
    if not found then
      raise exception 'A selected rice product is no longer available.';
    end if;
    if v_product.stock_kg < v_qty then
      raise exception 'Only % kg of % is currently available.', v_product.stock_kg, v_product.name;
    end if;

    update public.products
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

  insert into public.orders (
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
