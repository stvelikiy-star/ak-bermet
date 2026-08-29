-- AK BERMET manual manager payment ledger.
-- No acquiring / card processing is performed here: staff only records a payment fact.

create table if not exists public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  paid_at timestamptz not null,
  method text not null,
  amount_kgs numeric(14,2) not null,
  currency text not null default 'KGS',
  status text not null default 'confirmed',
  receipt_url text,
  confirmed_by uuid not null,
  confirmed_at timestamptz not null default now(),
  balance_after_kgs numeric(14,2) not null,
  notes text,
  void_reason text,
  voided_by uuid,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint booking_payments_method_nonempty check (btrim(method) <> ''),
  constraint booking_payments_amount_positive check (amount_kgs > 0),
  constraint booking_payments_currency_nonempty check (btrim(currency) <> ''),
  constraint booking_payments_status check (status in ('confirmed','void')),
  constraint booking_payments_balance_nonnegative check (balance_after_kgs >= 0),
  constraint booking_payments_void_shape check (
    (status = 'confirmed' and void_reason is null and voided_by is null and voided_at is null)
    or
    (status = 'void' and void_reason is not null and voided_by is not null and voided_at is not null)
  )
);

create index if not exists booking_payments_booking_idx
  on public.booking_payments (booking_id, paid_at desc)
  where deleted_at is null;
create index if not exists booking_payments_paid_at_idx
  on public.booking_payments (paid_at desc)
  where deleted_at is null;

alter table public.booking_payments enable row level security;
revoke all on public.booking_payments from anon;
revoke insert, update, delete on public.booking_payments from authenticated;
grant select on public.booking_payments to authenticated;

drop policy if exists booking_payments_manager_read on public.booking_payments;
create policy booking_payments_manager_read
on public.booking_payments
for select
to authenticated
using (
  public.has_role('owner')
  or public.has_role('administrator')
  or public.has_role('manager')
);

create or replace function public.fn_record_manual_payment(
  p_booking_id uuid,
  p_paid_at timestamptz,
  p_method text,
  p_amount_kgs numeric,
  p_receipt_url text default null,
  p_notes text default null
)
returns table (
  payment_id uuid,
  result_booking_id uuid,
  amount_kgs numeric,
  balance_after_kgs numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_paid_before numeric(14,2);
  v_balance numeric(14,2);
  v_payment_id uuid;
begin
  if v_user_id is null or not (
    public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')
  ) then
    raise exception 'manual_payment_not_authorized' using errcode = '42501';
  end if;

  if p_booking_id is null then
    raise exception 'booking_id_required' using errcode = '22023';
  end if;
  if p_paid_at is null then
    raise exception 'paid_at_required' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_method, '')), '') is null then
    raise exception 'payment_method_required' using errcode = '22023';
  end if;
  if p_amount_kgs is null or p_amount_kgs <= 0 then
    raise exception 'invalid_payment_amount' using errcode = '22023';
  end if;
  if length(coalesce(p_method, '')) > 120
     or length(coalesce(p_receipt_url, '')) > 2000
     or length(coalesce(p_notes, '')) > 4000 then
    raise exception 'payment_field_too_long' using errcode = '22023';
  end if;

  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.deleted_at is null
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = '22023';
  end if;

  select coalesce(sum(bp.amount_kgs), 0)
  into v_paid_before
  from public.booking_payments bp
  where bp.booking_id = v_booking.id
    and bp.status = 'confirmed'
    and bp.deleted_at is null;

  -- Balance is an operational booking balance, not a bank/accounting balance.
  -- Overpayment is allowed because manually recorded money may include services
  -- not yet folded into the lodging total. The displayed balance never goes negative.
  v_balance := greatest(v_booking.total_amount_kgs - (v_paid_before + p_amount_kgs), 0);

  insert into public.booking_payments (
    booking_id,
    paid_at,
    method,
    amount_kgs,
    currency,
    status,
    receipt_url,
    confirmed_by,
    confirmed_at,
    balance_after_kgs,
    notes
  ) values (
    v_booking.id,
    p_paid_at,
    btrim(p_method),
    round(p_amount_kgs, 2),
    'KGS',
    'confirmed',
    nullif(btrim(coalesce(p_receipt_url, '')), ''),
    v_user_id,
    now(),
    v_balance,
    nullif(btrim(coalesce(p_notes, '')), '')
  ) returning id into v_payment_id;

  return query
  select v_payment_id, v_booking.id, round(p_amount_kgs, 2), v_balance;
end;
$$;

revoke all on function public.fn_record_manual_payment(uuid, timestamptz, text, numeric, text, text) from public;
revoke execute on function public.fn_record_manual_payment(uuid, timestamptz, text, numeric, text, text) from anon;
grant execute on function public.fn_record_manual_payment(uuid, timestamptz, text, numeric, text, text) to authenticated;
grant execute on function public.fn_record_manual_payment(uuid, timestamptz, text, numeric, text, text) to service_role;

create or replace function public.fn_void_manual_payment(
  p_payment_id uuid,
  p_reason text
)
returns table (
  payment_id uuid,
  result_booking_id uuid,
  current_confirmed_total_kgs numeric,
  current_balance_kgs numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_payment public.booking_payments%rowtype;
  v_booking public.bookings%rowtype;
  v_confirmed_total numeric(14,2);
  v_balance numeric(14,2);
begin
  if v_user_id is null or not (
    public.has_role('owner') or public.has_role('administrator') or public.has_role('manager')
  ) then
    raise exception 'manual_payment_not_authorized' using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'void_reason_required' using errcode = '22023';
  end if;
  if length(coalesce(p_reason, '')) > 1000 then
    raise exception 'payment_field_too_long' using errcode = '22023';
  end if;

  select bp.* into v_payment
  from public.booking_payments bp
  where bp.id = p_payment_id
    and bp.deleted_at is null
  for update;

  if not found then
    raise exception 'payment_not_found' using errcode = '22023';
  end if;
  if v_payment.status <> 'confirmed' then
    raise exception 'payment_already_void' using errcode = '22023';
  end if;

  select b.* into v_booking
  from public.bookings b
  where b.id = v_payment.booking_id
    and b.deleted_at is null
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = '22023';
  end if;

  -- Compute the post-void confirmed total before changing the row so the
  -- historical payment record and Google mirror both carry the new balance.
  select coalesce(sum(bp.amount_kgs), 0)
  into v_confirmed_total
  from public.booking_payments bp
  where bp.booking_id = v_booking.id
    and bp.status = 'confirmed'
    and bp.deleted_at is null
    and bp.id <> v_payment.id;

  v_balance := greatest(v_booking.total_amount_kgs - v_confirmed_total, 0);

  update public.booking_payments
  set status = 'void',
      void_reason = btrim(p_reason),
      voided_by = v_user_id,
      voided_at = now(),
      balance_after_kgs = v_balance,
      updated_at = now()
  where id = v_payment.id;

  return query
  select v_payment.id, v_booking.id, v_confirmed_total, v_balance;
end;
$$;

revoke all on function public.fn_void_manual_payment(uuid, text) from public;
revoke execute on function public.fn_void_manual_payment(uuid, text) from anon;
grant execute on function public.fn_void_manual_payment(uuid, text) to authenticated;
grant execute on function public.fn_void_manual_payment(uuid, text) to service_role;

-- One-way secondary mirror. Supabase remains the transaction authority.
drop trigger if exists trg_sheets_sync_booking_payments on public.booking_payments;
create trigger trg_sheets_sync_booking_payments
after insert or update or delete on public.booking_payments
for each row execute function public.fn_enqueue_sheets_sync('Оплаты');
