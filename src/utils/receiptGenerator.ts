import jsPDF from 'jspdf';

interface ReceiptData {
  transactionId: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  clientName?: string;
  clientCpf?: string;
  caseName?: string;
  accountName?: string;
  paymentDate: string;
  isPartial: boolean;
  originalAmount?: number;
  observations?: string;
  userCompany?: string;
  userDisplayName?: string;
  paymentMethod?: string;
  accountData?: string;
  pixKey?: string;
  beneficiaryName?: string;
}

// Função para converter número em extenso
function numberToWords(num: number): string {
  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  if (num === 0) return 'zero reais';
  if (num === 100) return 'cem reais';

  let result = '';
  const reais = Math.floor(num);
  const centavos = Math.round((num - reais) * 100);

  // Processar reais
  if (reais >= 1000) {
    const milhares = Math.floor(reais / 1000);
    const resto = reais % 1000;
    
    if (milhares === 1) {
      result += 'mil';
    } else {
      result += numberToWords(milhares).replace(' reais', '') + ' mil';
    }
    
    if (resto > 0) {
      if (resto < 100) result += ' e ';
      else result += ' ';
      result += numberToWords(resto).replace(' reais', '');
    }
  } else {
    if (reais >= 100) {
      const h = Math.floor(reais / 100);
      const r = reais % 100;
      result += hundreds[h];
      if (r > 0) {
        result += ' e ';
        if (r < 10) result += units[r];
        else if (r < 20) result += teens[r - 10];
        else {
          const t = Math.floor(r / 10);
          const u = r % 10;
          result += tens[t];
          if (u > 0) result += ' e ' + units[u];
        }
      }
    } else if (reais >= 20) {
      const t = Math.floor(reais / 10);
      const u = reais % 10;
      result += tens[t];
      if (u > 0) result += ' e ' + units[u];
    } else if (reais >= 10) {
      result += teens[reais - 10];
    } else if (reais > 0) {
      result += units[reais];
    }
  }

  if (reais === 1) result += ' real';
  else if (reais > 1) result += ' reais';

  // Processar centavos
  if (centavos > 0) {
    if (reais > 0) result += ' e ';
    if (centavos < 10) result += units[centavos];
    else if (centavos < 20) result += teens[centavos - 10];
    else {
      const t = Math.floor(centavos / 10);
      const u = centavos % 10;
      result += tens[t];
      if (u > 0) result += ' e ' + units[u];
    }
    if (centavos === 1) result += ' centavo';
    else result += ' centavos';
  }

  return result || 'zero reais';
}

