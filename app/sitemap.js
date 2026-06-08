export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hrflowai.app'
  return [
    { url: `${baseUrl}/login`, changeFrequency: 'monthly', priority: 1 },
    { url: `${baseUrl}/signup`, changeFrequency: 'monthly', priority: 0.8 },
  ]
}
