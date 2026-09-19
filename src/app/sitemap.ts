import { MetadataRoute } from 'next'

/**
 * [INPUT]: None - Static sitemap generation
 * [OUTPUT]: MetadataRoute.Sitemap - Sitemap configuration for SEO
 * [POS]: SEO optimization - Helps search engines discover and index all pages
 *
 * [PROTOCOL]:
 * 1. Once routes are added or removed, update this sitemap immediately.
 * 2. After update, check if robots.txt needs updating.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
