import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // @ts-ignore
  allowedDevOrigins: ['192.168.100.78'],
};

export default nextConfig;
