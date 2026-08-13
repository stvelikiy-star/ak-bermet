-- AK BERMET — public leads -> durable Google Sheets mirror queue
-- Supabase remains authoritative. This trigger only enqueues the committed
-- lead UUID for the asynchronous one-way mirror to the dedicated 07_Лиды sheet.

begin;

drop trigger if exists trg_sheets_sync_leads on public.leads;
create trigger trg_sheets_sync_leads
after insert or update or delete on public.leads
for each row execute function public.fn_enqueue_sheets_sync('07_Лиды');

commit;