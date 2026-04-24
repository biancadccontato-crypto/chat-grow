import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CreditCard, CardPurchase, SavedInvoice } from '@/types/card';
import { addMonths, format, differenceInCalendarMonths } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CardContextType {
  cards: CreditCard[];
  purchases: CardPurchase[];
  savedInvoices: SavedInvoice[];
  loading: boolean;
  addCard: (c: Omit<CreditCard, 'id' | 'createdAt'>) => Promise<void>;
  updateCard: (id: string, c: Partial<CreditCard>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  addPurchase: (p: Omit<CardPurchase, 'id'>) => Promise<void>;
  updatePurchase: (id: string, p: Partial<CardPurchase>) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  saveInvoiceSnapshot: (cardId: string, monthKey: string, total: number, items: SavedInvoice['items']) => Promise<void>;
}

const CardContext = createContext<CardContextType | null>(null);

export const useCards = () => {
  const ctx = useContext(CardContext);
  if (!ctx) throw new Error('useCards must be used within CardProvider');
  return ctx;
};

const mapCard = (row: any): CreditCard => ({
  id: row.id,
  name: row.name,
  limit: Number(row.limit),
  dueDay: row.due_day,
  color: row.color ?? undefined,
  createdAt: row.created_at,
});

const mapPurchase = (row: any): CardPurchase => ({
  id: row.id,
  cardId: row.card_id,
  description: row.description,
  category: row.category,
  totalValue: Number(row.total_value),
  date: row.date,
  parcelas: row.parcelas,
  parcelaAtual: row.parcela_atual ?? undefined,
  parentId: row.parent_id ?? undefined,
});

const mapInvoice = (row: any): SavedInvoice => ({
  id: row.id,
  cardId: row.card_id,
  monthKey: row.month_key,
  total: Number(row.total),
  savedAt: row.saved_at,
  items: (row.items ?? []) as SavedInvoice['items'],
});

export const CardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [purchases, setPurchases] = useState<CardPurchase[]>([]);
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCards([]); setPurchases([]); setSavedInvoices([]);
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      const [cRes, pRes, iRes] = await Promise.all([
        supabase.from('cards').select('*').order('created_at', { ascending: true }),
        supabase.from('card_purchases').select('*').order('date', { ascending: false }),
        supabase.from('saved_invoices').select('*').order('saved_at', { ascending: false }),
      ]);

      if (cRes.error) { toast.error('Erro ao carregar cartões'); console.error(cRes.error); }
      else setCards((cRes.data || []).map(mapCard));

      if (pRes.error) { toast.error('Erro ao carregar compras'); console.error(pRes.error); }
      else setPurchases((pRes.data || []).map(mapPurchase));

      // Migração única do localStorage -> Supabase (se houver dados locais e nenhum cartão no servidor)
      try {
        const migratedKey = `app:cards_migrated:${user.id}`;
        const alreadyMigrated = localStorage.getItem(migratedKey);
        const localCardsRaw = localStorage.getItem('app:cards');
        if (!alreadyMigrated && localCardsRaw && (cRes.data || []).length === 0) {
          const localCards: any[] = JSON.parse(localCardsRaw);
          if (localCards.length > 0) {
            const idMap = new Map<string, string>();
            const cardRows = localCards.map(c => {
              const newId = crypto.randomUUID();
              idMap.set(c.id, newId);
              return {
                id: newId, user_id: user.id, name: c.name,
                limit: c.limit, due_day: c.dueDay, color: c.color ?? null,
              };
            });
            const insCards = await supabase.from('cards').insert(cardRows).select();
            if (!insCards.error) setCards((insCards.data || []).map(mapCard));

            const localPurchasesRaw = localStorage.getItem('app:card_purchases');
            const localPurchases: any[] = localPurchasesRaw ? JSON.parse(localPurchasesRaw) : [];
            if (localPurchases.length > 0) {
              const pIdMap = new Map<string, string>();
              localPurchases.forEach(p => pIdMap.set(p.id, crypto.randomUUID()));
              const pRows = localPurchases
                .filter(p => idMap.has(p.cardId))
                .map(p => ({
                  id: pIdMap.get(p.id),
                  user_id: user.id,
                  card_id: idMap.get(p.cardId),
                  description: p.description,
                  category: p.category,
                  total_value: p.totalValue,
                  date: p.date,
                  parcelas: p.parcelas,
                  parcela_atual: p.parcelaAtual ?? null,
                  parent_id: p.parentId ? pIdMap.get(p.parentId) ?? null : null,
                }));
              if (pRows.length > 0) {
                const insP = await supabase.from('card_purchases').insert(pRows).select();
                if (!insP.error) setPurchases((insP.data || []).map(mapPurchase));
              }
            }
            toast.success('Dados de cartões migrados para a nuvem');
          }
          localStorage.setItem(migratedKey, '1');
        }
      } catch (e) {
        console.error('Falha na migração localStorage->Supabase:', e);
      }

      if (iRes.error) { console.error(iRes.error); }
      else {
        const now = new Date();
        const valid = (iRes.data || []).filter(
          (inv: any) => differenceInCalendarMonths(now, new Date(inv.saved_at)) < 3
        );
        // Auto-prune anything older than 3 months
        const expired = (iRes.data || []).filter(
          (inv: any) => differenceInCalendarMonths(now, new Date(inv.saved_at)) >= 3
        );
        if (expired.length > 0) {
          await supabase.from('saved_invoices').delete().in('id', expired.map((e: any) => e.id));
        }
        setSavedInvoices(valid.map(mapInvoice));
      }

      setLoading(false);
    };

    fetchAll();
  }, [user]);

  const addCard = useCallback(async (c: Omit<CreditCard, 'id' | 'createdAt'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('cards').insert({
      user_id: user.id,
      name: c.name,
      limit: c.limit,
      due_day: c.dueDay,
      color: c.color ?? null,
    }).select().single();

    if (error) { toast.error('Erro ao adicionar cartão'); console.error(error); return; }
    setCards(prev => [...prev, mapCard(data)]);
    toast.success('Cartão adicionado');
  }, [user]);

  const updateCard = useCallback(async (id: string, updates: Partial<CreditCard>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.limit !== undefined) dbUpdates.limit = updates.limit;
    if (updates.dueDay !== undefined) dbUpdates.due_day = updates.dueDay;
    if (updates.color !== undefined) dbUpdates.color = updates.color;

    const { error } = await supabase.from('cards').update(dbUpdates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar cartão'); console.error(error); return; }
    setCards(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    const { error } = await supabase.from('cards').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover cartão'); console.error(error); return; }
    setCards(prev => prev.filter(c => c.id !== id));
    setPurchases(prev => prev.filter(p => p.cardId !== id));
    setSavedInvoices(prev => prev.filter(i => i.cardId !== id));
    toast.success('Cartão removido');
  }, []);

  const addPurchase = useCallback(async (p: Omit<CardPurchase, 'id'>) => {
    if (!user) return;
    const parentId = crypto.randomUUID();
    const parcelaValue = p.totalValue / p.parcelas;
    const baseDate = new Date(p.date);

    const rows: any[] = [];
    rows.push({
      id: parentId,
      user_id: user.id,
      card_id: p.cardId,
      description: p.parcelas > 1 ? `${p.description} (1/${p.parcelas})` : p.description,
      category: p.category,
      total_value: parcelaValue,
      date: p.date,
      parcelas: p.parcelas,
      parcela_atual: p.parcelas > 1 ? 1 : null,
      parent_id: null,
    });

    if (p.parcelas > 1) {
      for (let i = 1; i < p.parcelas; i++) {
        const futureDate = addMonths(baseDate, i);
        rows.push({
          id: crypto.randomUUID(),
          user_id: user.id,
          card_id: p.cardId,
          description: `${p.description} (${i + 1}/${p.parcelas})`,
          category: p.category,
          total_value: parcelaValue,
          date: format(futureDate, 'yyyy-MM-dd'),
          parcelas: p.parcelas,
          parcela_atual: i + 1,
          parent_id: parentId,
        });
      }
    }

    const { data, error } = await supabase.from('card_purchases').insert(rows).select();
    if (error) { toast.error('Erro ao adicionar compra'); console.error(error); return; }
    setPurchases(prev => [...(data || []).map(mapPurchase), ...prev]);
    toast.success('Compra adicionada');
  }, [user]);

  const updatePurchase = useCallback(async (id: string, updates: Partial<CardPurchase>) => {
    const dbUpdates: any = {};
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.totalValue !== undefined) dbUpdates.total_value = updates.totalValue;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.parcelas !== undefined) dbUpdates.parcelas = updates.parcelas;
    if (updates.parcelaAtual !== undefined) dbUpdates.parcela_atual = updates.parcelaAtual;

    const { error } = await supabase.from('card_purchases').update(dbUpdates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar compra'); console.error(error); return; }
    setPurchases(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const deletePurchase = useCallback(async (id: string) => {
    // Trigger no banco apaga as parcelas filhas automaticamente
    const { error } = await supabase.from('card_purchases').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover compra'); console.error(error); return; }
    setPurchases(prev => prev.filter(p => p.id !== id && p.parentId !== id));
    toast.success('Compra removida');
  }, []);

  const saveInvoiceSnapshot = useCallback(
    async (cardId: string, monthKey: string, total: number, items: SavedInvoice['items']) => {
      if (!user) return;
      // Remove snapshot existente para mesmo card+mês (índice único impede duplicata)
      await supabase
        .from('saved_invoices')
        .delete()
        .eq('card_id', cardId)
        .eq('month_key', monthKey);

      const { data, error } = await supabase
        .from('saved_invoices')
        .insert({
          user_id: user.id,
          card_id: cardId,
          month_key: monthKey,
          total,
          items: items as any,
        })
        .select()
        .single();

      if (error) { console.error(error); return; }

      setSavedInvoices(prev => {
        const filtered = prev.filter(inv => !(inv.cardId === cardId && inv.monthKey === monthKey));
        const now = new Date();
        return [mapInvoice(data), ...filtered].filter(
          inv => differenceInCalendarMonths(now, new Date(inv.savedAt)) < 3
        );
      });
    },
    [user]
  );

  return (
    <CardContext.Provider
      value={{
        cards,
        purchases,
        savedInvoices,
        loading,
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
