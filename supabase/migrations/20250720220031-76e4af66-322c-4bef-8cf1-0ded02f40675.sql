-- Deletar o usuário existente e recriar com senha correta
DELETE FROM auth.users WHERE email = 'admin@jusfinance.com';

-- Recriar o usuário com configurações corretas
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@jusfinance.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"display_name": "Administrador"}',
  false,
  'authenticated',
  'authenticated'
);