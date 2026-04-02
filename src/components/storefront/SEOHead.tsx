import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description?: string;
  ogImage?: string;
  url?: string;
  type?: 'website' | 'product';
  product?: {
    price: number;
    currency?: string;
    availability?: string;
    brand?: string;
    images?: string[];
    sku?: string;
  };
}

const SEOHead = ({ title, description, ogImage, url, type = 'website', product }: SEOHeadProps) => {
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
    setMeta('og:type', type === 'product' ? 'product' : 'website', true);
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

    // JSON-LD structured data
    let scriptEl = document.getElementById('json-ld-seo') as HTMLScriptElement;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'json-ld-seo';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }

    if (type === 'product' && product) {
      scriptEl.textContent = JSON.stringify({
        '@context': 'https://schema.org',
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
        },
      });
    } else {
      scriptEl.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: title,
        ...(description ? { description } : {}),
        ...(url ? { url } : {}),
      });
    }

    return () => {
      // Cleanup JSON-LD on unmount
      const el = document.getElementById('json-ld-seo');
      if (el) el.remove();
    };
  }, [title, description, ogImage, url, type, product]);

  return null;
};

export default SEOHead;
