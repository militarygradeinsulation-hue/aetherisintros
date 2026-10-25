import type { NetworkSnapshot } from "../../src/features/network-value/model";
const A = "10000000-0000-4000-8000-000000000001",
  B = "10000000-0000-4000-8000-000000000002";
const w = window as any;
w.account = A;
let notify: Function = () => {};
w.switchAccount = () => {
  w.account = B;
  notify("SIGNED_IN", { user: { id: B } });
};
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: { user: { id: w.account } } }, error: null }),
    onAuthStateChange: (fn: Function) => {
      notify = fn;
      return { data: { subscription: { unsubscribe() {} } } };
    },
  },
};
export const useNav = () => ({
  messageMember: (id: string) => {
    w.conversation = id;
  },
});
const base = (): NetworkSnapshot => ({
  referrals_ready: false,
  user_id: w.account,
  verified: true,
  period: "2026-10-01",
  location: { city: "Test city", latitude: 40.1, longitude: -86.1 },
  cohort: { trade: "Example HVAC", size_band: "10 to 50", region: "Midwest" },
  contributions: [],
  benchmarks: [
    {
      metric: "response_minutes",
      period: "2026-07-01",
      value: 100,
      median: 30,
      p25: 10,
      p75: 60,
      companies_at_least: 10,
    },
  ],
  posts: [
    {
      id: "20000000-0000-4000-8000-000000000001",
      owner_id: B,
      kind: "available",
      title: "Example crew availability",
      details: "Test fixture only. Not member data.",
      city: "Test city",
      company: "Example Company",
      distance_miles: 15,
      starts_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      radius: 60,
      closed_at: null,
    },
  ],
  letters: [],
  settlements: [],
  members: [{ id: B, name: "Example Seller", company: "Example Company" }],
});
let snapshot = base();
w.commands = [];
export async function networkValue({ data }: { data: any }) {
  const account = w.account;
  w.commands.push(data);
  if (w.fail) throw new Error("Test write failed. Your form is still here.");
  if (w.delay)
    await new Promise((r) => {
      w.finish = r;
    });
  if (account !== A)
    return { ...base(), user_id: account, posts: [], benchmarks: [], cohort: null };
  if (data.action === "benchmark_share")
    snapshot = { ...snapshot, contributions: [{ metric: data.metric, value: data.value }] };
  if (data.action === "capacity_request")
    snapshot = {
      ...snapshot,
      letters: [
        {
          id: "50000000-0000-4000-8000-000000000001",
          post_id: data.post_id,
          owner_id: B,
          requester_id: A,
          title: "Example crew availability",
          note: data.note,
          terms: "",
          state: "pending",
          created_at: new Date().toISOString(),
        },
      ],
    };
  return structuredClone(snapshot);
}
