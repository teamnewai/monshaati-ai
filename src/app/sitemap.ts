import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute['Sitemap'] {
  return [
    { url: 'https://monshaati.ai', lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: 'https://monshaati.ai/auth/login', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.8 },
    { url: 'https://monshaati.ai/auth/signup', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.9 },
  ];
}
