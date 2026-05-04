import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useCreditSettings } from '@/hooks/useWallet';

const CreditBadge = () => {
  const { wallet } = useWallet();
  const { data: settings } = useCreditSettings();
  if (!wallet) return null;
  const low = wallet.balance < (settings?.low_balance_threshold ?? 200);
  const critical = wallet.balance < (settings?.critical_balance_threshold ?? 50);

  return (
    <Link
      to="/wallet"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
        critical
          ? 'bg-destructive/10 text-destructive border-destructive/30'
          : low
            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
            : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15'
      }`}
      title="AI Credits"
    >
      <Sparkles className="h-3.5 w-3.5" />
      {wallet.balance.toLocaleString()}
    </Link>
  );
};

export default CreditBadge;
