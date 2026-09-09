import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // The dev-tools indicator is rendered bottom-left, directly over the playback
  // control, and swallows clicks on it. Production is unaffected, but there is no
  // reason to ship a dev experience where a button silently does nothing.
  devIndicators: false,
  env: {
    // Public so the browser bundle can read it. The backend URL is not a secret.
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000',
    NEXT_PUBLIC_TRANSPORT: process.env.NEXT_PUBLIC_TRANSPORT ?? 'http',
  },
};

export default config;
