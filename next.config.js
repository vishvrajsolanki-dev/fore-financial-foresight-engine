/** @type {import('next').NextConfig} */
const nextConfig = {
  // TASK-010: reliable `/` → `/past` redirect (App Router `redirect()` alone can omit Location
  // on the statically optimized production response).
  async redirects() {
    return [{ source: "/", destination: "/past", permanent: false }];
  },
};

module.exports = nextConfig;
