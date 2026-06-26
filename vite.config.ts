import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// Stamp the build with a human-readable version so the deployed site can show
// exactly which commit is live (surfaced in the UI via src/lib/version.ts).
const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as { version: string };

function gitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "dev"; // not a git checkout (e.g. tarball) — degrade gracefully
  }
}

// https://vite.dev/config/
// `base` defaults to "/" (root hosting, e.g. Netlify/Vercel and all local
// tooling). For a GitHub Pages project site it's served from /<repo>/, so the
// deploy workflow sets VITE_BASE=/Omixfit/.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(gitSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
});
