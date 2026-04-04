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
  const { signOut } = useAuth();
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
        <div className="flex gap-2">
          <Button onClick={() => setModalOpen(true)} className="gap-2">
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
