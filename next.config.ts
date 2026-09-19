import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/bento/editor", destination: "/", permanent: false },
      { source: "/editor", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
