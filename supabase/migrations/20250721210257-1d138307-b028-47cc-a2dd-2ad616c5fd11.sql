-- Alterar enum de status de transaction para usar "quitado" em vez de "pago"
ALTER TYPE transaction_status RENAME VALUE 'pago' TO 'quitado';