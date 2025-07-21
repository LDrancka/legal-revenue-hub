-- Adicionar campo client_id na tabela transactions
ALTER TABLE public.transactions ADD COLUMN client_id UUID REFERENCES public.clients(id);