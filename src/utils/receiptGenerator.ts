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
  officeOwnerName?: string;
  officeOwnerDocument?: string;
  officeDocumentType?: 'cpf' | 'cnpj';
  officeCity?: string;
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
  const maxYForVia = (startY: number) => startY + viaHeight - 30; // Limite Y para cada via
  
  // Função para gerar uma via
  const generateVia = (startY: number, viaNumber: number) => {
    let currentY = startY + 15;
    const maxYLimit = startY + viaHeight - 30;
  
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
    
    currentY += 15;
    
    // PRIMEIRO: Texto "Recebi(emos)"
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const clientNameUpper = data.clientName?.toUpperCase() || "CLIENTE";
    const valorExtenso = numberToWords(data.amount);
    
    let textoRecebi = `Recebi(emos) de ${clientNameUpper}`;
    if (data.clientCpf) {
      textoRecebi += `, CPF ${data.clientCpf}`;
    }
    textoRecebi += `, a importância de ${valorExtenso}, referente à ${data.description}.`;
    
    // Quebrar o texto para caber na largura disponível
    const recebiWidth = pageWidth - 2 * margin;
    const recebiLines = doc.splitTextToSize(textoRecebi, recebiWidth);
    
    // Renderizar texto "Recebi(emos)" com formatação em negrito
    recebiLines.forEach((line: string) => {
      doc.setFont("helvetica", "normal");
      let currentX = margin;
      let remainingText = line;
      
      // Nome do cliente em negrito
      if (remainingText.includes(clientNameUpper)) {
        const parts = remainingText.split(clientNameUpper);
        doc.text(parts[0], currentX, currentY);
        currentX += doc.getTextWidth(parts[0]);
        
        doc.setFont("helvetica", "bold");
        doc.text(clientNameUpper, currentX, currentY);
        currentX += doc.getTextWidth(clientNameUpper);
        
        doc.setFont("helvetica", "normal");
        remainingText = parts[1] || '';
      }
      
      // Valor por extenso em negrito
      if (remainingText.includes(valorExtenso)) {
        const parts = remainingText.split(valorExtenso);
        doc.text(parts[0], currentX, currentY);
        currentX += doc.getTextWidth(parts[0]);
        
        doc.setFont("helvetica", "bold");
        doc.text(valorExtenso, currentX, currentY);
        currentX += doc.getTextWidth(valorExtenso);
        
        doc.setFont("helvetica", "normal");
        remainingText = parts[1] || '';
      }
      
      // Descrição em negrito
      if (remainingText.includes(data.description)) {
        const parts = remainingText.split(data.description);
        doc.text(parts[0], currentX, currentY);
        currentX += doc.getTextWidth(parts[0]);
        
        doc.setFont("helvetica", "bold");
        doc.text(data.description, currentX, currentY);
        currentX += doc.getTextWidth(data.description);
        
        doc.setFont("helvetica", "normal");
        remainingText = parts[1] || '';
      }
      
      // Resto do texto
      if (remainingText) {
        doc.text(remainingText, currentX, currentY);
      }
      
      currentY += 6;
    });
    
    currentY += 10; // Espaço entre os dois parágrafos
    
    // SEGUNDO: Texto de quitação
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    let quitacaoTexto = "Para maior clareza, firmo(amos) o presente recibo que comprova o recebimento integral do valor mencionado, concedendo quitação plena, geral e irrevogável pela quantia recebida";
    
    // Adicionar informações de pagamento se existirem
    if (data.paymentMethod && data.paymentMethod !== 'Dinheiro') {
      quitacaoTexto += `, via ${data.paymentMethod}`;
      
      if (data.accountData && (data.paymentMethod === 'Transferência' || data.paymentMethod === 'PIX')) {
        quitacaoTexto += ` (${data.accountData}`;
        
        if (data.pixKey && data.paymentMethod === 'PIX') {
          quitacaoTexto += ` - Chave PIX: ${data.pixKey}`;
        }
        
        if (data.beneficiaryName && (data.paymentMethod === 'Transferência' || data.paymentMethod === 'PIX')) {
          quitacaoTexto += ` - ${data.beneficiaryName}`;
        }
        
        quitacaoTexto += ')';
      }
    }
    
    quitacaoTexto += '.';
    
    // Quebrar o texto de quitação
    const quitacaoWidth = pageWidth - 2 * margin;
    const quitacaoLines = doc.splitTextToSize(quitacaoTexto, quitacaoWidth);
    
    // Verificar se há espaço suficiente
    const spaceNeeded = quitacaoLines.length * 5 + 50; // linhas + espaço para assinatura
    if (currentY + spaceNeeded > maxYLimit) {
      doc.setFontSize(8);
      const compactLines = doc.splitTextToSize(quitacaoTexto, quitacaoWidth);
      compactLines.forEach((line: string) => {
        doc.text(line, margin, currentY);
        currentY += 4;
      });
    } else {
      quitacaoLines.forEach((line: string) => {
        doc.text(line, margin, currentY);
        currentY += 5;
      });
    }
    
    doc.setFontSize(10);
    currentY += 20; // Espaço após texto de quitação
    
    // Verificar se há espaço suficiente para cidade/data + assinatura (total ~35px)
    if (currentY + 35 > maxYLimit) {
      currentY = maxYLimit - 35;
    }
    
    // Cidade e data alinhados à direita
    const cidade = data.officeCity || "São Paulo";
    const dataFormatada = new Date(data.paymentDate).toLocaleDateString('pt-BR');
    const cidadeData = `${cidade}, ${dataFormatada}`;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(cidadeData, pageWidth - margin, currentY, { align: 'right' });
    
    currentY += 20; // Espaço aumentado entre cidade/data e linha de assinatura
    
    // Linha para assinatura
    const lineY = currentY;
    doc.setLineWidth(0.5);
    doc.line(margin + 30, lineY, pageWidth - margin - 30, lineY);
    currentY += 8;
    
    // Nome do assinante e dados do escritório
    if (data.officeOwnerName) {
      // Se há dados do escritório, mostrar as informações do escritório
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      
      // Linha 1: Nome/Razão Social
      doc.text(data.officeOwnerName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
      currentY += 6;
      
      // Linha 2: CPF/CNPJ
      if (data.officeOwnerDocument) {
        const documentLabel = data.officeDocumentType === 'cpf' ? 'CPF' : 'CNPJ';
        doc.text(`${documentLabel}: ${data.officeOwnerDocument}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 8;
      }
      
      // Linha 3: "Por:" e nome do usuário
      doc.setFont("helvetica", "normal");
      const porTexto = "Por: ";
      const userSignature = data.userDisplayName || 'Usuário';
      
      const porWidth = doc.getTextWidth(porTexto);
      const totalWidth = porWidth + doc.getTextWidth(userSignature);
      const startX = (pageWidth - totalWidth) / 2;
      
      doc.text(porTexto, startX, currentY);
      doc.setFont("helvetica", "bold");
      doc.text(userSignature, startX + porWidth, currentY);
    } else {
      // Formato original quando não há dados do escritório
      const signataryName = data.type === 'receita' 
        ? (data.userDisplayName || 'Assinatura') 
        : (data.clientName || 'Assinatura');
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(signataryName, pageWidth / 2, currentY, { align: 'center' });
    }
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