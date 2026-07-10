/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // AI 가이드 첫 생성은 30초를 넘길 수 있어 리라이트 프록시 기본 타임아웃(30초)을 연장
    proxyTimeout: 120_000,
  },
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
