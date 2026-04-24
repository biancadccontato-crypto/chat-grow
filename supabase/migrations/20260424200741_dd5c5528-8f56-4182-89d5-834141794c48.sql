
-- Cards
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  "limit" NUMERIC NOT NULL,
  due_day INTEGER NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cards" ON public.cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own cards" ON public.cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cards" ON public.cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cards" ON public.cards FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_cards_updated_at
BEFORE UPDATE ON public.cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Card purchases
CREATE TABLE public.card_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  total_value NUMERIC NOT NULL,
  date DATE NOT NULL,
  parcelas INTEGER NOT NULL DEFAULT 1,
  parcela_atual INTEGER,
  parent_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_card_purchases_card_id ON public.card_purchases(card_id);
CREATE INDEX idx_card_purchases_parent_id ON public.card_purchases(parent_id);

ALTER TABLE public.card_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own card purchases" ON public.card_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own card purchases" ON public.card_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own card purchases" ON public.card_purchases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own card purchases" ON public.card_purchases FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_card_purchases_updated_at
BEFORE UPDATE ON public.card_purchases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cascade delete child installments when parent is deleted
CREATE OR REPLACE FUNCTION public.delete_child_purchases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.card_purchases WHERE parent_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER cascade_delete_child_purchases
BEFORE DELETE ON public.card_purchases
FOR EACH ROW EXECUTE FUNCTION public.delete_child_purchases();

-- Saved invoices
CREATE TABLE public.saved_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  total NUMERIC NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_invoices_card_id ON public.saved_invoices(card_id);
CREATE UNIQUE INDEX idx_saved_invoices_card_month ON public.saved_invoices(card_id, month_key);

ALTER TABLE public.saved_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved invoices" ON public.saved_invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own saved invoices" ON public.saved_invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own saved invoices" ON public.saved_invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own saved invoices" ON public.saved_invoices FOR DELETE USING (auth.uid() = user_id);
