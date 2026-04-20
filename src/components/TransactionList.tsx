import { useState } from 'react';
import { useTransactions } from '@/contexts/TransactionContext';
import { Transaction, TYPE_LABELS } from '@/types/transaction';
import { isCurrentMonth } from '@/hooks/useScoreCards';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface TransactionListProps {
  onEdit: (t: Transaction) => void;
}

export default function TransactionList({ onEdit }: TransactionListProps) {
  const { transactions, updateTransaction, deleteTransaction } = useTransactions();

  // Show only current month transactions for geral, debitos, investimentos tabs
  const visible = transactions.filter(t => isCurrentMonth(t.date));

  const sorted = [...visible].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // All transactions for "Todos" tab - ordenados por data crescente (mais antigos primeiro)
  const todosSorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // All transactions (no month filter) for any other use
  const allSorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Débitos ordenados por data crescente (mais antigos primeiro)
  const general = sorted;
  const debitos = visible
    .filter(t => t.type === 'debito')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const investimentos = sorted.filter(t => t.type === 'investimento');

  const handleStatusToggle = (t: Transaction) => {
    updateTransaction(t.id, { status: t.status === 'pendente' ? 'confirmado' : 'pendente' });
  };

  const renderRow = (t: Transaction, showCheckbox: boolean) => (
    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors animate-fade-in">
      {showCheckbox && (
        <td className="p-3">
          <Checkbox
            checked={t.status === 'confirmado'}
            onCheckedChange={() => handleStatusToggle(t)}
          />
        </td>
      )}
      <td className="p-3 font-medium">
        {t.description}
        {t.status === 'pendente' && (
          <Badge variant="outline" className="ml-2 border-warning text-warning text-xs">Pendente</Badge>
        )}
      </td>
      <td className={`p-3 ${t.type === 'entrada' ? 'text-success' : 'text-magenta'}`}>
        {t.type === 'entrada' ? '+' : '-'}{formatCurrency(t.value)}
      </td>
      <td className="p-3 text-muted-foreground">{t.date}</td>
      <td className="p-3 text-muted-foreground">{t.category}</td>
      {!showCheckbox && (
        <td className="p-3">
          <Badge variant="secondary" className="text-xs">{TYPE_LABELS[t.type]}</Badge>
        </td>
      )}
      <td className="p-3">
        <div className="flex gap-2">
          <button onClick={() => onEdit(t)} className="text-muted-foreground hover:text-foreground transition-colors">
            <Pencil size={16} />
          </button>
          <button onClick={() => deleteTransaction(t.id)} className="text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );

  const renderTable = (items: Transaction[], showCheckbox: boolean, showType: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            {showCheckbox && <th className="p-3">Pago</th>}
            <th className="p-3">Descrição</th>
            <th className="p-3">Valor</th>
            <th className="p-3">Data</th>
            <th className="p-3">Categoria</th>
            {showType && <th className="p-3">Tipo</th>}
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={showCheckbox ? 6 : (showType ? 6 : 5)} className="p-8 text-center text-muted-foreground">Nenhuma transação encontrada</td></tr>
          ) : items.map(t => renderRow(t, showCheckbox))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Tabs defaultValue="todos" className="mt-6">
      <TabsList className="bg-muted border border-border">
        <TabsTrigger value="todos">Todos</TabsTrigger>
        <TabsTrigger value="geral">Geral</TabsTrigger>
        <TabsTrigger value="debitos">Débitos</TabsTrigger>
        <TabsTrigger value="investimentos">Investimentos</TabsTrigger>
      </TabsList>
      <TabsContent value="todos" className="mt-4">
        {renderTable(todosSorted, false, true)}
      </TabsContent>
      <TabsContent value="geral" className="mt-4">
        {renderTable(general, false, true)}
      </TabsContent>
      <TabsContent value="debitos" className="mt-4">
        {renderTable(debitos, true, false)}
      </TabsContent>
      <TabsContent value="investimentos" className="mt-4">
        {renderTable(investimentos, false, false)}
      </TabsContent>
    </Tabs>
  );
}
