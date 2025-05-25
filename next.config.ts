import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  // output: 'export',
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'notes-wudi.pages.dev'
      }
    ]
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.worker\.ts$/,
      loader: 'worker-loader',
      options: {
        filename: 'static/[name].[hash].js',
        publicPath: '/_next/'
      }
    })
    return config
  }
}

export default nextConfig
