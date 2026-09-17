import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/bento/editor", permanent: false },
      { source: "/editor", destination: "/bento/editor", permanent: false },
    ];
  },
};

export default nextConfig;
