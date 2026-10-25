import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const A = "10000000-0000-4000-8000-000000000001",
  B = "10000000-0000-4000-8000-000000000002",
  C = "10000000-0000-4000-8000-000000000003";
const employee = "20000000-0000-4000-8000-000000000001",
  job = "20000000-0000-4000-8000-000000000002";
let db: PGlite;
async function as(uid: string | null, query: string, args: unknown[] = []) {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${uid ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid ?? ""]);
    const r = await db.query(query, args);
    await db.exec("commit");
    return r.rows;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}
async function call(uid: string | null, action: string, payload: unknown = {}) {
  return (
    await as(uid, "select public.hr_workspace($1,$2::jsonb) result", [
      action,
      JSON.stringify(payload),
    ])
  )[0]?.result as any;
}
const context = {
  company: "Test Co",
  industry: "HVAC",
  description: "Install equipment",
  locations: "Indiana",
  teamSize: "12",
  workModel: "Field",
  priorities: "Hire well",
  policyContext: "",
};
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,active boolean default true);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create function public.is_live_member() returns boolean language sql security definer set search_path='' as $$select exists(select 1 from auth.users where id=auth.uid() and active)$$;`,
  );
  const identityGuard = readFileSync(
    new URL("../../drizzle/migrations/0004_opportunity_graph_hardening.sql", import.meta.url),
    "utf8",
  ).match(/create or replace function public.freeze_columns\(\)[\s\S]*?end \$\$;/i)![0];
  await db.exec(identityGuard);
  for (const id of [A, B, C])
    await db.query("insert into auth.users(id,active) values($1,$2)", [id, id !== C]);
  await db.exec(
    readFileSync(
      new URL("../../drizzle/migrations/0097_account_hr_workspace.sql", import.meta.url),
      "utf8",
    ),
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("Private HR database authority", () => {
  it("rejects anonymous and inactive members and denies direct record mutations", async () => {
    await expect(call(null, "load")).rejects.toThrow();
    await expect(call(C, "load")).rejects.toThrow();
    await expect(
      as(
        A,
        "insert into public.hr_records(id,owner_id,kind,fields) values($1,$2,'employee','{}')",
        [employee, A],
      ),
    ).rejects.toThrow();
    await expect(as(A, "truncate public.hr_records")).rejects.toThrow();
  });
  it("requires business confirmation, isolates accounts and prevents stale setup writes", async () => {
    await expect(
      call(A, "record", {
        record: {
          id: employee,
          kind: "employee",
          version: 0,
          fields: { name: "Test Person", role: "Installer", status: "Active", type: "Employee" },
        },
      }),
    ).rejects.toThrow("Confirm");
    await call(A, "context", { context, version: 0 });
    await call(B, "context", { context: { ...context, company: "Another Co" }, version: 0 });
    await expect(call(A, "context", { context, version: 0 })).rejects.toThrow("changed");
    expect((await call(B, "load")).context.company).toBe("Another Co");
    const own = await as(B, "select * from public.hr_workspaces");
    expect(own).toHaveLength(1);
    expect(own[0]?.owner_id).toBe(B);
  });
  it("saves and updates real records with version checks and no ownership reassignment", async () => {
    await call(A, "record", {
      record: {
        id: employee,
        kind: "employee",
        version: 0,
        fields: { name: "Test Person", role: "Installer", status: "Active", type: "Employee" },
      },
    });
    await call(A, "record", {
      record: {
        id: employee,
        kind: "employee",
        version: 1,
        fields: { name: "Test Person", role: "Lead installer", status: "Active", type: "Employee" },
      },
    });
    await expect(
      call(A, "record", {
        record: {
          id: employee,
          kind: "employee",
          version: 1,
          fields: { name: "Old edit", role: "Installer", status: "Active", type: "Employee" },
        },
      }),
    ).rejects.toThrow("changed");
    await expect(
      call(B, "record", {
        record: {
          id: employee,
          kind: "employee",
          version: 2,
          fields: { name: "Stolen", role: "Installer", status: "Active", type: "Employee" },
        },
      }),
    ).rejects.toThrow();
    expect((await call(B, "load")).records).toHaveLength(0);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [A]);
    try {
      await expect(
        db.query("update public.hr_records set owner_id=$1 where id=$2", [B, employee]),
      ).rejects.toThrow("cannot be changed");
    } finally {
      await db.query("select set_config('request.jwt.claim.sub','',false)");
    }

    expect(await as(B, "select * from public.hr_records")).toHaveLength(0);
  });
  it("blocks direct RPC malformed fields, invalid approval and cross-account employee references", async () => {
    await expect(
      call(A, "record", {
        record: {
          id: job,
          kind: "policy",
          version: 0,
          fields: { title: "Policy", content: "Draft", status: "Approved" },
        },
      }),
    ).rejects.toThrow("decision maker");
    await expect(
      call(A, "record", {
        record: {
          id: job,
          kind: "employee",
          version: 0,
          fields: {
            name: "Name",
            role: "Role",
            status: "Active",
            type: "Employee",
            governmentId: "private",
          },
        },
      }),
    ).rejects.toThrow("Unknown");
    await expect(
      call(B, "record", {
        record: {
          id: job,
          kind: "task",
          version: 0,
          fields: {
            title: "Cross account",
            employee,
            workflow: "Onboarding",
            assignee: "Owner",
            status: "To do",
          },
        },
      }),
    ).rejects.toThrow("Linked");
  });
  it("creates reviewed plans atomically and protects linked employee records from deletion", async () => {
    const tasks = [1, 2].map((n) => ({
      id: `30000000-0000-4000-8000-00000000000${n}`,
      kind: "task",
      version: 0,
      fields: {
        title: "Task " + n,
        employee,
        workflow: "Onboarding",
        assignee: "Owner",
        status: "To do",
      },
    }));
    await expect(
      call(A, "plan", {
        records: [tasks[0], { ...tasks[1], fields: { ...tasks[1]!.fields, employee: B } }],
      }),
    ).rejects.toThrow();
    expect((await call(A, "load")).records).toHaveLength(1);
    await call(A, "plan", { records: tasks });
    await expect(call(A, "delete", { id: employee, version: 2 })).rejects.toThrow("linked");
    await expect(call(A, "plan", { records: tasks })).rejects.toThrow();
    expect((await call(A, "load")).records).toHaveLength(3);
  });
  it("deletes only current owned records and keeps content out of audit events", async () => {
    const id = "30000000-0000-4000-8000-000000000001";
    await expect(call(B, "delete", { id, version: 1 })).rejects.toThrow();
    await expect(call(A, "delete", { id, version: 99 })).rejects.toThrow();
    await call(A, "delete", { id, version: 1 });
    const state = await call(A, "load");
    expect(state.records).toHaveLength(2);
    expect(state.audit.some((a: any) => a.action === "Record deleted")).toBe(true);
    expect(JSON.stringify(state.audit)).not.toContain("Test Person");
    expect((await as(B, "select * from public.hr_audit")).every((r: any) => r.owner_id === B)).toBe(
      true,
    );
  });
});
