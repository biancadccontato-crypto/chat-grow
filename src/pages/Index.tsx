import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { TransactionProvider } from '@/contexts/TransactionContext';
import AppNav from '@/components/AppNav';
import ScoreCards from '@/components/ScoreCards';
import TransactionList from '@/components/TransactionList';
import TransactionModal from '@/components/TransactionModal';
import { Transaction } from '@/types/transaction';

function Dashboard() {
  const { signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [initialData, setInitialData] = useState<Partial<Omit<Transaction, 'id'>> | null>(null);

  // Detect query params from "Adicionar fatura à página inicial"
  useEffect(() => {
    if (searchParams.get('type') || searchParams.get('value')) {
      const valueRaw = searchParams.get('value');
      setInitialData({
        type: (searchParams.get('type') as Transaction['type']) ?? 'saida',
        category: searchParams.get('category') ?? '',
        description: searchParams.get('description') ?? '',
        value: valueRaw ? parseFloat(valueRaw) : undefined,
        date: searchParams.get('date') ?? undefined,
        origem: searchParams.get('origem') ?? '',
        status: 'pendente',
      });
      setEditTransaction(null);
      setModalOpen(true);
      // limpa a URL pra não reabrir
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleEdit = (t: Transaction) => {
    setEditTransaction(t);
    setInitialData(null);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditTransaction(null);
    setInitialData(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Finanças</h1>
          <p className="text-muted-foreground text-sm">Transações e balanço</p>
        </div>
        <div className="flex items-center gap-3">
          <AppNav />
          <Button onClick={() => { setInitialData(null); setEditTransaction(null); setModalOpen(true); }} className="gap-2">
            <Plus size={18} />
            Nova Transação
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
            <LogOut size={18} />
          </Button>
        </div>
      </div>

      <ScoreCards />
      <TransactionList onEdit={handleEdit} />
      <TransactionModal open={modalOpen} onClose={handleClose} editTransaction={editTransaction} initialData={initialData} />
    </div>
  );
}

export default function Index() {
  return (
    <TransactionProvider>
      <Dashboard />
    </TransactionProvider>
  );
}
