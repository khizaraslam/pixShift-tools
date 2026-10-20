/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Old two-in-one social pages now have their own pages per placement.
  async redirects() {
    return [
      { source: "/instagram-image-resizer", destination: "/instagram-post-resizer", permanent: true },
      { source: "/linkedin-image-resizer", destination: "/linkedin-post-resizer", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
