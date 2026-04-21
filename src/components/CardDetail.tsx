import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCards } from '@/contexts/CardContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { CreditCard as CardType, CardPurchase, SavedInvoice } from '@/types/card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Pencil, Trash2, Plus, Send, RefreshCw, Download, FileText } from 'lucide-react';
import PurchaseFormModal from './PurchaseFormModal';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  card: CardType;
  onEditCard: () => void;
  onDeleteCard: () => void;
}

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CardDetail({ card, onEditCard, onDeleteCard }: Props) {
  const { purchases, deletePurchase, savedInvoices, saveInvoiceSnapshot } = useCards();
  const { transactions } = useTransactions();
  const navigate = useNavigate();
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [editing, setEditing] = useState<CardPurchase | null>(null);

  const cardPurchases = useMemo(
    () => purchases.filter(p => p.cardId === card.id),
    [purchases, card.id]
  );

  // Agrupa por mês (yyyy-MM)
  const months = useMemo(() => {
    const map = new Map<string, CardPurchase[]>();
    cardPurchases.forEach(p => {
      const key = p.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [cardPurchases]);

  const currentMonthKey = format(new Date(), 'yyyy-MM');
  const defaultMonth = months.find(([k]) => k === currentMonthKey)?.[0] ?? months[0]?.[0] ?? currentMonthKey;

  const totalUsado = cardPurchases.reduce((s, p) => s + p.totalValue, 0);
  const pctLimite = Math.min(100, (totalUsado / card.limit) * 100);

  const invoiceDescription = (monthKey: string) => {
    const [y, m] = monthKey.split('-').map(Number);
    const dueDate = new Date(y, m - 1, Math.min(card.dueDay, new Date(y, m, 0).getDate()));
    return `Fatura ${card.name} - ${format(dueDate, 'MMM/yyyy', { locale: ptBR })}`;
  };

  const findExistingInvoice = (monthKey: string) => {
    const desc = invoiceDescription(monthKey);
    return transactions.find(
      t => t.description === desc && t.category === 'Cartão' && t.type === 'saida'
    );
  };

  const handleSendToHome = (monthKey: string, total: number, existingId?: string) => {
    const [y, m] = monthKey.split('-').map(Number);
    const dueDate = new Date(y, m - 1, Math.min(card.dueDay, new Date(y, m, 0).getDate()));

    // Salva snapshot da fatura para o relatório (3 meses)
    const items = (months.find(([k]) => k === monthKey)?.[1] ?? []).map(p => ({
      description: p.description,
      category: p.category,
      date: p.date,
      value: p.totalValue,
    }));
    saveInvoiceSnapshot(card.id, monthKey, total, items);

    const params = new URLSearchParams({
      type: 'saida',
      category: 'Cartão',
      description: invoiceDescription(monthKey),
      value: total.toFixed(2),
      date: format(dueDate, 'yyyy-MM-dd'),
      origem: card.name,
    });
    if (existingId) params.set('updateId', existingId);
    navigate(`/?${params.toString()}`);
  };

  // Faturas salvas deste cartão (ordenadas mais recentes primeiro)
  const cardSavedInvoices = useMemo(
    () => savedInvoices.filter(inv => inv.cardId === card.id).sort((a, b) => b.monthKey.localeCompare(a.monthKey)),
    [savedInvoices, card.id]
  );

  const downloadInvoicePdf = (inv: SavedInvoice) => {
    const [y, m] = inv.monthKey.split('-').map(Number);
    const monthLabel = format(new Date(y, m - 1, 1), 'MMMM/yyyy', { locale: ptBR });

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Fatura ${card.name}`, 14, 18);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Mês de referência: ${monthLabel}`, 14, 26);
    doc.text(`Vencimento dia ${card.dueDay} • Limite ${fmt(card.limit)}`, 14, 32);
    doc.text(`Salva em: ${format(parseISO(inv.savedAt), "dd/MM/yyyy 'às' HH:mm")}`, 14, 38);

    autoTable(doc, {
      startY: 46,
      head: [['Data', 'Descrição', 'Categoria', 'Valor']],
      body: inv.items.map(it => [
        format(parseISO(it.date), 'dd/MM/yyyy'),
        it.description,
        it.category,
        fmt(it.value),
      ]),
      foot: [['', '', 'Total', fmt(inv.total)]],
      headStyles: { fillColor: [30, 30, 30] },
      footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
      styles: { fontSize: 10 },
    });

    doc.save(`fatura-${card.name.replace(/\s+/g, '-').toLowerCase()}-${inv.monthKey}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Header do cartão + ações */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">{card.name}</h2>
          <p className="text-sm text-muted-foreground">
            Vencimento dia {card.dueDay} • Limite {fmt(card.limit)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={onEditCard}><Pencil size={16} /></Button>
          <Button variant="ghost" size="icon" onClick={onDeleteCard}><Trash2 size={16} /></Button>
        </div>
      </div>

      {/* Gráfico de barra do limite */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm text-muted-foreground">Uso do limite</span>
          <span className="text-sm font-medium">
            {fmt(totalUsado)} / {fmt(card.limit)}
          </span>
        </div>
        <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pctLimite}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{pctLimite.toFixed(1)}% utilizado</p>
      </Card>

      <Button onClick={() => { setEditing(null); setPurchaseModal(true); }} className="gap-2">
        <Plus size={16} /> Nova compra
      </Button>

      {/* Abas por mês */}
      {months.length === 0 ? (
        <Card className="p-8 text-center bg-card border-border text-muted-foreground">
          Nenhuma compra ainda. Adicione a primeira!
        </Card>
      ) : (
        <Tabs defaultValue={defaultMonth} className="mt-4">
          <TabsList className="flex-wrap h-auto">
            {months.map(([key]) => {
              const [y, m] = key.split('-').map(Number);
              return (
                <TabsTrigger key={key} value={key}>
                  {format(new Date(y, m - 1, 1), 'MMM/yy', { locale: ptBR })}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {months.map(([key, items]) => {
            const total = items.reduce((s, p) => s + p.totalValue, 0);
            const existing = findExistingInvoice(key);
            return (
              <TabsContent key={key} value={key} className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-md bg-muted gap-3 flex-wrap">
                  <div>
                    <p className="text-xs text-muted-foreground">Fatura do mês</p>
                    <p className="text-lg font-display font-bold">{fmt(total)}</p>
                    {existing && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Já adicionada: {fmt(existing.value)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => handleSendToHome(key, total)} className="gap-2">
                      <Send size={14} /> Adicionar à página inicial
                    </Button>
                    {existing && (
                      <Button size="sm" variant="default" onClick={() => handleSendToHome(key, total, existing.id)} className="gap-2">
                        <RefreshCw size={14} /> Atualizar
                      </Button>
                    )}
                  </div>
                </div>
                {items.map(p => (
                  <Card key={p.id} className="p-3 bg-card border-border flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.category} • {format(parseISO(p.date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-medium">{fmt(p.totalValue)}</span>
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setPurchaseModal(true); }}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deletePurchase(p.parentId ?? p.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <PurchaseFormModal
        open={purchaseModal}
        onClose={() => { setPurchaseModal(false); setEditing(null); }}
        cardId={card.id}
        editPurchase={editing}
      />
    </div>
  );
}
