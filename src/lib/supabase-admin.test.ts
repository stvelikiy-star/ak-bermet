import test from "node:test";
import assert from "node:assert/strict";
import {
  AvailabilityHoldReadError,
  AvailabilityHoldRpcError,
  availabilityHoldRpcHttpStatus,
  createAvailabilityHoldRpc,
  listActiveAvailabilityHolds,
  type AvailabilityHoldReadClient,
  type AvailabilityHoldRpcClient,
} from "./supabase-admin.ts";

test("availability hold database errors map to required HTTP statuses", () => {
  assert.equal(availabilityHoldRpcHttpStatus("AKB01"), 400);
  assert.equal(availabilityHoldRpcHttpStatus("AKB02"), 409);
  assert.equal(availabilityHoldRpcHttpStatus("AKB03"), 404);
  assert.equal(availabilityHoldRpcHttpStatus("23P01"), 409);
  assert.equal(availabilityHoldRpcHttpStatus("unexpected"), 503);
});

test("listActiveAvailabilityHolds reads the same availability_holds store written by the RPC", async () => {
  const captured: string[] = [];
  const client: AvailabilityHoldReadClient = {
    from(name) {
      captured.push(`from:${name}`);
      return {
        select(columns) {
          captured.push(`select:${columns}`);
          return {
            eq(column, value) {
              captured.push(`eq:${column}:${value}`);
              return {
                async gt(gtColumn, gtValue) {
                  captured.push(`gt:${gtColumn}:${gtValue}`);
                  return {
                    data: [
                      {
                        id: "hold-id",
                        room_unit_id: "room-id",
                        date_range: "[2026-09-01,2026-09-03)",
                        status: "active",
                        created_at: "2026-08-12T00:00:00.000Z",
                        expires_at: "2026-08-12T01:00:00.000Z",
                        idempotency_key: "private-key",
                      },
                    ],
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const result = await listActiveAvailabilityHolds(
    new Date("2026-08-12T00:30:00.000Z"),
    client
  );

  assert.equal(captured[0], "from:availability_holds");
  assert.ok(captured.some((item) => item.includes("date_range")));
  assert.ok(captured.includes("eq:status:active"));
  assert.ok(
    captured.includes("gt:expires_at:2026-08-12T00:30:00.000Z")
  );
  assert.deepEqual(result, [
    {
      id: "hold-id",
      room_unit_id: "room-id",
      check_in: "2026-09-01",
      check_out: "2026-09-03",
      status: "active",
      created_at: "2026-08-12T00:00:00.000Z",
      expires_at: "2026-08-12T01:00:00.000Z",
      idempotency_key: "private-key",
    },
  ]);
});

test("listActiveAvailabilityHolds fails closed on malformed database daterange", async () => {
  const client: AvailabilityHoldReadClient = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async gt() {
                  return {
                    data: [
                      {
                        id: "hold-id",
                        room_unit_id: "room-id",
                        date_range: "malformed",
                        status: "active",
                      },
                    ],
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  await assert.rejects(
    listActiveAvailabilityHolds(new Date(), client),
    AvailabilityHoldReadError
  );
});

test("createAvailabilityHoldRpc sends authenticated identity and normalizes the database daterange", async () => {
  let captured: Parameters<AvailabilityHoldRpcClient["rpc"]> | undefined;
  const client: AvailabilityHoldRpcClient = {
    async rpc(...args) {
      captured = args;
      return {
        data: {
          id: "hold-id",
          room_unit_id: "room-id",
          date_range: "[2026-09-01,2026-09-03)",
          status: "active",
          expires_at: "2026-09-01T01:00:00.000Z",
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
  assert.equal(result.check_in, "2026-09-01");
  assert.equal(result.check_out, "2026-09-03");
  assert.equal(result.status, "active");
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
