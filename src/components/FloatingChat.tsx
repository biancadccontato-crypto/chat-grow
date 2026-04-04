import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useTransactions } from '@/contexts/TransactionContext';
import { TransactionType, TransactionStatus, CATEGORIES } from '@/types/transaction';
import { format, subDays, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  transactionData?: ParsedTransaction | null;
  confirmed?: boolean;
}

interface ParsedTransaction {
  type: TransactionType;
  description: string;
  category: string;
  value: number;
  date: string;
  status: TransactionStatus;
}

function parseMessage(text: string): ParsedTransaction | null {
  const lower = text.toLowerCase();

  let type: TransactionType = 'saida';
  if (/recebi|ganhei|entrou|salário|freelance/i.test(lower)) type = 'entrada';
  else if (/investi|poupança|poupar|guardei/i.test(lower)) type = 'investimento';
  else if (/gastei|paguei|comprei|saiu/i.test(lower)) type = 'saida';
  else if (/devo|parcela|financ/i.test(lower)) type = 'debito';

  const valueMatch = lower.match(/r?\$?\s*(\d[\d.,]*)/);
  if (!valueMatch) return null;
  const value = parseFloat(valueMatch[1].replace('.', '').replace(',', '.'));
  if (isNaN(value)) return null;

  let date = format(new Date(), 'yyyy-MM-dd');
  if (/ontem/.test(lower)) date = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  else if (/amanhã|amanha/.test(lower)) date = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  else if (/anteontem/.test(lower)) date = format(subDays(new Date(), 2), 'yyyy-MM-dd');

  const cats = CATEGORIES[type];
  let category = cats[0];
  for (const c of cats) {
    if (lower.includes(c.toLowerCase())) { category = c; break; }
  }

  const cleanDesc = text
    .replace(/r?\$?\s*\d[\d.,]*/i, '')
    .replace(/ontem|amanhã|amanha|anteontem|hoje/gi, '')
    .replace(/gastei|paguei|recebi|ganhei|investi|comprei|guardei/gi, '')
    .replace(/com|de|em|no|na|para|por/gi, '')
    .trim();

  const description = cleanDesc.length > 2 ? cleanDesc : text.substring(0, 30);

  return { type, description, category, value, date, status: 'confirmado' };
}

const TYPE_EMOJI: Record<TransactionType, string> = {
  entrada: '💰', saida: '💸', debito: '📋', investimento: '📈',
};

export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant', content: 'Olá! 👋 Sou seu agente financeiro. Diga algo como "gastei 50 reais com alimentação ontem" e eu registro pra você!' },
  ]);
  const { addTransaction } = useTransactions();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input };
    const parsed = parseMessage(input);

    let assistantMsg: ChatMessage;
    if (parsed) {
      assistantMsg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `${TYPE_EMOJI[parsed.type]} Entendi! Aqui está o resumo:\n\n• **Tipo:** ${parsed.type}\n• **Descrição:** ${parsed.description}\n• **Valor:** R$ ${parsed.value.toFixed(2)}\n• **Categoria:** ${parsed.category}\n• **Data:** ${parsed.date}`,
        transactionData: parsed,
      };
    } else {
      assistantMsg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Não consegui identificar o valor. Tente algo como "gastei 80 reais com transporte" 😊',
      };
    }

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
  };

  const handleConfirm = (msg: ChatMessage) => {
    if (!msg.transactionData) return;
    const t = msg.transactionData;
    addTransaction({ ...t, parcelas: 1 });
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, confirmed: true, content: m.content + '\n\n✅ Transação salva!' } : m));
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        >
          <MessageCircle className="text-primary-foreground" size={24} />
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[500px] bg-card border border-border rounded-xl shadow-2xl flex flex-col animate-slide-up overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-display font-semibold">💬 Agente Financeiro</h3>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  {msg.content}
                  {msg.transactionData && !msg.confirmed && (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" onClick={() => handleConfirm(msg)} className="text-xs h-7">Confirmar</Button>
                      <Button size="sm" variant="outline" className="text-xs h-7">Ajustar</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ex: gastei 50 com almoço"
              className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary transition-colors"
            />
            <button onClick={handleSend} className="text-primary hover:text-primary/80 transition-colors">
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
