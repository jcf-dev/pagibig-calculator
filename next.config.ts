import type { NextConfig } from "next";

const basePath = "/labs/pagibig-calculator";

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath,
  output: "standalone",
  transpilePackages: ["@joween/site-shell"],
  reactCompiler: true,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
