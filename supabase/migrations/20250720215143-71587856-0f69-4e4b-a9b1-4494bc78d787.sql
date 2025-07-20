
-- Criar o primeiro usuário admin diretamente no banco
-- Substitua 'seu@email.com' pelo seu email e 'suasenha123' pela senha desejada

-- Primeiro, vamos inserir o usuário na tabela auth.users
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
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@jusfinance.com', -- ALTERE ESTE EMAIL
  crypt('admin123', gen_salt('bf')), -- ALTERE ESTA SENHA
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"display_name": "Administrador"}',
  false,
  'authenticated'
);

-- Criar perfil e role de admin para o usuário criado
-- O trigger handle_new_user() irá criar automaticamente o perfil e a role de admin
-- pois este será o primeiro usuário no sistema
