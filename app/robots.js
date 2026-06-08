export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hrflowai.app'
  return {
    rules: [
      { userAgent: '*', allow: ['/login', '/signup'], disallow: ['/', '/api/'] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
