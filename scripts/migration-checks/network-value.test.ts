import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import type { NetworkSnapshot } from "../../src/features/network-value/model";
const A = "10000000-0000-4000-8000-000000000001",
  B = "10000000-0000-4000-8000-000000000002",
  C = "10000000-0000-4000-8000-000000000003",
  D = "10000000-0000-4000-8000-000000000004";
const postId = "20000000-0000-4000-8000-000000000001",
  agreementId = "30000000-0000-4000-8000-000000000001";
let db: PGlite;
async function as<T>(uid: string | null, sql: string, args: unknown[] = []) {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${uid ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid ?? ""]);
    const r = await db.query<T>(sql, args);
    await db.exec("commit");
    return r.rows;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}
async function call(
  uid: string | null,
  action: string,
  data: unknown = {},
): Promise<NetworkSnapshot> {
  return (
    await as<{ r: NetworkSnapshot }>(uid, "select public.network_value($1,$2::jsonb) r", [
      action,
      JSON.stringify(data),
    ])
  )[0]!.r;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
 create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;
 create table public.profiles(id uuid primary key references auth.users(id),name text,company text,approved boolean default true);
 create table public.member_verifications(user_id uuid unique references auth.users(id),status text,verified_at timestamptz,business_name text);
 create table public.deal_rooms(id uuid primary key);
 create function public.is_approved_member(u uuid) returns boolean language sql stable security definer as $$select coalesce((select approved from public.profiles where id=u),false)$$;
 create function public.is_live_member() returns boolean language sql stable security definer as $$select public.is_approved_member(auth.uid())$$;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 `);
  await db.exec(readFileSync("drizzle/migrations/0071_referrals.sql", "utf8"));
  const candidate = readFileSync("drizzle/migrations/0096_network_value_systems.sql", "utf8");
  try {
    await db.exec(candidate);
  } catch (e) {
    const error = e as { position?: string; message: string };
    throw new Error(
      error.message +
        " near " +
        candidate.slice(Number(error.position) - 150, Number(error.position) + 150),
    );
  }
  for (const [i, id] of [A, B, C, D].entries()) {
    await db.query("insert into auth.users values($1)", [id]);
    await db.query("insert into public.profiles(id,name,company) values($1,$2,$3)", [
      id,
      `Test member ${i}`,
      `Test company ${i}`,
    ]);
    if (id !== D)
      await db.query("insert into public.member_verifications values($1,'verified',now(),$2)", [
        id,
        `Test company ${i}`,
      ]);
  }
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("authoritative network controls in isolated Postgres", () => {
  it("denies anonymous calls and all direct raw-table reads or writes", async () => {
    await expect(call(null, "load")).rejects.toThrow();
    for (const t of [
      "nv_locations",
      "nv_capacity_posts",
      "nv_capacity_letters",
      "nv_benchmark_enrollments",
      "nv_benchmark_contributions",
      "nv_benchmark_releases",
      "nv_settlements",
      "nv_settlement_signatures",
      "nv_settlement_events",
    ])
      await expect(as(A, `select * from public.${t}`)).rejects.toThrow();
    await expect(
      as(A, "select network_value_private.publish_benchmarks('2020-01-01')"),
    ).rejects.toThrow();
    await expect(call(D, "capacity_post", { id: postId })).rejects.toThrow("Verified business");
  });
  it("rounds location and enforces post visibility and ownership", async () => {
    const first = await call(A, "location", {
      city: "Test city",
      latitude: 40.12345,
      longitude: -86.12345,
    });
    expect(first.location?.latitude).toBe(40.1);
    await call(B, "location", { city: "Test city", latitude: 40.1, longitude: -86.1 });
    await call(C, "location", { city: "Distant city", latitude: 35, longitude: -110 });
    await call(A, "capacity_post", {
      id: postId,
      kind: "available",
      title: "Test capacity",
      details: "Test crew",
      starts_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      radius: 60,
    });
    const nearby = await call(B, "load");
    expect(nearby.posts).toHaveLength(1);
    expect(nearby.posts[0]).not.toHaveProperty("latitude");
    expect(nearby.posts[0]).not.toHaveProperty("longitude");
    expect((await call(C, "load")).posts).toHaveLength(0);
    expect((await call(D, "load")).posts).toHaveLength(0);
    await expect(
      call(C, "capacity_request", { post_id: postId, note: "Outside range" }),
    ).rejects.toThrow();
    await expect(call(B, "capacity_close", { id: postId })).rejects.toThrow();
  });
  it("keeps Letters private and prevents acceptance of stale or self-offered terms", async () => {
    const requested = await call(B, "capacity_request", {
      post_id: postId,
      note: "Need help on Tuesday",
    });
    const id = requested.letters[0]!.id;
    await call(B, "capacity_request", { post_id: postId, note: "Retry" });
    expect((await call(B, "load")).letters).toHaveLength(1);
    expect((await call(C, "load")).letters).toHaveLength(0);
    await expect(call(B, "capacity_terms", { id, terms: "I set owner terms" })).rejects.toThrow();
    await call(A, "capacity_terms", { id, terms: "Tuesday with agreed supervision" });
    await call(A, "capacity_terms", { id, terms: "Wednesday with agreed supervision" });
    await expect(
      call(B, "capacity_accept", { id, terms: "Tuesday with agreed supervision" }),
    ).rejects.toThrow("Terms changed");
    await expect(
      call(A, "capacity_accept", { id, terms: "Wednesday with agreed supervision" }),
    ).rejects.toThrow();
    await call(B, "capacity_accept", { id, terms: "Wednesday with agreed supervision" });
    await expect(call(A, "capacity_terms", { id, terms: "Silently changed" })).rejects.toThrow();
    await db.query(
      "update public.nv_capacity_posts set expires_at=now()-interval '1 hour',starts_at=now()-interval '2 hours' where id=$1",
      [postId],
    );
    expect((await call(B, "load")).posts).toHaveLength(0);
    expect((await call(B, "load")).letters[0]?.state).toBe("accepted");
    await expect(
      call(B, "capacity_request", { post_id: postId, note: "Expired" }),
    ).rejects.toThrow();
  });
  it("requires explicit contribution consent and an operator-assigned company cohort", async () => {
    await expect(
      call(A, "benchmark_share", { metric: "close_percent", value: 20, consent: true }),
    ).rejects.toThrow();
    await db.query(
      "insert into public.nv_benchmark_enrollments(user_id,business_key,trade,size_band,region) values($1,'verified-business-A','HVAC','10 to 50','Midwest')",
      [A],
    );
    await expect(
      call(A, "benchmark_share", { metric: "close_percent", value: 20, consent: false }),
    ).rejects.toThrow();
    await expect(
      call(A, "benchmark_share", { metric: "close_percent", value: 101, consent: true }),
    ).rejects.toThrow();
    await call(A, "benchmark_share", { metric: "close_percent", value: 20, consent: true });
    expect((await call(A, "load")).benchmarks).toHaveLength(0);
    await expect(
      db.query(
        "insert into public.nv_benchmark_enrollments(user_id,business_key,trade,size_band,region) values($1,'verified-business-A','HVAC','10 to 50','Midwest')",
        [B],
      ),
    ).rejects.toThrow();
  });
  it("suppresses nine companies in SQL, releases ten, and exposes only contributed metrics", async () => {
    await db.exec("update public.nv_benchmark_contributions set period='2020-01-01'");
    for (let i = 2; i <= 9; i++) {
      const id = `40000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
      await db.query("insert into auth.users values($1)", [id]);
      await db.query(
        "insert into public.nv_benchmark_enrollments(user_id,business_key,trade,size_band,region) values($1,$2,'HVAC','10 to 50','Midwest')",
        [id, `company-${i}`],
      );
      await db.query(
        "insert into public.nv_benchmark_contributions(user_id,business_key,trade,size_band,region,period,metric,value) values($1,$2,'HVAC','10 to 50','Midwest','2020-01-01','close_percent',$3)",
        [id, `company-${i}`, 20 + i],
      );
    }
    expect(
      (
        await db.query<{ n: number }>(
          "select network_value_private.publish_benchmarks('2020-01-01') n",
        )
      ).rows[0]?.n,
    ).toBe(0);
    await db.query(
      "insert into public.nv_benchmark_enrollments(user_id,business_key,trade,size_band,region) values($1,'company-10','HVAC','10 to 50','Midwest')",
      [B],
    );
    await db.query(
      "insert into public.nv_benchmark_contributions(user_id,business_key,trade,size_band,region,period,metric,value) values($1,'company-10','HVAC','10 to 50','Midwest','2020-01-01','close_percent',40)",
      [B],
    );
    expect(
      (
        await db.query<{ n: number }>(
          "select network_value_private.publish_benchmarks('2020-01-01') n",
        )
      ).rows[0]?.n,
    ).toBe(1);
    const result = (await call(A, "load")).benchmarks;
    expect(result).toHaveLength(1);
    expect(result[0]?.companies_at_least).toBe(10);
    expect(result[0]?.metric).toBe("close_percent");
    expect((await call(C, "load")).benchmarks).toHaveLength(0);
    await call(A, "benchmark_withdraw", { metric: "close_percent" });
    expect((await call(A, "load")).benchmarks).toHaveLength(0);
    expect((await call(B, "load")).benchmarks[0]?.median).toBe(result[0]?.median);
    expect(
      (
        await db.query<{ n: number }>(
          "select network_value_private.publish_benchmarks('2020-01-01') n",
        )
      ).rows[0]?.n,
    ).toBe(0);
  });
  it("requires three signatures on identical preserved terms before a canonical referral is created", async () => {
    await call(A, "settlement_create", {
      id: agreementId,
      title: "Test referral terms",
      seller_id: B,
      buyer_id: C,
      rate_bps: 500,
      cap_cents: 250000,
      window_months: 12,
    });
    const s = (await call(A, "load")).settlements[0]!;
    expect(s.terms_hash).toHaveLength(64);
    await expect(call(A, "settlement_release", { id: agreementId })).rejects.toThrow("All three");
    await expect(
      call(B, "settlement_sign", {
        id: agreementId,
        typed_name: "Seller",
        terms_hash: "wrong",
        consent: true,
      }),
    ).rejects.toThrow();
    for (const [uid, name] of [
      [A, "Connector"],
      [B, "Seller"],
      [C, "Buyer"],
    ])
      await call(uid!, "settlement_sign", {
        id: agreementId,
        typed_name: name,
        terms_hash: s.terms_hash,
        consent: true,
      });
    await expect(call(B, "settlement_release", { id: agreementId })).rejects.toThrow();
    await call(A, "settlement_release", { id: agreementId });
    await call(A, "settlement_release", { id: agreementId });
    expect(
      (await db.query<{ n: number }>("select count(*)::int n from public.referrals")).rows[0]?.n,
    ).toBe(1);
    expect((await call(D, "load")).settlements).toHaveLength(0);
    await expect(call(A, "settlement_cancel", { id: agreementId })).rejects.toThrow();
  });
  it("requires responsible actors and ordered evidence, never reports a Stripe payout", async () => {
    await expect(
      call(A, "settlement_confirm", {
        id: agreementId,
        step: "intro_accepted",
        evidence: "Connector cannot confirm for buyer",
      }),
    ).rejects.toThrow();
    await expect(
      call(B, "settlement_confirm", {
        id: agreementId,
        step: "closed_won",
        evidence: "Skip stages",
      }),
    ).rejects.toThrow();
    for (const step of ["intro_accepted", "meeting_held"])
      await call(C, "settlement_confirm", {
        id: agreementId,
        step,
        evidence: "Buyer confirmation",
      });
    for (const step of ["proposal_sent", "closed_won"])
      await call(B, "settlement_confirm", {
        id: agreementId,
        step,
        evidence: "Seller confirmation",
      });
    await expect(
      call(B, "settlement_confirm", {
        id: agreementId,
        step: "invoice_paid",
        evidence: "No amount",
      }),
    ).rejects.toThrow();
    const result = await call(B, "settlement_confirm", {
      id: agreementId,
      step: "invoice_paid",
      evidence: "Seller invoice record",
      invoice_cents: 100000,
    });
    expect(result.settlements[0]?.events).toHaveLength(5);
    expect(result.settlements[0]).not.toHaveProperty("paid_out");
    await expect(as(B, "update public.nv_settlements set cap_cents=999999")).rejects.toThrow();
  });
});
