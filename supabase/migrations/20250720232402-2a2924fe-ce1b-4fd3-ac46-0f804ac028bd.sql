-- Criar tabela de categorias
CREATE TABLE public.categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, name)
);

-- Habilitar RLS para categorias
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para categorias
CREATE POLICY "Users can view their own categories" 
ON public.categories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" 
ON public.categories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" 
ON public.categories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Adicionar categoria_id na tabela transactions
ALTER TABLE public.transactions 
ADD COLUMN category_id UUID REFERENCES public.categories(id);

-- Criar tabela de anexos
CREATE TABLE public.transaction_attachments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para anexos
ALTER TABLE public.transaction_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para anexos (baseadas na transação)
CREATE POLICY "Users can view attachments of their transactions" 
ON public.transaction_attachments 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.transactions 
    WHERE transactions.id = transaction_attachments.transaction_id 
    AND transactions.user_id = auth.uid()
));

CREATE POLICY "Users can create attachments for their transactions" 
ON public.transaction_attachments 
FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.transactions 
    WHERE transactions.id = transaction_attachments.transaction_id 
    AND transactions.user_id = auth.uid()
));

CREATE POLICY "Users can delete attachments of their transactions" 
ON public.transaction_attachments 
FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM public.transactions 
    WHERE transactions.id = transaction_attachments.transaction_id 
    AND transactions.user_id = auth.uid()
));

-- Criar bucket de storage para anexos
INSERT INTO storage.buckets (id, name, public) VALUES ('transaction-attachments', 'transaction-attachments', false);

-- Políticas de storage para anexos
CREATE POLICY "Users can view their own transaction attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'transaction-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own transaction attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'transaction-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own transaction attachments" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'transaction-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger para timestamps nas categorias
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();