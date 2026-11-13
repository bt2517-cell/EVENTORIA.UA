-- Виконати у Supabase SQL Editor лише для нового проєкту EVENTORIA.
create table if not exists public.customer_orders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 details jsonb not null,
 status text not null default 'Нова',
 created_at timestamptz not null default now()
);
create index if not exists customer_orders_user_idx on public.customer_orders(user_id);
alter table public.customer_orders enable row level security;
revoke all on public.customer_orders from anon, authenticated;
grant select, insert on public.customer_orders to authenticated;
drop policy if exists "Customers read own orders" on public.customer_orders;
create policy "Customers read own orders" on public.customer_orders for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Customers create own orders" on public.customer_orders;
create policy "Customers create own orders" on public.customer_orders for insert to authenticated with check ((select auth.uid()) = user_id and status='Нова');
-- Для менеджера/адміна потрібен окремий захищений доступ. Не додавайте публічні політики читання всіх замовлень.
