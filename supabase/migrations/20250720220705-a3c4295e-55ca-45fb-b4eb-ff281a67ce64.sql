-- Corrigir usuário admin com todos os campos obrigatórios
DELETE FROM auth.users WHERE email = 'admin@jusfinance.com';

-- Inserir usuário admin com todos os campos necessários
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  created_at,
  updated_at,
  confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  email_change_token_current,
  is_sso_user
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@jusfinance.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"display_name": "Administrador"}',
  false,
  'authenticated',
  'authenticated',
  '',
  false
);