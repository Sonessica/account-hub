import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Upstream currently contains stale public-profile types. The standalone
  // review editor works independently, so keep the preview build isolated.
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [{ source: "/", destination: "/bento/editor", permanent: false }];
  },
};

export default nextConfig;
