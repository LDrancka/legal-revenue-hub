import jsPDF from 'jspdf';

interface ReceiptData {
  transactionId: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  clientName?: string;
  caseName?: string;
  accountName?: string;
  paymentDate: string;
  isPartial: boolean;
  originalAmount?: number;
  observations?: string;
  userCompany?: string;
}

export function generateReceipt(data: ReceiptData): void {
  const doc = new jsPDF();
  
  // Configurações
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let currentY = 30;
  
  // Função para adicionar texto centralizado
  const addCenteredText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    if (isBold) doc.setFont("helvetica", "bold");
    else doc.setFont("helvetica", "normal");
    
    const textWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor;
    const x = (pageWidth - textWidth) / 2;
    doc.text(text, x, currentY);
    currentY += fontSize * 0.5 + 5;
  };
  
  // Função para adicionar texto normal
  const addText = (label: string, value: string, fontSize: number = 10) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, currentY);
    
    doc.setFont("helvetica", "normal");
    const labelWidth = doc.getStringUnitWidth(label) * fontSize / doc.internal.scaleFactor;
    doc.text(value, margin + labelWidth + 5, currentY);
    currentY += fontSize + 5;
  };
  
  // Cabeçalho
  addCenteredText("RECIBO DE PAGAMENTO", 16, true);
  addCenteredText(data.userCompany || "Sistema Financeiro", 12);
  currentY += 10;
  
  // Linha separadora
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 15;
  
  // Dados do recibo
  addText("Recibo Nº:", data.transactionId.substring(0, 8).toUpperCase());
  addText("Data de Pagamento:", new Date(data.paymentDate).toLocaleDateString('pt-BR'));
  currentY += 5;
  
  // Valor
  const valorLabel = data.isPartial ? "Valor Pago (Parcial):" : "Valor:";
  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(data.amount);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  addText(valorLabel, valorFormatado, 12);
  
  if (data.isPartial && data.originalAmount) {
    const originalFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(data.originalAmount);
    addText("Valor Original:", originalFormatado);
  }
  
  currentY += 5;
  
  // Descrição
  addText("Descrição:", data.description);
  
  // Dados adicionais
  if (data.clientName) addText("Cliente:", data.clientName);
  if (data.caseName) addText("Caso:", data.caseName);
  if (data.accountName) addText("Conta:", data.accountName);
  
  // Tipo de transação
  const tipoTexto = data.type === 'receita' ? 'Receita' : 'Despesa';
  addText("Tipo:", tipoTexto);
  
  if (data.observations) {
    currentY += 5;
    addText("Observações:", data.observations);
  }
  
  currentY += 20;
  
  // Linha separadora
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 15;
  
  // Texto de confirmação
  const textoConfirmacao = data.isPartial 
    ? "Declaro ter recebido o valor acima como pagamento PARCIAL referente ao serviço descrito."
    : "Declaro ter recebido o valor acima como pagamento referente ao serviço descrito.";
    
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // Quebrar texto em linhas se necessário
  const lines = doc.splitTextToSize(textoConfirmacao, pageWidth - (margin * 2));
  doc.text(lines, margin, currentY);
  currentY += lines.length * 12 + 20;
  
  // Assinatura
  currentY += 20;
  doc.line(margin + 20, currentY, pageWidth - margin - 20, currentY);
  currentY += 10;
  addCenteredText("Assinatura", 10);
  
  // Rodapé
  currentY = doc.internal.pageSize.height - 30;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  const rodape = `Recibo gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
  const rodapeWidth = doc.getStringUnitWidth(rodape) * 8 / doc.internal.scaleFactor;
  doc.text(rodape, (pageWidth - rodapeWidth) / 2, currentY);
  
  // Salvar o PDF
  const fileName = `recibo_${data.transactionId.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}