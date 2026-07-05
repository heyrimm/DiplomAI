/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // 배포 시 Vercel 환경변수 API_URL에 백엔드(Render) URL을 지정
    const apiUrl = process.env.API_URL || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
