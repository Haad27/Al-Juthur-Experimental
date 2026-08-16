import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/*': ['./database/**/*'],
    '/api/**/*': ['./database/**/*'],
    '/(root)/**/*': ['./database/**/*'],
    '/tafsir/**/*': ['./database/**/*'],
    '/lexicon/**/*': ['./database/**/*'],
  },
};

export default nextConfig;
