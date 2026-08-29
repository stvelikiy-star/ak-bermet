import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(new URL("./20260829115500_manual_payment_ledger.sql", import.meta.url), "utf8");
const api = fs.readFileSync(new URL("../../src/app/api/manager/payments/route.ts", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../../src/app/manager/payments/page.tsx", import.meta.url), "utf8");
const form = fs.readFileSync(new URL("../../src/components/manager/ManualPaymentForm.tsx", import.meta.url), "utf8");
const sql = migration.replace(/\s+/g, " ").toLowerCase();

test("manual payment ledger is role-gated and has no acquiring behavior", () => {
  assert.match(sql, /create table if not exists public\.booking_payments/);
  assert.match(sql, /create or replace function public\.fn_record_manual_payment/);
  assert.match(sql, /create or replace function public\.fn_void_manual_payment/);
  for (const role of ["owner", "administrator", "manager"]) {
    assert.match(sql, new RegExp(`public\\.has_role\\('${role}'\\)`));
  }
  assert.doesNotMatch(migration, /stripe|cloudpayments|visa|mastercard|acquir/i);
  assert.match(form, /никаких списаний или интернет-эквайринга здесь нет/);
});

test("manual payment writes only through guarded RPCs and anon cannot execute them", () => {
  assert.match(sql, /revoke execute on function public\.fn_record_manual_payment[\s\S]*from anon/);
  assert.match(sql, /revoke execute on function public\.fn_void_manual_payment[\s\S]*from anon/);
  assert.match(api, /supabase\.rpc\("fn_record_manual_payment"/);
  assert.match(api, /supabase\.rpc\("fn_void_manual_payment"/);
  assert.doesNotMatch(api, /\.from\("booking_payments"\)\.insert/);
  assert.doesNotMatch(api, /\.from\("booking_payments"\)\.delete/);
});

test("void preserves audit history and recomputes post-void balance", () => {
  assert.match(sql, /and bp\.id <> v_payment\.id/);
  assert.match(sql, /v_balance := greatest\(v_booking\.total_amount_kgs - v_confirmed_total, 0\)/);
  assert.match(sql, /set status = 'void'/);
  assert.match(sql, /void_reason = btrim\(p_reason\)/);
  assert.match(sql, /voided_by = v_user_id/);
  assert.match(sql, /balance_after_kgs = v_balance/);
  assert.doesNotMatch(sql, /delete from public\.booking_payments/);
});

test("payment changes enqueue one-way Google CRM mirror to Оплаты", () => {
  assert.match(migration, /trg_sheets_sync_booking_payments/);
  assert.match(migration, /fn_enqueue_sheets_sync\('Оплаты'\)/);
});

test("manager payments page reads real ledger and clearly labels manual facts", () => {
  assert.match(page, /\.from\("booking_payments"\)/);
  assert.match(page, /ManualPaymentForm/);
  assert.match(page, /Фактически зафиксировано/);
  assert.match(page, /не банковская/i);
  assert.match(page, /аннулируется с обязательной причиной/i);
});
