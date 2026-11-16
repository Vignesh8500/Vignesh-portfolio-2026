import './globals.css';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com';
const TITLE = 'Vignesh Vadde | Fullstack Developer, Webflow & WordPress';
const DESC = 'Vignesh Vadde is a fullstack developer from Hyderabad, India, building fast, animated Webflow and WordPress sites with GSAP and AI automations.';

export const metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: '%s | Vignesh Vadde' },
  description: DESC,
  keywords: ['Vignesh Vadde', 'Fullstack Developer', 'Webflow Developer', 'WordPress Developer', 'GSAP animation', 'Next.js', 'Freelance web developer', 'Hyderabad', 'India', 'Zoho automation'],
  authors: [{ name: 'Vignesh Vadde', url: SITE }],
  creator: 'Vignesh Vadde',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website', url: SITE, siteName: 'Vignesh Vadde', title: TITLE, description: DESC, locale: 'en_US',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Vignesh Vadde, Fullstack Developer' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC, images: ['/og.png'] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#242428' };

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Vignesh Vadde',
  jobTitle: 'Fullstack Developer',
  url: SITE,
  image: `${SITE}/profile.jpg`,
  email: 'mailto:vaddevignesh123@gmail.com',
  address: { '@type': 'PostalAddress', addressLocality: 'Hyderabad', addressCountry: 'IN' },
  sameAs: ['https://github.com/vigneshvadde', 'https://linkedin.com/in/vigneshvadde'],
  knowsAbout: ['Webflow', 'WordPress', 'GSAP', 'Next.js', 'Web automation', 'SEO'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
      </body>
    </html>
  );
}