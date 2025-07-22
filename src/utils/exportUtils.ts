import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

export const exportToPDF = (
  transactions: ExportTransaction[], 
  filename: string = 'extrato', 
  accountName: string = 'Conta',
  initialBalance: number = 0
) => {
  const doc = new jsPDF();
  
  // Título do relatório
  doc.setFontSize(18);
  doc.text('EXTRATO DE CONTA', 20, 20);
  
  doc.setFontSize(12);
  doc.text(`Conta: ${accountName}`, 20, 35);
  doc.text(`Período: ${new Date().toLocaleDateString('pt-BR')}`, 20, 45);
  doc.text(`Saldo Anterior: R$ ${initialBalance.toFixed(2).replace('.', ',')}`, 20, 55);
  
  // Preparar dados ordenados por data de pagamento/vencimento
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.payment_date || a.due_date);
    const dateB = new Date(b.payment_date || b.due_date);
    return dateA.getTime() - dateB.getTime();
  });
  
  // Calcular saldos progressivos
  let currentBalance = initialBalance;
  const tableData = sortedTransactions.map(transaction => {
    const isExpense = transaction.type === 'despesa';
    const amount = isExpense ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);
    currentBalance += amount;
    
    const date = transaction.payment_date 
      ? new Date(transaction.payment_date).toLocaleDateString('pt-BR')
      : new Date(transaction.due_date).toLocaleDateString('pt-BR');
    
    const formattedAmount = `${isExpense ? '-' : ''}R$ ${Math.abs(transaction.amount).toFixed(2).replace('.', ',')}`;
    const formattedBalance = `R$ ${currentBalance.toFixed(2).replace('.', ',')}`;
    
    return [
      date,
      transaction.description,
      transaction.type === 'receita' ? 'Receita' : 'Despesa',
      formattedAmount,
      formattedBalance,
      transaction.status === 'pendente' ? 'Pendente' : 
      transaction.status === 'pago' ? 'Pago' : 
      transaction.status === 'cancelado' ? 'Cancelado' : transaction.status,
      'Admin' // Placeholder para usuário
    ];
  });
  
  // Configurar tabela
  (doc as any).autoTable({
    head: [['Data', 'Descrição', 'Tipo', 'Valor', 'Saldo', 'Status', 'Usuário']],
    body: tableData,
    startY: 65,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246], // Azul
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 20 }, // Data
      1: { cellWidth: 40 }, // Descrição
      2: { cellWidth: 20 }, // Tipo
      3: { cellWidth: 25 }, // Valor
      4: { cellWidth: 25 }, // Saldo
      5: { cellWidth: 20 }, // Status
      6: { cellWidth: 20 }, // Usuário
    },
    didParseCell: function(data: any) {
      // Colorir valores de despesa em vermelho
      if (data.column.index === 3 && data.cell.text[0]?.startsWith('-')) {
        data.cell.styles.textColor = [220, 38, 38]; // Vermelho
      }
      
      // Colorir tipo Despesa em vermelho
      if (data.column.index === 2 && data.cell.text[0] === 'Despesa') {
        data.cell.styles.textColor = [220, 38, 38]; // Vermelho
      }
      
      // Colorir tipo Receita em verde
      if (data.column.index === 2 && data.cell.text[0] === 'Receita') {
        data.cell.styles.textColor = [34, 197, 94]; // Verde
      }
    },
    margin: { top: 10, left: 10, right: 10 },
  });
  
  // Adicionar resumo final
  const finalY = (doc as any).lastAutoTable.finalY || 65;
  doc.setFontSize(12);
  doc.text(`Saldo Final: R$ ${currentBalance.toFixed(2).replace('.', ',')}`, 20, finalY + 20);
  
  // Download do arquivo
  doc.save(`${filename}.pdf`);
};