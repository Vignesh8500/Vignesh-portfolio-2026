const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com';
export default function sitemap() {
  return [{ url: SITE, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 }];
}