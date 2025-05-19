/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.office.com https://*.office365.com https://*.microsoft.com"
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig; 