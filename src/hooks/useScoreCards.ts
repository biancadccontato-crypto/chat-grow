import { useTransactions } from '@/contexts/TransactionContext';
import { useMemo } from 'react';

export function useScoreCards() {
  const { transactions } = useTransactions();

  return useMemo(() => {
    const confirmed = transactions.filter(t => t.status === 'confirmado');

    const receitas = confirmed
      .filter(t => t.type === 'entrada')
      .reduce((sum, t) => sum + t.value, 0);

    const saidas = confirmed
      .filter(t => t.type === 'saida' || t.type === 'debito')
      .reduce((sum, t) => sum + t.value, 0);

    const debitos = confirmed
      .filter(t => t.type === 'debito')
      .reduce((sum, t) => sum + t.value, 0);

    const investimentos = confirmed
      .filter(t => t.type === 'investimento')
      .reduce((sum, t) => sum + t.value, 0);

    const balanco = receitas - saidas - investimentos;

    const entradasPendentes = transactions
      .filter(t => t.type === 'entrada' && t.status === 'pendente')
      .reduce((sum, t) => sum + t.value, 0);

    return { receitas, saidas, debitos, investimentos, balanco, entradasPendentes };
  }, [transactions]);
}
