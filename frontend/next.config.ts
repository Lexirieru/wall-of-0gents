import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  sassOptions: {
    includePaths: [path.join(process.cwd(), "src/styles")],
  },
};

export default nextConfig;
