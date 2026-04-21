import { useState } from 'react';
import { Plus, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { CardProvider, useCards } from '@/contexts/CardContext';
import { TransactionProvider } from '@/contexts/TransactionContext';
import AppNav from '@/components/AppNav';
import CardFormModal from '@/components/CardFormModal';
import CardDetail from '@/components/CardDetail';
import { CreditCard } from '@/types/card';

function CardsContent() {
  const { cards, deleteCard } = useCards();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCard | null>(null);

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (c: CreditCard) => { setEditing(c); setModalOpen(true); };

  return (
    <>
      {cards.length === 0 ? (
        <Card className="p-10 text-center bg-card border-border">
          <p className="text-muted-foreground mb-4">Você ainda não tem cartões cadastrados.</p>
          <Button onClick={openNew} className="gap-2">
            <Plus size={16} /> Adicionar primeiro cartão
          </Button>
        </Card>
      ) : (
        <Tabs defaultValue={cards[0].id}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <TabsList className="flex-wrap h-auto">
              {cards.map(c => (
                <TabsTrigger key={c.id} value={c.id}>{c.name}</TabsTrigger>
              ))}
            </TabsList>
            <Button onClick={openNew} size="sm" className="gap-2">
              <Plus size={14} /> Novo cartão
            </Button>
          </div>
          {cards.map(c => (
            <TabsContent key={c.id} value={c.id} className="mt-4">
              <CardDetail
                card={c}
                onEditCard={() => openEdit(c)}
                onDeleteCard={() => {
                  if (confirm(`Excluir o cartão "${c.name}" e todas as suas compras?`)) deleteCard(c.id);
                }}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}

      <CardFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} editCard={editing} />
    </>
  );
}

export default function Cards() {
  const { signOut } = useAuth();
  return (
    <TransactionProvider>
      <CardProvider>
        <div className="min-h-screen bg-background p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-display font-bold">Cartões</h1>
            <p className="text-muted-foreground text-sm">Limites, faturas e parcelamentos</p>
          </div>
          <div className="flex items-center gap-3">
            <AppNav />
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
          <CardsContent />
        </div>
      </CardProvider>
    </TransactionProvider>
  );
}
