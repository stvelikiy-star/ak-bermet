import test from "node:test";
import assert from "node:assert/strict";
import {
  AvailabilityHoldRpcError,
  availabilityHoldRpcHttpStatus,
  createAvailabilityHoldRpc,
  type AvailabilityHoldRpcClient,
} from "./supabase-admin.ts";

test("availability hold database errors map to required HTTP statuses", () => {
  assert.equal(availabilityHoldRpcHttpStatus("AKB01"), 400);
  assert.equal(availabilityHoldRpcHttpStatus("AKB02"), 409);
  assert.equal(availabilityHoldRpcHttpStatus("AKB03"), 404);
  assert.equal(availabilityHoldRpcHttpStatus("23P01"), 409);
  assert.equal(availabilityHoldRpcHttpStatus("unexpected"), 503);
});

test("createAvailabilityHoldRpc sends authenticated identity and returns the hold", async () => {
  let captured: Parameters<AvailabilityHoldRpcClient["rpc"]> | undefined;
  const client: AvailabilityHoldRpcClient = {
    async rpc(...args) {
      captured = args;
      return {
        data: {
          id: "hold-id",
          room_unit_id: "room-id",
          check_in: "2026-09-01",
          check_out: "2026-09-03",
          status: "pre_hold",
          idempotency_key: "private-key",
        },
        error: null,
      };
    },
  };

  const result = await createAvailabilityHoldRpc(
    {
      roomUnitId: "room-id",
      checkIn: "2026-09-01",
      checkOut: "2026-09-03",
      heldBy: "authenticated-staff-id",
      idempotencyKey: "private-key",
    },
    client
  );

  assert.equal(result.id, "hold-id");
  assert.deepEqual(captured, [
    "fn_create_availability_hold",
    {
      p_room_unit_id: "room-id",
      p_check_in: "2026-09-01",
      p_check_out: "2026-09-03",
      p_held_by: "authenticated-staff-id",
      p_lead_id: null,
      p_idempotency_key: "private-key",
    },
  ]);
});

for (const code of ["AKB01", "AKB02", "AKB03", "23P01"]) {
  test(`createAvailabilityHoldRpc preserves database error code ${code}`, async () => {
    const client: AvailabilityHoldRpcClient = {
      async rpc() {
        return { data: null, error: { code, message: "sensitive database detail" } };
      },
    };
    await assert.rejects(
      createAvailabilityHoldRpc(
        {
          roomUnitId: "room-id",
          checkIn: "2026-09-01",
          checkOut: "2026-09-03",
          heldBy: "staff-id",
          idempotencyKey: `error-${code}`,
        },
        client
      ),
      (error: unknown) => {
        assert.ok(error instanceof AvailabilityHoldRpcError);
        assert.equal(error.code, code);
        assert.doesNotMatch(error.message, /sensitive database detail/);
        return true;
      }
    );
  });
}
