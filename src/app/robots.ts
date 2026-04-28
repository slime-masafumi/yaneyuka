import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const host = 'https://yaneyuka.com'
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/userpage']
      }
    ],
    sitemap: `${host}/sitemap.xml`,
    host,
  }
}
























