-- Criar tabela para dados do escritório/recibos
CREATE TABLE public.office_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  owner_name TEXT, -- Nome do dono/razão social
  owner_document TEXT, -- CPF ou CNPJ
  document_type TEXT CHECK (document_type IN ('cpf', 'cnpj')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.office_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own office settings" 
ON public.office_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own office settings" 
ON public.office_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own office settings" 
ON public.office_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own office settings" 
ON public.office_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_office_settings_updated_at
BEFORE UPDATE ON public.office_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();