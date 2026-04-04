export type TransactionType = 'entrada' | 'saida' | 'debito' | 'investimento';
export type TransactionStatus = 'confirmado' | 'pendente';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  description: string;
  category: string;
  value: number;
  status: TransactionStatus;
  parcelas: number;
  parcelaAtual?: number;
  parentId?: string;
  origem?: string;
}

export const CATEGORIES: Record<TransactionType, string[]> = {
  entrada: ['Salário', 'Ganhos', 'Saque', 'Freelance'],
  saida: ['Moradia', 'Transporte', 'Lazer', 'Estudos', 'Vestimenta', 'Alimentação', 'Saúde'],
  debito: ['Cartão de crédito', 'Financiamento', 'Contas vencidas', 'Assinatura', 'Parcelamento'],
  investimento: ['Poupança', 'Cofrinhos', 'Conta corrente'],
};

export const TYPE_LABELS: Record<TransactionType, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  debito: 'Débito',
  investimento: 'Investimento',
};
