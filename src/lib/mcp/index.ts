import { auth, defineMcp } from "@lovable.dev/mcp-js";

import searchMembers from "./tools/search-members";
import getMember from "./tools/get-member";
import listAsks from "./tools/list-asks";
import postAsk from "./tools/post-ask";
import requestIntro from "./tools/request-intro";
import listIntroRequests from "./tools/list-intro-requests";
import listMemories from "./tools/list-memories";
import addMemory from "./tools/add-memory";
import getMyProfile from "./tools/get-my-profile";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged and Vite inlines it at build time.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "aetheris-intros",
  title: "Ask Intros",
  version: "0.1.0",
  instructions:
    "Tools for Ask Intros, a high-trust business network. Read the signed-in member's profile and Active Memory, search the network with match reasoning, read and post professional asks, and request double opt-in introductions. Never use these tools for mass outreach, pitching or spam: an introduction only happens when both sides opt in.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getMyProfile,
    searchMembers,
    getMember,
    listAsks,
    postAsk,
    requestIntro,
    listIntroRequests,
    listMemories,
    addMemory,
  ],
});
