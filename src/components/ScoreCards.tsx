import { useScoreCards } from '@/hooks/useScoreCards';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface ScoreCardProps {
  label: string;
  value: number;
  highlight?: boolean;
}

const ScoreCard = ({ label, value, highlight }: ScoreCardProps) => (
  <div className={`rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 ${highlight ? 'border-warning/40' : ''}`}>
    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
    <p className={`text-xl font-display font-bold ${highlight ? 'text-warning' : 'text-foreground'}`}>
      {formatCurrency(value)}
    </p>
  </div>
);

export default function ScoreCards() {
  const { receitas, saidas, debitos, investimentos, balanco, entradasPendentes } = useScoreCards();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <ScoreCard label="Receitas" value={receitas} />
      <ScoreCard label="Saídas" value={saidas} />
      <ScoreCard label="Débitos" value={debitos} />
      <ScoreCard label="Investimentos" value={investimentos} />
      <ScoreCard label="Balanço" value={balanco} />
      <ScoreCard label="Entradas Pendentes" value={entradasPendentes} highlight />
    </div>
  );
}
