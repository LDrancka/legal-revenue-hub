-- Resetar apenas a senha do usuário admin
UPDATE auth.users 
SET encrypted_password = crypt('admin123', gen_salt('bf'))
WHERE email = 'admin@jusfinance.com';