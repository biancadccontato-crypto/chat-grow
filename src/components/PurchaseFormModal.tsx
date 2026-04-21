import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCards } from '@/contexts/CardContext';
import { CardPurchase, CARD_CATEGORIES } from '@/types/card';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onClose: () => void;
  cardId: string;
  editPurchase?: CardPurchase | null;
}

export default function PurchaseFormModal({ open, onClose, cardId, editPurchase }: Props) {
  const { addPurchase, updatePurchase } = useCards();
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CARD_CATEGORIES[0]);
  const [value, setValue] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [parcelas, setParcelas] = useState('1');

  useEffect(() => {
    if (editPurchase) {
      setDescription(editPurchase.description);
      setCategory(editPurchase.category);
      // mostramos valor da parcela * parcelas para obter total aproximado
      setValue((editPurchase.totalValue * editPurchase.parcelas).toString());
      setDate(editPurchase.date);
      setParcelas(editPurchase.parcelas.toString());
    } else {
      setDescription('');
      setCategory(CARD_CATEGORIES[0]);
      setValue('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setParcelas('1');
    }
  }, [editPurchase, open]);

  const handleSubmit = () => {
    const numValue = parseFloat(value.replace(',', '.'));
    const numParcelas = parseInt(parcelas) || 1;
    if (!description || isNaN(numValue)) return;

    if (editPurchase) {
      updatePurchase(editPurchase.id, {
        description,
        category,
        totalValue: numValue / numParcelas,
        date,
      });
    } else {
      addPurchase({
        cardId,
        description,
        category,
        totalValue: numValue,
        date,
        parcelas: numParcelas,
      });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{editPurchase ? 'Editar Compra' : 'Nova Compra'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Descrição</Label>
            <Input placeholder="Ex: Mercado" value={description} onChange={e => setDescription(e.target.value)} className="bg-muted border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CARD_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor total (R$)</Label>
              <Input placeholder="0,00" value={value} onChange={e => setValue(e.target.value)} className="bg-muted border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-muted border-border" />
            </div>
            <div>
              <Label>Parcelas</Label>
              <Input type="number" min="1" value={parcelas} onChange={e => setParcelas(e.target.value)} disabled={!!editPurchase} className="bg-muted border-border" />
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full">Salvar Compra</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
