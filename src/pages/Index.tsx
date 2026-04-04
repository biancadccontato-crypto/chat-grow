import { useState } from 'react';
import { Plus, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { TransactionProvider } from '@/contexts/TransactionContext';
import ScoreCards from '@/components/ScoreCards';
import TransactionList from '@/components/TransactionList';
import TransactionModal from '@/components/TransactionModal';
import FloatingChat from '@/components/FloatingChat';
import { Transaction } from '@/types/transaction';

function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);

  const handleEdit = (t: Transaction) => {
    setEditTransaction(t);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditTransaction(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Finanças</h1>
          <p className="text-muted-foreground text-sm">Transações e balanço</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus size={18} />
          Nova Transação
        </Button>
      </div>

      <ScoreCards />
      <TransactionList onEdit={handleEdit} />
      <TransactionModal open={modalOpen} onClose={handleClose} editTransaction={editTransaction} />
      <FloatingChat />
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
