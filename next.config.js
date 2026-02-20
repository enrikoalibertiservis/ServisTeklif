/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdfmake sadece tarayıcıda çalışır, sunucu bundle'a dahil etme
      config.externals = [...(config.externals || []), "pdfmake"]
    }
    return config
  },
}

module.exports = nextConfig
