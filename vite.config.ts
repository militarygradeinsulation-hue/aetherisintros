import path from 'node:path';
import { existsSync } from 'node:fs';
import { loadEnv } from 'vite';
// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

// Load all env vars into process.env for server routes only (never added to
// the client envDefine block, so secrets stay out of the browser bundle).
const serverEnv = loadEnv(process.env["NODE_ENV"] ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

export default defineConfig({
  plugins: [{
    name: 'bridge-reference-import-boundary',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/src/bridge-reference/') || !/\.[jt]sx?$/.test(id)) return null;
      // Only redirect module locations; the checked-in reference source stays untouched.
      // Both presentations share pointer/physics fixes without editing the pinned snapshot.
      const adapted = code.replace(/(['"])\.\.\/components\/shared\/FloatingConnectionField\1/g,
        (_match, quote) => quote + path.resolve('src/intros-ui/components/shared/FloatingConnectionField.tsx') + quote);
      const resolved = adapted.replace(/(['"])@\/([^'"]+)\1/g, (match, quote, name) => {
        // Private avatar reads use the account-bound host adapter; reference JSX stays unchanged.
        if (name === 'aetheris/avatar') return quote + path.resolve('src/aetheris/avatar.tsx') + quote;
        if (name === 'assets/ask-intros-official-logo.jpg.asset.json') {
          return quote + path.resolve('src/intros-ui/experience/bridge-logo.asset.json') + quote;
        }
        const original = path.resolve('src/bridge-reference/src', name);
        for (const extension of ['', '.tsx', '.ts']) {
          if (existsSync(original + extension)) return quote + original + extension + quote;
        }
        return match;
      });
      return resolved === code ? null : { code: resolved, map: null };
    },
  }, mcpPlugin()],
  vite: {
    resolve: {
      alias: {
        // Pin entities deep imports and root to the hoisted v4.5.0 copy; a nested v7 breaks SSR.
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        "entities": path.resolve(__dirname, "node_modules/entities"),
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
