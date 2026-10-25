import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const A = "10000000-0000-4000-8000-000000000001",
  B = "10000000-0000-4000-8000-000000000002",
  C = "10000000-0000-4000-8000-000000000003",
  D = "10000000-0000-4000-8000-000000000004";
let db: PGlite;
async function as(uid: string | null, sql: string, args: unknown[] = []) {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${uid ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid ?? ""]);
    const r = await db.query(sql, args);
    await db.exec("commit");
    return r.rows as any[];
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}
async function call(uid: string | null, action = "load", data: unknown = {}) {
  return (
    await as(uid, "select public.evidence_workspace($1,$2::jsonb) r", [
      action,
      JSON.stringify(data),
    ])
  )[0]?.r as any;
}
async function signals(uid: string | null, ids = [B]) {
  return as(uid, "select * from public.match_evidence_signals($1::uuid[])", [ids]);
}
const prefs = { timing: true, ranking: true, newcomer: true };
beforeAll(async () => {
  db = new PGlite();
  // Disposable dependency fixture, not a statement about production migration compatibility.
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key,created_at timestamptz default now(),active boolean default true);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
 create function public.is_live_member() returns boolean language sql security definer set search_path='' as $$select exists(select 1 from auth.users where id=auth.uid() and active)$$;
 create function public.is_approved_member(uid uuid) returns boolean language sql security definer set search_path='' as $$select exists(select 1 from auth.users where id=uid and active)$$;
 create function public.is_verified_member() returns boolean language sql as $$select public.is_live_member()$$;
 create table public.profiles(id uuid primary key,name text default 'Example member',onboarded boolean default true,visibility text default 'network');
 create table public.member_verifications(user_id uuid,status text);
 create table public.intro_requests(id uuid primary key,user_id uuid,target_user_id uuid,requester_opt_in boolean default true,member_opt_in boolean default true,accepted_at timestamptz default now());
 create table public.intro_outcomes(id uuid primary key default gen_random_uuid(),intro_request_id uuid,author_id uuid,stage text,outcome_category text,shareable boolean default true,attribution text default 'direct',created_at timestamptz default now());`);
  const guard = readFileSync(
    new URL("../../drizzle/migrations/0004_opportunity_graph_hardening.sql", import.meta.url),
    "utf8",
  ).match(/create or replace function public.freeze_columns\(\)[\s\S]*?end \$\$;/i)![0];
  await db.exec(guard);
  for (const id of [A, B, C, D]) {
    await db.query("insert into auth.users(id,active) values($1,$2)", [id, id !== D]);
    await db.query("insert into profiles(id) values($1)", [id]);
    await db.query("insert into member_verifications values($1,'verified')", [id]);
  }
  await db.exec(
    readFileSync(
      new URL(
        "../../drizzle/migrations/0001_unified_executive_profiles_and_recommendations.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      new URL("../../drizzle/migrations/0098_evidence_loop.sql", import.meta.url),
      "utf8",
    ),
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("Evidence authority and private timing", () => {
  it("blocks anonymous/inactive access and direct writes", async () => {
    await expect(call(null)).rejects.toThrow();
    await expect(call(D)).rejects.toThrow();
    await expect(signals(null)).rejects.toThrow();
    await expect(
      as(A, "insert into evidence_preferences(owner_id,timing) values($1,true)", [A]),
    ).rejects.toThrow();
    await expect(as(A, "truncate task_time_records")).rejects.toThrow();
    expect((await call(A)).preferences).toEqual({ timing: false, ranking: false, newcomer: false });
    await expect(call(A, "start", { task: "contact" })).rejects.toThrow("Enable");
  });
  it("requires consent, prevents concurrent tasks, isolates history and rejects forged elapsed time", async () => {
    await call(A, "preferences", prefs);
    await call(B, "preferences", prefs);
    const s = await call(A, "start", {
        task: "contact",
        baselineSeconds: 600,
        baselineKind: "estimate",
        baselineSamples: 1,
      }),
      id = s.records[0].id;
    expect((await call(B)).records).toEqual([]);
    expect(await as(B, "select * from task_time_records")).toEqual([]);
    await expect(call(A, "start", { task: "content" })).rejects.toThrow("current task");
    await expect(call(B, "finish", { id, activeSeconds: 1 })).rejects.toThrow("not found");
    await expect(call(A, "finish", { id, activeSeconds: 14400 })).rejects.toThrow("Invalid");
    await db.query(
      "update task_time_records set started_at=now()-interval '60 seconds' where id=$1",
      [id],
    );
    await call(A, "finish", { id, activeSeconds: 30 });
    const retry = await call(A, "finish", { id, activeSeconds: 50 });
    expect(retry.records[0].active_seconds).toBe(30);
    expect((await call(A)).records).toHaveLength(1);
    await call(B, "delete", { id });
    expect((await call(A)).records).toHaveLength(1);
  });
  it("revocation discards running work and rejects invalid baseline/unknown task", async () => {
    await expect(call(A, "start", { task: "anything" })).rejects.toThrow();
    await expect(
      call(A, "start", {
        task: "content",
        baselineSeconds: 60,
        baselineKind: "observed",
        baselineSamples: 0,
      }),
    ).rejects.toThrow();
    await call(A, "start", { task: "content" });
    await call(A, "preferences", { ...prefs, timing: false });
    expect((await call(A)).records.every((r: any) => r.finished_at)).toBe(true);
    await call(A, "erase");
    expect((await call(A)).records).toEqual([]);
  });
});
describe("Mutual, consented evidence and newcomers", () => {
  const intro = "20000000-0000-4000-8000-000000000001";
  it("excludes unilateral, private, contextual, inconsistent and withdrawn reports", async () => {
    await db.query("insert into intro_requests(id,user_id,target_user_id) values($1,$2,$3)", [
      intro,
      A,
      B,
    ]);
    await db.query(
      "insert into intro_outcomes(intro_request_id,author_id,stage,outcome_category) values($1,$2,'outcome','hire')",
      [intro, A],
    );
    expect((await signals(C))[0].confirmed_partners).toBe(0);
    await db.query(
      "insert into intro_outcomes(intro_request_id,author_id,stage,outcome_category,shareable) values($1,$2,'outcome','hire',false)",
      [intro, B],
    );
    expect((await signals(C))[0].confirmed_partners).toBe(0);
    await db.query("update intro_outcomes set shareable=true where author_id=$1", [B]);
    expect((await signals(C))[0].successful_partners).toBe(1);
    await db.query("update intro_outcomes set attribution='contextual' where author_id=$1", [B]);
    expect((await signals(C))[0].successful_partners).toBe(0);
    await db.query(
      "update intro_outcomes set attribution='direct',outcome_category='customer' where author_id=$1",
      [B],
    );
    expect((await signals(C))[0].successful_partners).toBe(0);
    await db.query("update intro_outcomes set outcome_category='hire' where author_id=$1", [B]);
    await call(A, "preferences", { ...prefs, ranking: false });
    expect((await signals(C))[0].successful_partners).toBe(0);
    await call(A, "preferences", prefs);
    await db.query(
      "insert into intro_outcomes(intro_request_id,author_id,stage,created_at) values($1,$2,'no_outcome',now()+interval '1 second')",
      [intro, B],
    );
    expect((await signals(C))[0].confirmed_partners).toBe(0);
    await db.query("delete from intro_outcomes where stage='no_outcome'");
    expect((await signals(C))[0].successful_partners).toBe(1);
  });
  it("deduplicates repeated partner introductions and filters hidden/unapproved members", async () => {
    const other = "20000000-0000-4000-8000-000000000002";
    await db.query("insert into intro_requests(id,user_id,target_user_id) values($1,$2,$3)", [
      other,
      A,
      B,
    ]);
    for (const id of [A, B])
      await db.query(
        "insert into intro_outcomes(intro_request_id,author_id,stage,outcome_category) values($1,$2,'outcome','hire')",
        [other, id],
      );
    expect((await signals(C))[0].confirmed_partners).toBe(1);
    expect(await signals(C, [D])).toEqual([]);
    await db.query("update profiles set visibility='private' where id=$1", [B]);
    expect(await signals(C)).toEqual([]);
    await db.query("update profiles set visibility='network' where id=$1", [B]);
    expect(Object.keys((await signals(C))[0]).sort()).toEqual([
      "approved_vouches",
      "confirmed_partners",
      "member_id",
      "newcomer_until",
      "successful_partners",
    ]);
  });
  it("derives first 30 days from auth creation and requires newcomer consent", async () => {
    expect((await signals(C))[0].newcomer_until).toBeTruthy();
    await call(B, "preferences", { ...prefs, newcomer: false });
    expect((await signals(C))[0].newcomer_until).toBeNull();
    await call(B, "preferences", prefs);
    await db.query("update auth.users set created_at=now()-interval '31 days' where id=$1", [B]);
    expect((await signals(C))[0].newcomer_until).toBeNull();
  });
  it("prevents authors from forging approval and invalidates vouches after edits", async () => {
    const [r] = await as(
      A,
      "insert into executive_recommendations(author_id,recipient_id,body,display_approved) values($1,$2,'I worked with this member.',true) returning id,display_approved",
      [A, B],
    );
    expect(r.display_approved).toBe(false);
    expect((await signals(C))[0].approved_vouches).toBe(0);
    await as(A, "select set_executive_recommendation_display($1,true)", [r.id]).then(
      () => {
        throw new Error("Should reject");
      },
      () => {},
    );
    await as(B, "select set_executive_recommendation_display($1,true)", [r.id]);
    expect((await signals(C))[0].approved_vouches).toBe(1);
    await as(A, "select update_my_executive_recommendation($1,'A changed recommendation.')", [
      r.id,
    ]);
    expect((await signals(C))[0].approved_vouches).toBe(0);
  });
});

describe('Seven and thirty day participant check-ins',()=>{
 it('asks both people at each milestone even after an early positive outcome',async()=>{
  await db.exec('grant select on public.intro_requests,public.intro_outcomes to authenticated')
  const id='20000000-0000-4000-8000-000000000099'
  await db.query("insert into intro_requests(id,user_id,target_user_id,accepted_at) values($1,$2,$3,now()-interval '8 days')",[id,A,B])
  for(const u of [A,B])await db.query("insert into intro_outcomes(intro_request_id,author_id,stage,created_at) values($1,$2,'outcome',now()-interval '7 days')",[id,u])
  const due=async(u:string)=>(await as(u,'select * from public.my_due_outcome_checkins()')).find(r=>r.intro_request_id===id)
  expect((await due(A))?.checkpoint).toBe(7);expect((await due(B))?.checkpoint).toBe(7);expect(await due(C)).toBeUndefined()
  await db.query("update intro_outcomes set created_at=now()-interval '12 hours' where intro_request_id=$1",[id])
  expect(await due(A)).toBeUndefined()
  await db.query("update intro_requests set accepted_at=now()-interval '31 days' where id=$1",[id])
  await db.query("update intro_outcomes set created_at=now()-interval '24 days' where intro_request_id=$1",[id])
  expect((await due(A))?.checkpoint).toBe(30);expect((await due(B))?.checkpoint).toBe(30)
  await db.query("insert into intro_outcomes(intro_request_id,author_id,stage) values($1,$2,'outcome')",[id,A])
  expect(await due(A)).toBeUndefined();expect((await due(B))?.checkpoint).toBe(30)
 })
})
