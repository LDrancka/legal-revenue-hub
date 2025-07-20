-- Criar enum para tipo de conta
CREATE TYPE public.account_type AS ENUM ('bank', 'cash', 'investment');

-- Criar enum para tipo de lançamento
CREATE TYPE public.transaction_type AS ENUM ('receita', 'despesa');

-- Criar enum para status de lançamento
CREATE TYPE public.transaction_status AS ENUM ('pendente', 'pago');

-- Criar enum para frequência de recorrência
CREATE TYPE public.recurrence_frequency AS ENUM ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual');

-- Tabela de contas e caixas
CREATE TABLE public.accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    type account_type NOT NULL,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de casos/centros de custo
CREATE TABLE public.cases (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de lançamentos financeiros
CREATE TABLE public.transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    type transaction_type NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    account_id UUID REFERENCES public.accounts(id),
    case_id UUID REFERENCES public.cases(id),
    due_date DATE NOT NULL,
    status transaction_status NOT NULL DEFAULT 'pendente',
    payment_date DATE,
    payment_account_id UUID REFERENCES public.accounts(id),
    payment_observations TEXT,
    observations TEXT,
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    recurrence_frequency recurrence_frequency,
    recurrence_count INTEGER,
    recurrence_end_date DATE,
    recurrence_original_id UUID REFERENCES public.transactions(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de rateios
CREATE TABLE public.transaction_splits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    amount DECIMAL(15,2) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ativar Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_splits ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para accounts
CREATE POLICY "Users can view their own accounts" 
ON public.accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounts" 
ON public.accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts" 
ON public.accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts" 
ON public.accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para cases
CREATE POLICY "Users can view their own cases" 
ON public.cases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cases" 
ON public.cases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cases" 
ON public.cases 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cases" 
ON public.cases 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para transactions
CREATE POLICY "Users can view their own transactions" 
ON public.transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" 
ON public.transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" 
ON public.transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para transaction_splits
CREATE POLICY "Users can view splits of their transactions" 
ON public.transaction_splits 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.transactions 
    WHERE transactions.id = transaction_splits.transaction_id 
    AND transactions.user_id = auth.uid()
));

CREATE POLICY "Users can create splits for their transactions" 
ON public.transaction_splits 
FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.transactions 
    WHERE transactions.id = transaction_splits.transaction_id 
    AND transactions.user_id = auth.uid()
));

CREATE POLICY "Users can update splits of their transactions" 
ON public.transaction_splits 
FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM public.transactions 
    WHERE transactions.id = transaction_splits.transaction_id 
    AND transactions.user_id = auth.uid()
));

CREATE POLICY "Users can delete splits of their transactions" 
ON public.transaction_splits 
FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM public.transactions 
    WHERE transactions.id = transaction_splits.transaction_id 
    AND transactions.user_id = auth.uid()
));

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cases_updated_at
    BEFORE UPDATE ON public.cases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_cases_user_id ON public.cases(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX idx_transactions_case_id ON public.transactions(case_id);
CREATE INDEX idx_transactions_due_date ON public.transactions(due_date);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transaction_splits_transaction_id ON public.transaction_splits(transaction_id);