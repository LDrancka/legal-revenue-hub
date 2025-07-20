-- Vamos resetar completamente a senha do usuário admin
-- e garantir que ele esteja configurado corretamente

UPDATE auth.users 
SET 
  encrypted_password = crypt('admin123', gen_salt('bf')),
  email_confirmed_at = now(),
  confirmed_at = now(),
  email_change = '',
  email_change_token_new = '',
  recovery_token = '',
  email_change_token_current = '',
  raw_user_meta_data = '{"display_name": "Administrador"}'::jsonb,
  updated_at = now()
WHERE email = 'admin@jusfinance.com';

-- Garantir que o perfil existe
INSERT INTO public.profiles (user_id, display_name)
SELECT id, 'Administrador'
FROM auth.users 
WHERE email = 'admin@jusfinance.com'
ON CONFLICT (user_id) DO UPDATE SET display_name = 'Administrador';

-- Garantir que a role de admin existe
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'admin@jusfinance.com'
ON CONFLICT (user_id, role) DO NOTHING;