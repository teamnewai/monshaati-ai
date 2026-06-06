import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute['Robots'] {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/admin/', '/dashboard/', '/results/', '/profile/', '/settings/'] },
    sitemap: 'https://monshaati.ai/sitemap.xml',
  };
}
