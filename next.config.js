/** @type {import('next').NextConfig} */
const nextConfig = {
  // FE flow: `/` → `/login` so the demo always opens on sign-in (sign in → CSV
  // upload → dashboard). Kept in config, not App Router `redirect()`, because the
  // latter can omit Location on statically optimized production responses (TASK-010).
  async redirects() {
    return [{ source: "/", destination: "/login", permanent: false }];
  },
};

module.exports = nextConfig;
