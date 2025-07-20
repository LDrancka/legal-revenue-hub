-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Criar tabela de roles de usuário
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário tem role específico (SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Política: Usuários podem ver seus próprios roles
CREATE POLICY "Users can view own roles"
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

-- Política: Apenas admins podem gerenciar roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Criar tabela de convites
CREATE TABLE public.invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    role app_role NOT NULL DEFAULT 'user',
    invited_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
    used_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS para convites
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins podem criar e ver convites
CREATE POLICY "Admins can manage invitations"
ON public.invitations 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Política: Permitir leitura pública de convites válidos (para validação)
CREATE POLICY "Public can read valid invitations"
ON public.invitations 
FOR SELECT 
USING (expires_at > now() AND used_at IS NULL);

-- Atualizar função handle_new_user para não criar automaticamente
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Nova função para criar usuário apenas com convite válido
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record public.invitations;
    user_email text;
BEGIN
    -- Obter email do usuário
    user_email := NEW.email;
    
    -- Verificar se existe convite válido
    SELECT * INTO invitation_record
    FROM public.invitations 
    WHERE email = user_email 
    AND expires_at > now() 
    AND used_at IS NULL;
    
    -- Se não há convite válido, impedir criação (exceto se é o primeiro usuário)
    IF invitation_record IS NULL THEN
        -- Verificar se é o primeiro usuário (não há outros usuários)
        IF (SELECT COUNT(*) FROM auth.users) > 1 THEN
            RAISE EXCEPTION 'Usuário deve ter um convite válido para se cadastrar';
        END IF;
        
        -- Se é o primeiro usuário, criar como admin
        INSERT INTO public.profiles (user_id, display_name)
        VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
        
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'admin');
    ELSE
        -- Criar perfil
        INSERT INTO public.profiles (user_id, display_name)
        VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
        
        -- Atribuir role do convite
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, invitation_record.role);
        
        -- Marcar convite como usado
        UPDATE public.invitations 
        SET used_at = now() 
        WHERE id = invitation_record.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();