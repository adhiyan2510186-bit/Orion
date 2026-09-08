import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  env: {
    // Public so the browser bundle can read it. The backend URL is not a secret.
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000',
    NEXT_PUBLIC_TRANSPORT: process.env.NEXT_PUBLIC_TRANSPORT ?? 'http',
  },
};

export default config;
