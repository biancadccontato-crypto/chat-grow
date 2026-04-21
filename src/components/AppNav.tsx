import { Link, useLocation } from 'react-router-dom';
import { Wallet, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppNav() {
  const { pathname } = useLocation();
  const link = (to: string, label: string, Icon: typeof Wallet) => (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors',
        pathname === to
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      <Icon size={16} />
      {label}
    </Link>
  );
  return (
    <nav className="flex items-center gap-1">
      {link('/', 'Início', Wallet)}
      {link('/cartoes', 'Cartões', CreditCard)}
    </nav>
  );
}
