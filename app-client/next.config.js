/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  images: {
    remotePatterns: [new URL('http://localhost:9001/**')],
  },
}

module.exports = nextConfig