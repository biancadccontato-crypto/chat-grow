import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CreditCard, CardPurchase, SavedInvoice } from '@/types/card';
import { addMonths, format, differenceInCalendarMonths } from 'date-fns';
import { toast } from 'sonner';

interface CardContextType {
  cards: CreditCard[];
  purchases: CardPurchase[];
  savedInvoices: SavedInvoice[];
  addCard: (c: Omit<CreditCard, 'id' | 'createdAt'>) => void;
  updateCard: (id: string, c: Partial<CreditCard>) => void;
  deleteCard: (id: string) => void;
  addPurchase: (p: Omit<CardPurchase, 'id'>) => void;
  updatePurchase: (id: string, p: Partial<CardPurchase>) => void;
  deletePurchase: (id: string) => void;
  saveInvoiceSnapshot: (cardId: string, monthKey: string, total: number, items: SavedInvoice['items']) => void;
}

const CardContext = createContext<CardContextType | null>(null);

export const useCards = () => {
  const ctx = useContext(CardContext);
  if (!ctx) throw new Error('useCards must be used within CardProvider');
  return ctx;
};

const CARDS_KEY = 'app:cards';
const PURCHASES_KEY = 'app:card_purchases';
const INVOICES_KEY = 'app:saved_invoices';

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
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>(() => {
    try {
      const raw = localStorage.getItem(INVOICES_KEY);
      const list: SavedInvoice[] = raw ? JSON.parse(raw) : [];
      // Auto-prune anything older than 3 months from now
      const now = new Date();
      return list.filter(inv => differenceInCalendarMonths(now, new Date(inv.savedAt)) < 3);
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

  useEffect(() => {
    localStorage.setItem(INVOICES_KEY, JSON.stringify(savedInvoices));
  }, [savedInvoices]);

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

  const saveInvoiceSnapshot = useCallback(
    (cardId: string, monthKey: string, total: number, items: SavedInvoice['items']) => {
      const now = new Date();
      setSavedInvoices(prev => {
        // Replace any existing snapshot for same card+month, then prune >3 months
        const filtered = prev.filter(
          inv => !(inv.cardId === cardId && inv.monthKey === monthKey)
        );
        const next: SavedInvoice = {
          id: crypto.randomUUID(),
          cardId,
          monthKey,
          total,
          savedAt: now.toISOString(),
          items,
        };
        return [next, ...filtered].filter(
          inv => differenceInCalendarMonths(now, new Date(inv.savedAt)) < 3
        );
      });
    },
    []
  );

  return (
    <CardContext.Provider
      value={{
        cards,
        purchases,
        savedInvoices,
        addCard,
        updateCard,
        deleteCard,
        addPurchase,
        updatePurchase,
        deletePurchase,
        saveInvoiceSnapshot,
      }}
    >
      {children}
    </CardContext.Provider>
  );
};
