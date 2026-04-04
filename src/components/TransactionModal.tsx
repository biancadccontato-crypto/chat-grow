import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTransactions } from '@/contexts/TransactionContext';
import { Transaction, TransactionType, TransactionStatus, CATEGORIES, TYPE_LABELS } from '@/types/transaction';
import { format } from 'date-fns';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  editTransaction?: Transaction | null;
}

export default function TransactionModal({ open, onClose, editTransaction }: TransactionModalProps) {
  const { addTransaction, updateTransaction, customCategories, addCustomCategory } = useTransactions();

  const [type, setType] = useState<TransactionType>('entrada');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<TransactionStatus>('confirmado');
  const [parcelas, setParcelas] = useState('1');
  const [origem, setOrigem] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  useEffect(() => {
    if (editTransaction) {
      setType(editTransaction.type);
      setDescription(editTransaction.description);
      setCategory(editTransaction.category);
      setValue(editTransaction.value.toString());
      setDate(editTransaction.date);
      setStatus(editTransaction.status);
      setParcelas(editTransaction.parcelas.toString());
      setOrigem(editTransaction.origem || '');
    } else {
      setType('entrada');
      setDescription('');
      setCategory('');
      setValue('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setStatus('confirmado');
      setParcelas('1');
      setOrigem('');
    }
    setShowNewCategory(false);
    setNewCategory('');
  }, [editTransaction, open]);

  const allCategories = [...CATEGORIES[type], ...(customCategories[type] || [])];

  const handleSubmit = () => {
    const numValue = parseFloat(value.replace(',', '.'));
    if (!description || !category || isNaN(numValue)) return;

    const data = {
      type,
      description,
      category,
      value: numValue,
      date,
      status,
      parcelas: parseInt(parcelas) || 1,
      origem,
    };

    if (editTransaction) {
      updateTransaction(editTransaction.id, data);
    } else {
      addTransaction(data);
    }
    onClose();
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      addCustomCategory(type, newCategory.trim());
      setCategory(newCategory.trim());
      setShowNewCategory(false);
      setNewCategory('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{editTransaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-muted border-border" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v: TransactionType) => { setType(v); setCategory(''); }}>
                <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Input placeholder="Ex: Salário" value={description} onChange={e => setDescription(e.target.value)} className="bg-muted border-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              {showNewCategory ? (
                <div className="flex gap-1">
                  <Input placeholder="Nova categoria" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="bg-muted border-border" />
                  <Button size="sm" onClick={handleAddCategory}>+</Button>
                </div>
              ) : (
                <Select value={category} onValueChange={v => v === '__new__' ? setShowNewCategory(true) : setCategory(v)}>
                  <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {allCategories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    <SelectItem value="__new__">+ Nova Categoria</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input placeholder="0,00" value={value} onChange={e => setValue(e.target.value)} className="bg-muted border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v: TransactionStatus) => setStatus(v)}>
                <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Parcelas</Label>
              <Input type="number" min="1" value={parcelas} onChange={e => setParcelas(e.target.value)} className="bg-muted border-border" />
            </div>
          </div>

          <div>
            <Label>Origem (opcional)</Label>
            <Input placeholder="Ex: Nubank" value={origem} onChange={e => setOrigem(e.target.value)} className="bg-muted border-border" />
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Salvar Transação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
