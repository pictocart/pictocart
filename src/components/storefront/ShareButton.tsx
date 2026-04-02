import { useState } from 'react';
import { Share2, Link2, Check, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  title: string;
  text?: string;
  url: string;
  colors: any;
  borderRadius: number;
}

const ShareButton = ({ title, text, url, colors, borderRadius }: Props) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User cancelled
      }
    } else {
      setShowMenu(!showMenu);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => { setCopied(false); setShowMenu(false); }, 1500);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${title} - ${url}`)}`, '_blank');
    setShowMenu(false);
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className="flex items-center gap-2 px-3 py-2 text-sm border transition-colors hover:opacity-80"
        style={{ borderColor: colors.secondary, borderRadius: `${borderRadius / 2}px` }}
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div
            className="absolute right-0 top-full mt-2 z-50 p-2 min-w-[180px] shadow-lg space-y-1"
            style={{ backgroundColor: colors.card, borderRadius: `${borderRadius / 2}px`, border: `1px solid ${colors.secondary}` }}
          >
            <button onClick={copyLink} className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:opacity-70 rounded">
              {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button onClick={shareWhatsApp} className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:opacity-70 rounded">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </button>
            <button onClick={shareTwitter} className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:opacity-70 rounded">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              Twitter / X
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareButton;
