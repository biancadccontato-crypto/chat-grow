import { useTransactions } from '@/contexts/TransactionContext';
import { useMemo } from 'react';

function isCurrentMonth(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function useScoreCards() {
  const { transactions } = useTransactions();

  return useMemo(() => {
    // Visible transactions: confirmed only if current month, pending always
    const visible = transactions.filter(t =>
      t.status === 'pendente' || (t.status === 'confirmado' && isCurrentMonth(t.date))
    );

    const confirmed = visible.filter(t => t.status === 'confirmado');

    const receitas = confirmed
      .filter(t => t.type === 'entrada')
      .reduce((sum, t) => sum + t.value, 0);

    const saidas = confirmed
      .filter(t => t.type === 'saida' || t.type === 'debito')
      .reduce((sum, t) => sum + t.value, 0);

    // Débitos pendentes (card de débito mostra apenas pendentes)
    const debitosPendentes = visible
      .filter(t => t.type === 'debito' && t.status === 'pendente')
      .reduce((sum, t) => sum + t.value, 0);

    const investimentos = confirmed
      .filter(t => t.type === 'investimento')
      .reduce((sum, t) => sum + t.value, 0);

    const balanco = receitas - saidas - investimentos;

    const entradasPendentes = visible
      .filter(t => t.type === 'entrada' && t.status === 'pendente')
      .reduce((sum, t) => sum + t.value, 0);

    return { receitas, saidas, debitos: debitosPendentes, investimentos, balanco, entradasPendentes };
  }, [transactions]);
}

export { isCurrentMonth };
