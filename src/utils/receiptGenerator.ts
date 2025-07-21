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
    let currentY = startY + 15;
  
    // Função para adicionar texto centralizado
    const addCenteredText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      if (isBold) doc.setFont("helvetica", "bold");
      else doc.setFont("helvetica", "normal");
      
      const textWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor;
      const x = (pageWidth - textWidth) / 2;
      doc.text(text, x, currentY);
      currentY += fontSize * 0.4 + 3;
    };
    
    // Função para adicionar texto normal
    const addText = (label: string, value: string, fontSize: number = 8) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, currentY);
      
      doc.setFont("helvetica", "normal");
      const labelWidth = doc.getStringUnitWidth(label) * fontSize / doc.internal.scaleFactor;
      doc.text(value, margin + labelWidth + 3, currentY);
      currentY += fontSize + 2;
    };
  
    // Cabeçalho
    addCenteredText("RECIBO DE PAGAMENTO", 12, true);
    addCenteredText(`${viaNumber}ª VIA`, 8, true);
    addCenteredText(data.userCompany || "Sistema Financeiro", 9);
    currentY += 5;
    
    // Linha separadora
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;
  
    // Dados do recibo
    addText("Recibo Nº:", data.transactionId.substring(0, 8).toUpperCase());
    addText("Data:", new Date(data.paymentDate).toLocaleDateString('pt-BR'));
    
    // Cliente
    if (data.clientName) {
      addText("Cliente:", data.clientName);
    }
    
    currentY += 2;
    
    // Valor
    const valorLabel = data.isPartial ? "Valor Pago (Parcial):" : "Valor:";
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(data.amount);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    addText(valorLabel, valorFormatado, 9);
    
    // Valor por extenso
    const valorExtenso = numberToWords(data.amount);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("(", margin, currentY);
    const extensoLines = doc.splitTextToSize(valorExtenso, pageWidth - (margin * 2) - 10);
    doc.text(extensoLines, margin + 5, currentY);
    currentY += extensoLines.length * 8 + 2;
    doc.text(")", pageWidth - margin - 5, currentY - 2);
    
    if (data.isPartial && data.originalAmount) {
      const originalFormatado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(data.originalAmount);
      addText("Valor Original:", originalFormatado);
    }
    
    currentY += 2;
  
    // Descrição
    addText("Referente à:", data.description);
    
    // Dados adicionais
    if (data.caseName) addText("Caso:", data.caseName);
    if (data.accountName) addText("Conta:", data.accountName);
    
    // Forma de pagamento
    if (data.paymentMethod) {
      addText("Forma de Pagamento:", data.paymentMethod);
      
      if ((data.paymentMethod === 'Transferência' || data.paymentMethod === 'PIX') && data.accountData) {
        addText("Dados da Conta:", data.accountData);
      }
      
      if (data.paymentMethod === 'PIX' && data.pixKey) {
        addText("Chave PIX:", data.pixKey);
      }
      
      if ((data.paymentMethod === 'Transferência' || data.paymentMethod === 'PIX') && data.beneficiaryName) {
        addText("Beneficiário:", data.beneficiaryName);
      }
    }
    
    if (data.observations) {
      currentY += 2;
      addText("Obs:", data.observations);
    }
    
    currentY += 8;
  
    // Linha separadora
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;
    
    // Texto de confirmação
    const textoConfirmacao = data.type === 'receita' 
      ? (data.isPartial 
          ? "Declaro ter recebido o valor acima como pagamento PARCIAL referente ao serviço descrito."
          : "Declaro ter recebido o valor acima como pagamento referente ao serviço descrito.")
      : (data.isPartial 
          ? "Declaro ter recebido o valor acima como pagamento PARCIAL referente ao serviço prestado."
          : "Declaro ter recebido o valor acima como pagamento referente ao serviço prestado.");
      
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    
    // Quebrar texto em linhas se necessário
    const lines = doc.splitTextToSize(textoConfirmacao, pageWidth - (margin * 2));
    doc.text(lines, margin, currentY);
    currentY += lines.length * 7 + 8;
    
    // Assinatura
    const signatoryName = data.type === 'receita' 
      ? (data.userDisplayName || 'Assinatura') 
      : (data.clientName || 'Assinatura');
    
    currentY += 8;
    doc.line(margin + 20, currentY, pageWidth - margin - 20, currentY);
    currentY += 6;
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const sigWidth = doc.getStringUnitWidth(signatoryName) * 7 / doc.internal.scaleFactor;
    doc.text(signatoryName, (pageWidth - sigWidth) / 2, currentY);
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