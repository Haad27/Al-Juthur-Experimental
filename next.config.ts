import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./database/surah-meta/**/*', './database/word-by-word-translation/**/*'],
  },
  outputFileTracingExcludes: {
    '*': ['./database/**/*.sqlite', './database/**/*.db', './database/rag/**/*', './database/lexicon/**/*', './database/downloaded_tafsirs/**/*'],
  },
};

export default nextConfig;
