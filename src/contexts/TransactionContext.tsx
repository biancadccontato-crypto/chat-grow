import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionType, TransactionStatus } from '@/types/transaction';
import { addMonths, format } from 'date-fns';

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, t: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  customCategories: Record<TransactionType, string[]>;
  addCustomCategory: (type: TransactionType, category: string) => void;
}

const TransactionContext = createContext<TransactionContextType | null>(null);

export const useTransactions = () => {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionProvider');
  return ctx;
};

const STORAGE_KEY = 'finance-transactions';
const CATEGORIES_KEY = 'finance-custom-categories';

const generateId = () => crypto.randomUUID();

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [customCategories, setCustomCategories] = useState<Record<TransactionType, string[]>>(() => {
    const saved = localStorage.getItem(CATEGORIES_KEY);
    return saved ? JSON.parse(saved) : { entrada: [], saida: [], debito: [], investimento: [] };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(customCategories));
  }, [customCategories]);

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    const parentId = generateId();
    const base: Transaction = { ...t, id: parentId };
    const newTransactions: Transaction[] = [base];

    if (t.parcelas > 1) {
      for (let i = 1; i < t.parcelas; i++) {
        const futureDate = addMonths(new Date(t.date), i);
        newTransactions.push({
          ...t,
          id: generateId(),
          date: format(futureDate, 'yyyy-MM-dd'),
          parcelaAtual: i + 1,
          parentId,
          description: `${t.description} (${i + 1}/${t.parcelas})`,
        });
      }
      newTransactions[0].parcelaAtual = 1;
      newTransactions[0].description = `${t.description} (1/${t.parcelas})`;
    }

    setTransactions(prev => [...prev, ...newTransactions]);
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id && t.parentId !== id));
  }, []);

  const addCustomCategory = useCallback((type: TransactionType, category: string) => {
    setCustomCategories(prev => ({
      ...prev,
      [type]: [...prev[type], category],
    }));
  }, []);

  return (
    <TransactionContext.Provider value={{ transactions, addTransaction, updateTransaction, deleteTransaction, customCategories, addCustomCategory }}>
      {children}
    </TransactionContext.Provider>
  );
};
