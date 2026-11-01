import type { NextConfig } from 'next'

// Fully static site: all data lives on the device, so there is no server to run.
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
}

export default nextConfig
