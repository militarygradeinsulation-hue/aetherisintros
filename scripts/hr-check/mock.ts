import { hrCommand, tailorContext, type HRState } from "../../src/features/hr/model";
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
const empty = (id: string): HRState => ({
  userId: id,
  context: tailorContext({
    id,
    company: id === A ? "Example HVAC Business" : "Second account",
    industries: ["HVAC"],
    what_i_do: "Service and installations",
    location: "Indiana",
  }),
  version: 0,
  records: [],
  audit: [],
  aiAvailable: true,
  storageReady: true,
});
const states: Record<string, HRState> = { [A]: empty(A), [B]: empty(B) };
w.saved = states[A];
w.requests = [];
export async function loadHR() {
  const id = w.account;
  if (w.delay) await new Promise((r) => (w.finish = r));
  return structuredClone({ ...states[id], storageReady: !w.storageMissing });
}
export async function saveHR({ data }: { data: any }) {
  const id = w.account;
  const command = hrCommand.parse(data);
  w.requests.push(command);
  if (w.fail) throw Error("Simulated save conflict. Your entries are still here.");
  if (w.delay) await new Promise((r) => (w.finish = r));
  const state = states[id]!;
  if (command.action === "context") {
    state.context = command.context;
    state.version++;
  }
  if (command.action === "record" || command.action === "plan")
    for (const record of command.action === "record" ? [command.record] : command.records) {
      state.records = state.records.filter((r) => r.id !== record.id);
      state.records.unshift({
        ...record,
        version: record.version + 1,
        updated_at: new Date().toISOString(),
      });
    }
  if (command.action === "delete") state.records = state.records.filter((r) => r.id !== command.id);
  state.audit.unshift({ action: "Record saved", kind: null, created_at: new Date().toISOString() });
  w.saved = states[id];
  return structuredClone(state);
}
export async function askHR({ data }: { data: any }) {
  const id = w.account;
  w.aiRequest = data;
  if (w.aiFail) throw Error("AI unavailable. Your question is still here.");
  return {
    userId: id,
    answer:
      "Working draft for Example HVAC Business. Review role responsibilities, equipment readiness and manager check ins. No employment decision has been made.",
  };
}
