import type { NextConfig } from "next";

const basePath = "/labs/pagibig-calculator";

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath,
  output: "standalone",
  reactCompiler: true,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
