import { Link } from 'react-router-dom';
import type { FooterConfig } from '@/components/store-design/FooterEditor';

interface Props {
  store: { name: string; slug: string };
  config: FooterConfig;
  colors: any;
}

const POLICY_LINKS = [
  { label: 'Return Policy', path: 'return-policy' },
  { label: 'Shipping Policy', path: 'shipping-policy' },
  { label: 'Contact Us', path: 'contact' },
];

const SocialIcon = ({ platform }: { platform: string }) => {
  const icons: Record<string, string> = {
    instagram: 'M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2z',
    facebook: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
    twitter: 'M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z',
    youtube: 'M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z',
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d={icons[platform] || ''} />
    </svg>
  );
};

const StorefrontFooter = ({ store, config, colors }: Props) => {
  const socials = Object.entries(config.social_links || {}).filter(([, url]) => url);

  const footerBg = config.background_color || colors.card;
  const footerText = config.text_color || undefined;
  const hasBgImage = !!config.background_image;
  const bgOpacity = (config.background_opacity ?? 30) / 100;

  return (
    <footer className="border-t relative overflow-hidden" style={{ borderColor: colors.secondary + '40', backgroundColor: footerBg, color: footerText }}>
      {hasBgImage && (
        <div className="absolute inset-0 z-0" style={{ backgroundImage: `url(${config.background_image})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: bgOpacity }} />
      )}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-2">{store.name}</h3>
            {config.custom_text && <p className="text-sm opacity-60">{config.custom_text}</p>}
          </div>

          {config.custom_links?.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-3 opacity-70">Quick Links</h4>
              <div className="space-y-2">
                {config.custom_links.map((link, i) => (
                  <a key={i} href={link.href} className="block text-sm opacity-60 hover:opacity-100 transition-opacity">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {socials.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-3 opacity-70">Follow Us</h4>
              <div className="flex gap-3">
                {socials.map(([platform, url]) => (
                  <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition-opacity">
                    <SocialIcon platform={platform} />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-sm mb-3 opacity-70">Policies</h4>
            <div className="space-y-2">
              {POLICY_LINKS.map((link) => (
                <Link key={link.path} to={`/store/${store.slug}/${link.path}`} className="block text-sm opacity-60 hover:opacity-100 transition-opacity">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {config.show_powered_by !== false && (
          <div className="mt-8 pt-6 border-t text-center text-xs opacity-40" style={{ borderColor: (footerText || colors.secondary) + '20' }}>
            © {new Date().getFullYear()} {store.name}. Powered by Antariksh Commerce
          </div>
        )}
      </div>
    </footer>
  );
};

export default StorefrontFooter;
