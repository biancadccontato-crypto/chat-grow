import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCards } from '@/contexts/CardContext';
import { CreditCard } from '@/types/card';

interface Props {
  open: boolean;
  onClose: () => void;
  editCard?: CreditCard | null;
}

export default function CardFormModal({ open, onClose, editCard }: Props) {
  const { addCard, updateCard } = useCards();
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [dueDay, setDueDay] = useState('10');

  useEffect(() => {
    if (editCard) {
      setName(editCard.name);
      setLimit(editCard.limit.toString());
      setDueDay(editCard.dueDay.toString());
    } else {
      setName('');
      setLimit('');
      setDueDay('10');
    }
  }, [editCard, open]);

  const handleSubmit = () => {
    const numLimit = parseFloat(limit.replace(',', '.'));
    const numDueDay = parseInt(dueDay);
    if (!name || isNaN(numLimit) || isNaN(numDueDay) || numDueDay < 1 || numDueDay > 31) return;

    const data = { name, limit: numLimit, dueDay: numDueDay };
    if (editCard) updateCard(editCard.id, data);
    else addCard(data);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{editCard ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome do cartão</Label>
            <Input placeholder="Ex: Nubank" value={name} onChange={e => setName(e.target.value)} className="bg-muted border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Limite total (R$)</Label>
              <Input placeholder="0,00" value={limit} onChange={e => setLimit(e.target.value)} className="bg-muted border-border" />
            </div>
            <div>
              <Label>Dia de vencimento</Label>
              <Input type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} className="bg-muted border-border" />
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full">Salvar Cartão</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
