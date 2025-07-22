import * as XLSX from 'xlsx';

export interface ExportTransaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  status: string;
  due_date: string;
  payment_date?: string;
  account_name?: string;
  account_id?: string;
  payment_account_id?: string;
  case_name?: string;
  category_name?: string;
  client_name?: string;
  observations?: string;
  payment_observations?: string;
  is_split?: boolean;
  original_transaction_id?: string;
}

export const exportToExcel = (transactions: ExportTransaction[], filename: string = 'lancamentos') => {
  // Preparar dados para export
  const exportData = transactions.map(transaction => ({
    'Descrição': transaction.description,
    'Valor': transaction.amount,
    'Tipo': transaction.type === 'receita' ? 'Receita' : 'Despesa',
    'Status': transaction.status === 'pendente' ? 'Pendente' : 
              transaction.status === 'pago' ? 'Pago' : 
              transaction.status === 'cancelado' ? 'Cancelado' : transaction.status,
    'Data Vencimento': new Date(transaction.due_date).toLocaleDateString('pt-BR'),
    'Data Pagamento': transaction.payment_date ? new Date(transaction.payment_date).toLocaleDateString('pt-BR') : '',
    'Conta': transaction.account_name || '',
    'Caso': transaction.case_name || '',
    'Categoria': transaction.category_name || '',
    'Observações': transaction.observations || '',
    'Obs. Pagamento': transaction.payment_observations || ''
  }));

  // Criar workbook
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  
  // Ajustar largura das colunas
  const colWidths = [
    { wch: 30 }, // Descrição
    { wch: 12 }, // Valor
    { wch: 10 }, // Tipo
    { wch: 10 }, // Status
    { wch: 15 }, // Data Vencimento
    { wch: 15 }, // Data Pagamento
    { wch: 20 }, // Conta
    { wch: 20 }, // Caso
    { wch: 15 }, // Categoria
    { wch: 30 }, // Observações
    { wch: 30 }  // Obs. Pagamento
  ];
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Lançamentos');

  // Download do arquivo
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToCSV = (transactions: ExportTransaction[], filename: string = 'lancamentos') => {
  // Preparar dados para export
  const exportData = transactions.map(transaction => ({
    'Descrição': transaction.description,
    'Valor': transaction.amount,
    'Tipo': transaction.type === 'receita' ? 'Receita' : 'Despesa',
    'Status': transaction.status === 'pendente' ? 'Pendente' : 
              transaction.status === 'pago' ? 'Pago' : 
              transaction.status === 'cancelado' ? 'Cancelado' : transaction.status,
    'Data Vencimento': new Date(transaction.due_date).toLocaleDateString('pt-BR'),
    'Data Pagamento': transaction.payment_date ? new Date(transaction.payment_date).toLocaleDateString('pt-BR') : '',
    'Conta': transaction.account_name || '',
    'Caso': transaction.case_name || '',
    'Categoria': transaction.category_name || '',
    'Observações': transaction.observations || '',
    'Obs. Pagamento': transaction.payment_observations || ''
  }));

  // Criar worksheet e converter para CSV
  const ws = XLSX.utils.json_to_sheet(exportData);
  const csv = XLSX.utils.sheet_to_csv(ws);

  // Download do arquivo
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};