export function generateReceipt(data: ReceiptData): void {
  const doc = new jsPDF();
  
  // Configurações para duas vias
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  const viaHeight = (pageHeight - 40) / 2; // Espaço para duas vias
  
  // Função para gerar uma via
  const generateVia = (startY: number, viaNumber: number) => {
    let currentY = startY + 20;
  
    // Título centralizado - RECIBO DE PAGAMENTO
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RECIBO DE PAGAMENTO", pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 15;
    
    // Valor alinhado à direita em negrito
    const valorFormatado = `R$ ${data.amount.toFixed(2).replace('.', ',')}`;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(valorFormatado, pageWidth - margin, currentY, { align: 'right' });
    
    currentY += 12;
    
    // Texto do recibo seguindo o formato especificado
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // Primeira linha: "Recebi(emos) de NOME DO CLIENTE"
    let text = "Recebi(emos) de ";
    doc.text(text, margin, currentY);
    
    // Nome do cliente em caixa alta e negrito
    const textWidth = doc.getTextWidth(text);
    doc.setFont("helvetica", "bold");
    const clientNameUpper = data.clientName?.toUpperCase() || "CLIENTE";
    doc.text(clientNameUpper, margin + textWidth, currentY);
    
    // CPF se existir
    const clientNameWidth = doc.getTextWidth(clientNameUpper);
    doc.setFont("helvetica", "normal");
    if (data.clientCpf) {
      const cpfText = `, CPF ${data.clientCpf}`;
      doc.text(cpfText, margin + textWidth + clientNameWidth, currentY);
    }
    
    currentY += 8;
    
    // Segunda linha: "a importância de (valor por extenso)"
    text = "a importância de ";
    doc.text(text, margin, currentY);
    
    const importanciaWidth = doc.getTextWidth(text);
    doc.setFont("helvetica", "bold");
    const valorExtenso = numberToWords(data.amount);
    
    // Quebrar o valor por extenso em múltiplas linhas se necessário
    const maxWidth = pageWidth - margin - importanciaWidth - 20;
    const extensoLines = doc.splitTextToSize(valorExtenso, maxWidth);
    doc.text(extensoLines, margin + importanciaWidth, currentY);
    
    currentY += extensoLines.length * 6 + 2;
    
    // Terceira linha: "referente à DESCRIÇÃO"
    doc.setFont("helvetica", "normal");
    text = "referente à ";
    doc.text(text, margin, currentY);
    
    const referenteWidth = doc.getTextWidth(text);
    doc.setFont("helvetica", "bold");
    const descricaoLines = doc.splitTextToSize(data.description, pageWidth - margin - referenteWidth - 20);
    doc.text(descricaoLines, margin + referenteWidth, currentY);
    
    currentY += descricaoLines.length * 6 + 8;
    
    // Parágrafo sobre quitação
    doc.setFont("helvetica", "normal");
    const quitacaoTexto1 = "Para maior clareza, firmo(amos) o presente recibo que comprova o recebimento integral do valor mencionado, concedendo ";
    const quitacao1Lines = doc.splitTextToSize(quitacaoTexto1, pageWidth - 2 * margin);
    doc.text(quitacao1Lines, margin, currentY);
    
    currentY += quitacao1Lines.length * 6;
    
    doc.setFont("helvetica", "bold");
    doc.text("quitação plena, geral e irrevogável", margin, currentY);
    
    const quitacaoWidth = doc.getTextWidth("quitação plena, geral e irrevogável");
    doc.setFont("helvetica", "normal");
    doc.text(" pela quantia recebida.", margin + quitacaoWidth, currentY);
    
    currentY += 15;
    
    // Dados da forma de pagamento (se não for dinheiro) - em fonte menor
    if (data.paymentMethod && data.paymentMethod !== 'Dinheiro') {
      doc.setFontSize(8);
      doc.text(`Forma de Pagamento: ${data.paymentMethod}`, margin, currentY);
      currentY += 5;
      
      if (data.accountData && (data.paymentMethod === 'Transferência' || data.paymentMethod === 'PIX')) {
        doc.text(`Dados da Conta: ${data.accountData}`, margin, currentY);
        currentY += 5;
      }
      
      if (data.pixKey && data.paymentMethod === 'PIX') {
        doc.text(`Chave PIX: ${data.pixKey}`, margin, currentY);
        currentY += 5;
      }
      
      if (data.beneficiaryName && (data.paymentMethod === 'Transferência' || data.paymentMethod === 'PIX')) {
        doc.text(`Beneficiário: ${data.beneficiaryName}`, margin, currentY);
        currentY += 5;
      }
      
      currentY += 8;
      doc.setFontSize(10); // Voltar ao tamanho normal
    }
    
    // Cidade e data alinhados à direita
    const cidade = "São Paulo"; // Você pode adicionar a cidade como parâmetro se necessário
    const dataFormatada = new Date(data.paymentDate).toLocaleDateString('pt-BR');
    const cidadeData = `${cidade}, ${dataFormatada}`;
    
    doc.setFont("helvetica", "normal");
    doc.text(cidadeData, pageWidth - margin, currentY, { align: 'right' });
    
    currentY += 15;
    
    // Linha para assinatura
    doc.line(margin + 30, currentY, pageWidth - margin - 30, currentY);
    currentY += 6;
    
    // Nome do assinante
    const signataryName = data.type === 'receita' 
      ? (data.userDisplayName || 'Assinatura') 
      : (data.clientName || 'Assinatura');
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(signataryName, pageWidth / 2, currentY, { align: 'center' });
  };
  
  // Gerar primeira via
  generateVia(0, 1);
  
  // Linha de recorte
  const middleY = pageHeight / 2;
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(margin, middleY, pageWidth - margin, middleY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("✂️ CORTE AQUI", pageWidth / 2 - 15, middleY - 2);
  doc.setLineDashPattern([], 0);
  
  // Gerar segunda via
  generateVia(middleY, 2);
  
  // Rodapé
  const rodapeY = pageHeight - 10;
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  const rodape = `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
  const rodapeWidth = doc.getStringUnitWidth(rodape) * 6 / doc.internal.scaleFactor;
  doc.text(rodape, (pageWidth - rodapeWidth) / 2, rodapeY);
  
  // Salvar o PDF
  const fileName = `recibo_${data.transactionId.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}