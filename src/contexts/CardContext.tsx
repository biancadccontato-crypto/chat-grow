import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CreditCard, CardPurchase } from '@/types/card';
import { addMonths, format } from 'date-fns';
import { toast } from 'sonner';

interface CardContextType {
  cards: CreditCard[];
  purchases: CardPurchase[];
  addCard: (c: Omit<CreditCard, 'id' | 'createdAt'>) => void;
  updateCard: (id: string, c: Partial<CreditCard>) => void;
  deleteCard: (id: string) => void;
  addPurchase: (p: Omit<CardPurchase, 'id'>) => void;
  updatePurchase: (id: string, p: Partial<CardPurchase>) => void;
  deletePurchase: (id: string) => void;
}

const CardContext = createContext<CardContextType | null>(null);

export const useCards = () => {
  const ctx = useContext(CardContext);
  if (!ctx) throw new Error('useCards must be used within CardProvider');
  return ctx;
};

const CARDS_KEY = 'app:cards';
const PURCHASES_KEY = 'app:card_purchases';

export const CardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cards, setCards] = useState<CreditCard[]>(() => {
    try {
      const raw = localStorage.getItem(CARDS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [purchases, setPurchases] = useState<CardPurchase[]>(() => {
    try {
      const raw = localStorage.getItem(PURCHASES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
  }, [purchases]);

  const addCard = useCallback((c: Omit<CreditCard, 'id' | 'createdAt'>) => {
    const newCard: CreditCard = {
      ...c,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setCards(prev => [...prev, newCard]);
    toast.success('Cartão adicionado');
  }, []);

  const updateCard = useCallback((id: string, updates: Partial<CreditCard>) => {
    setCards(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const deleteCard = useCallback((id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    setPurchases(prev => prev.filter(p => p.cardId !== id));
    toast.success('Cartão removido');
  }, []);

  const addPurchase = useCallback((p: Omit<CardPurchase, 'id'>) => {
    const parentId = crypto.randomUUID();
    const parcelaValue = p.totalValue / p.parcelas;
    const baseDate = new Date(p.date);

    const rows: CardPurchase[] = [];
    rows.push({
      ...p,
      id: parentId,
      totalValue: parcelaValue, // armazenamos valor da parcela em cada linha
      parcelaAtual: p.parcelas > 1 ? 1 : undefined,
      parentId: undefined,
      description: p.parcelas > 1 ? `${p.description} (1/${p.parcelas})` : p.description,
    });

    if (p.parcelas > 1) {
      for (let i = 1; i < p.parcelas; i++) {
        const futureDate = addMonths(baseDate, i);
        rows.push({
          ...p,
          id: crypto.randomUUID(),
          totalValue: parcelaValue,
          date: format(futureDate, 'yyyy-MM-dd'),
          parcelaAtual: i + 1,
          parentId,
          description: `${p.description} (${i + 1}/${p.parcelas})`,
        });
      }
    }

    setPurchases(prev => [...rows, ...prev]);
    toast.success('Compra adicionada');
  }, []);

  const updatePurchase = useCallback((id: string, updates: Partial<CardPurchase>) => {
    setPurchases(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const deletePurchase = useCallback((id: string) => {
    setPurchases(prev => prev.filter(p => p.id !== id && p.parentId !== id));
    toast.success('Compra removida');
  }, []);

  return (
    <CardContext.Provider
      value={{ cards, purchases, addCard, updateCard, deleteCard, addPurchase, updatePurchase, deletePurchase }}
    >
      {children}
    </CardContext.Provider>
  );
};
