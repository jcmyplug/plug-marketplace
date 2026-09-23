import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/* ─── VITE CONFIG ───────────────────────────────────────────────────────────
   Replaces Create React App, which the React team deprecated in February 2025
   and which has had no release since react-scripts 5.0.1. See
   DEPENDENCY-AUDIT.md for why that mattered more than the advisory noise.

   Two settings below are deliberately NOT the Vite defaults, to keep the blast
   radius of this migration small:

     outDir: "build"     Vite defaults to "dist". Vercel and vercel.json are
                         already pointed at "build", so keeping the name means
                         the deploy config does not have to change in lockstep.

     assetsDir: "static" Vite defaults to "assets". vercel.json caches
                         /static/(.*) as immutable for a year, and the CSP is
                         written against it. Renaming the folder would silently
                         drop that cache header — the kind of regression that
                         does not fail a build and does not show up until the
                         bill or the Lighthouse score moves.
────────────────────────────────────────────────────────────────────────────── */
export default defineConfig(function (config) {
  const mode = config.mode;

  /* Third argument "" means: load every var, not just VITE_-prefixed ones.
     The app predates Vite and still reads process.env.REACT_APP_*, so those
     names are substituted at build time below rather than renamed across the
     source. Vercel already holds them under these names. */
  const env = loadEnv(mode, process.cwd(), "");

  const passthrough = [
    "REACT_APP_SUPABASE_URL",
    "REACT_APP_SUPABASE_ANON_KEY",
    "REACT_APP_GOOGLE_MAPS_KEY",
    "REACT_APP_ADMIN_SETUP_KEY",
  ];

  /* Every reference has to be defined. Vite does not ship a process shim, so
     one undefined process.env.X left in the bundle is a ReferenceError on the
     first line that touches it, not a quiet undefined. */
  const define = { "process.env.NODE_ENV": JSON.stringify(mode) };
  for (const key of passthrough) {
    define["process.env." + key] = JSON.stringify(env[key] || "");
  }

  return {
    plugins: [react()],
    define: define,
    build: {
      outDir: "build",
      assetsDir: "static",
      sourcemap: false,
      /* One very large component in one chunk. The warning is accurate and
         there is nothing to learn from it on every build until routing lands
         and the code can actually be split. */
      chunkSizeWarningLimit: 2000,
    },
    server: { port: 3000 },
    preview: { port: 3000 },
  };
});
