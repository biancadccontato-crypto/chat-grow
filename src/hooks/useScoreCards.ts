import { useTransactions } from '@/contexts/TransactionContext';
import { useMemo } from 'react';

function isCurrentMonth(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isBeforeCurrentMonth(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr);
  if (d.getFullYear() < now.getFullYear()) return true;
  if (d.getFullYear() === now.getFullYear() && d.getMonth() < now.getMonth()) return true;
  return false;
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

    // Saldo acumulado positivo dos meses anteriores (apenas confirmadas)
    const previousConfirmed = transactions.filter(
      t => t.status === 'confirmado' && isBeforeCurrentMonth(t.date)
    );

    // Agrupa por ano-mês e soma apenas saldos positivos
    const monthlyBalances = new Map<string, number>();
    previousConfirmed.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const current = monthlyBalances.get(key) ?? 0;
      const sign = t.type === 'entrada' ? 1 : -1;
      monthlyBalances.set(key, current + sign * t.value);
    });

    const saldoAnterior = Array.from(monthlyBalances.values())
      .filter(v => v > 0)
      .reduce((sum, v) => sum + v, 0);

    const balanco = saldoAnterior + receitas - saidas - investimentos;

    const entradasPendentes = visible
      .filter(t => t.type === 'entrada' && t.status === 'pendente')
      .reduce((sum, t) => sum + t.value, 0);

    return { receitas, saidas, debitos: debitosPendentes, investimentos, balanco, entradasPendentes, saldoAnterior };
  }, [transactions]);
}

export { isCurrentMonth };
