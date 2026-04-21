export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  dueDay: number; // dia de vencimento da fatura (1-31)
  color?: string;
  createdAt: string;
}

export interface CardPurchase {
  id: string;
  cardId: string;
  description: string;
  category: string;
  totalValue: number; // valor total da compra (não da parcela)
  date: string; // yyyy-MM-dd
  parcelas: number; // quantidade total de parcelas
  parentId?: string; // se for uma parcela filha, aponta para a compra original
  parcelaAtual?: number; // 1..parcelas
}

export const CARD_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Lazer',
  'Saúde',
  'Educação',
  'Vestuário',
  'Assinaturas',
  'Outros',
];
