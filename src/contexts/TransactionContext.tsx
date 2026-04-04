import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionType, TransactionStatus } from '@/types/transaction';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addMonths, format } from 'date-fns';
import { toast } from 'sonner';

interface TransactionContextType {
  transactions: Transaction[];
  loading: boolean;
  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, t: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  customCategories: Record<TransactionType, string[]>;
  addCustomCategory: (type: TransactionType, category: string) => Promise<void>;
}

const TransactionContext = createContext<TransactionContextType | null>(null);

export const useTransactions = () => {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionProvider');
  return ctx;
};

const mapRow = (row: any): Transaction => ({
  id: row.id,
  date: row.date,
  type: row.type as TransactionType,
  description: row.description,
  category: row.category,
  value: Number(row.value),
  status: row.status as TransactionStatus,
  parcelas: row.parcelas,
  parcelaAtual: row.parcela_atual ?? undefined,
  parentId: row.parent_id ?? undefined,
  origem: row.origin ?? undefined,
});

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customCategories, setCustomCategories] = useState<Record<TransactionType, string[]>>({
    entrada: [], saida: [], debito: [], investimento: [],
  });
  const [loading, setLoading] = useState(true);

  // Fetch transactions
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        toast.error('Erro ao carregar transações');
        console.error(error);
      } else {
        setTransactions((data || []).map(mapRow));
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  // Fetch custom categories
  useEffect(() => {
    if (!user) return;

    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('custom_categories')
        .select('*');

      if (error) {
        console.error(error);
        return;
      }

      const cats: Record<TransactionType, string[]> = {
        entrada: [], saida: [], debito: [], investimento: [],
      };
      (data || []).forEach((row) => {
        const type = row.type as TransactionType;
        if (cats[type]) cats[type].push(row.name);
      });
      setCustomCategories(cats);
    };

    fetchCategories();
  }, [user]);

  const addTransaction = useCallback(async (t: Omit<Transaction, 'id'>) => {
    if (!user) return;

    const rows: any[] = [];
    const parentId = crypto.randomUUID();

    const baseRow = {
      id: parentId,
      user_id: user.id,
      type: t.type,
      category: t.category,
      description: t.parcelas > 1 ? `${t.description} (1/${t.parcelas})` : t.description,
      value: t.value,
      date: t.date,
      origin: t.origem || '',
      status: t.status,
      parcelas: t.parcelas,
      parcela_atual: t.parcelas > 1 ? 1 : null,
      parent_id: null,
    };
    rows.push(baseRow);

    if (t.parcelas > 1) {
      for (let i = 1; i < t.parcelas; i++) {
        const futureDate = addMonths(new Date(t.date), i);
        rows.push({
          id: crypto.randomUUID(),
          user_id: user.id,
          type: t.type,
          category: t.category,
          description: `${t.description} (${i + 1}/${t.parcelas})`,
          value: t.value,
          date: format(futureDate, 'yyyy-MM-dd'),
          origin: t.origem || '',
          status: t.status,
          parcelas: t.parcelas,
          parcela_atual: i + 1,
          parent_id: parentId,
        });
      }
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(rows)
      .select();

    if (error) {
      toast.error('Erro ao salvar transação');
      console.error(error);
    } else {
      setTransactions(prev => [...(data || []).map(mapRow), ...prev]);
      toast.success('Transação salva!');
    }
  }, [user]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    const dbUpdates: any = {};
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.value !== undefined) dbUpdates.value = updates.value;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.origem !== undefined) dbUpdates.origin = updates.origem;
    if (updates.parcelas !== undefined) dbUpdates.parcelas = updates.parcelas;
    if (updates.parcelaAtual !== undefined) dbUpdates.parcela_atual = updates.parcelaAtual;

    const { error } = await supabase
      .from('transactions')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar transação');
      console.error(error);
    } else {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    // Delete parent and children (cascade handles children in DB)
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir transação');
      console.error(error);
    } else {
      setTransactions(prev => prev.filter(t => t.id !== id && t.parentId !== id));
      toast.success('Transação excluída');
    }
  }, []);

  const addCustomCategory = useCallback(async (type: TransactionType, category: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('custom_categories')
      .insert({ user_id: user.id, type, name: category });

    if (error) {
      toast.error('Erro ao salvar categoria');
      console.error(error);
    } else {
      setCustomCategories(prev => ({
        ...prev,
        [type]: [...prev[type], category],
      }));
    }
  }, [user]);

  return (
    <TransactionContext.Provider value={{ transactions, loading, addTransaction, updateTransaction, deleteTransaction, customCategories, addCustomCategory }}>
      {children}
    </TransactionContext.Provider>
  );
};
