import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description?: string;
  ogImage?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  product?: {
    price: number;
    currency?: string;
    availability?: string;
    brand?: string;
    images?: string[];
    sku?: string;
    rating?: { value: number; count: number };
  };
  breadcrumbs?: { name: string; url: string }[];
  organization?: { name: string; url: string; logo?: string };
  canonical?: string;
}

const SEOHead = ({
  title,
  description,
  ogImage,
  url,
  type = 'website',
  product,
  breadcrumbs,
  organization,
  canonical,
}: SEOHeadProps) => {
  useEffect(() => {
    document.title = title;

    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    if (description) {
      setMeta('description', description);
      setMeta('og:description', description, true);
    }
    setMeta('og:title', title, true);
    setMeta('og:type', type === 'product' ? 'product' : type === 'article' ? 'article' : 'website', true);
    if (ogImage) {
      const absoluteOgImage = ogImage.startsWith('http') ? ogImage : `${window.location.origin}${ogImage}`;
      setMeta('og:image', absoluteOgImage, true);
      setMeta('og:image:width', '1200', true);
      setMeta('og:image:height', '630', true);
    }
    if (url) {
      const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
      setMeta('og:url', absoluteUrl, true);
    }

    // Twitter card
    setMeta('twitter:card', ogImage ? 'summary_large_image' : 'summary');
    setMeta('twitter:title', title);
    if (description) setMeta('twitter:description', description);
    if (ogImage) {
      const absoluteOgImage = ogImage.startsWith('http') ? ogImage : `${window.location.origin}${ogImage}`;
      setMeta('twitter:image', absoluteOgImage);
    }

    // Canonical link
    const canonicalHref = canonical
      ? (canonical.startsWith('http') ? canonical : `${window.location.origin}${canonical}`)
      : window.location.href.split('?')[0].split('#')[0];
    let canonEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonEl) {
      canonEl = document.createElement('link');
      canonEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonEl);
    }
    canonEl.setAttribute('href', canonicalHref);

    // Build JSON-LD graph (multiple entities)
    const graph: any[] = [];

    if (type === 'product' && product) {
      const p: any = {
        '@type': 'Product',
        name: title,
        description,
        ...(product.images?.length ? { image: product.images } : {}),
        ...(product.sku ? { sku: product.sku } : {}),
        ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: product.currency || 'INR',
          availability: product.availability || 'https://schema.org/InStock',
          ...(url ? { url: url.startsWith('http') ? url : `${window.location.origin}${url}` } : {}),
        },
      };
      if (product.rating && product.rating.count > 0) {
        p.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: product.rating.value,
          reviewCount: product.rating.count,
        };
      }
      graph.push(p);
    } else {
      graph.push({
        '@type': type === 'article' ? 'Article' : 'WebSite',
        name: title,
        ...(description ? { description } : {}),
        ...(url ? { url: url.startsWith('http') ? url : `${window.location.origin}${url}` } : {}),
      });
    }

    if (organization) {
      graph.push({
        '@type': 'Organization',
        name: organization.name,
        url: organization.url,
        ...(organization.logo ? { logo: organization.logo } : {}),
      });
    }

    if (breadcrumbs?.length) {
      graph.push({
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: b.url.startsWith('http') ? b.url : `${window.location.origin}${b.url}`,
        })),
      });
    }

    let scriptEl = document.getElementById('json-ld-seo') as HTMLScriptElement;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'json-ld-seo';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });

    return () => {
      const el = document.getElementById('json-ld-seo');
      if (el) el.remove();
    };
  }, [title, description, ogImage, url, type, product, breadcrumbs, organization, canonical]);

  return null;
};

export default SEOHead;
