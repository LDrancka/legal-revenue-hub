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
    
    // Montar o texto completo do recibo
    const clientNameUpper = data.clientName?.toUpperCase() || "CLIENTE";
    const valorExtenso = numberToWords(data.amount);
    
    // Texto base
    let textoCompleto = `Recebi(emos) de ${clientNameUpper}`;
    
    // CPF se existir
    if (data.clientCpf) {
      textoCompleto += `, CPF ${data.clientCpf}`;
    }
    
    textoCompleto += `, a importância de ${valorExtenso}, referente à ${data.description}.`;
    
    // Quebrar o texto para caber na largura disponível
    const textAvailableWidth = pageWidth - 2 * margin;
    const lines = doc.splitTextToSize(textoCompleto, textAvailableWidth);
    
    // Renderizar cada linha
    lines.forEach((line: string, index: number) => {
      // Verificar se a linha contém partes que devem ser em negrito
      if (line.includes(clientNameUpper) || line.includes(valorExtenso) || line.includes(data.description)) {
        // Processar linha com formatação mista
        let remainingText = line;
        let currentX = margin;
        
        // Verificar se contém nome do cliente
        if (remainingText.includes(clientNameUpper)) {
          const parts = remainingText.split(clientNameUpper);
          doc.setFont("helvetica", "normal");
          doc.text(parts[0], currentX, currentY);
          currentX += doc.getTextWidth(parts[0]);
          
          doc.setFont("helvetica", "bold");
          doc.text(clientNameUpper, currentX, currentY);
          currentX += doc.getTextWidth(clientNameUpper);
          
          remainingText = parts[1] || '';
        }
        
        // Verificar se contém valor por extenso
        if (remainingText.includes(valorExtenso)) {
          const parts = remainingText.split(valorExtenso);
          doc.setFont("helvetica", "normal");
          doc.text(parts[0], currentX, currentY);
          currentX += doc.getTextWidth(parts[0]);
          
          doc.setFont("helvetica", "bold");
          doc.text(valorExtenso, currentX, currentY);
          currentX += doc.getTextWidth(valorExtenso);
          
          remainingText = parts[1] || '';
        }
        
        // Verificar se contém descrição
        if (remainingText.includes(data.description)) {
          const parts = remainingText.split(data.description);
          doc.setFont("helvetica", "normal");
          doc.text(parts[0], currentX, currentY);
          currentX += doc.getTextWidth(parts[0]);
          
          doc.setFont("helvetica", "bold");
          doc.text(data.description, currentX, currentY);
          currentX += doc.getTextWidth(data.description);
          
          remainingText = parts[1] || '';
        }
        
        // Resto do texto
        if (remainingText) {
          doc.setFont("helvetica", "normal");
          doc.text(remainingText, currentX, currentY);
        }
      } else {
        // Linha normal sem formatação especial
        doc.setFont("helvetica", "normal");
        doc.text(line, margin, currentY);
      }
      
      currentY += 7; // Espaçamento entre linhas
    });
    
    currentY += 8; // Espaço extra após o texto principal
    // Verificar se há espaço suficiente para o parágrafo de quitação
    const maxYLimit = maxYForVia(startY);
    if (currentY + 60 > maxYLimit) {
      // Se não há espaço suficiente, usar menos espaço
      currentY = maxYLimit - 60;
    }
    
    // Parágrafo sobre quitação - usando quebra de linha inteligente
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    
    let quitacaoTextoCompleto = "Para maior clareza, firmo(amos) o presente recibo que comprova o recebimento integral do valor mencionado, concedendo quitação plena, geral e irrevogável pela quantia recebida";
    
    // Adicionar informações de pagamento se existirem
    if (data.paymentMethod && data.paymentMethod !== 'Dinheiro') {
      quitacaoTextoCompleto += `, via ${data.paymentMethod}`;
      
      if (data.accountData && (data.paymentMethod === 'Transferência' || data.paymentMethod === 'PIX')) {
        quitacaoTextoCompleto += ` (${data.accountData}`;
        
        if (data.pixKey && data.paymentMethod === 'PIX') {
          quitacaoTextoCompleto += ` - Chave PIX: ${data.pixKey}`;
        }
        
        if (data.beneficiaryName && (data.paymentMethod === 'Transferência' || data.paymentMethod === 'PIX')) {
          quitacaoTextoCompleto += ` - ${data.beneficiaryName}`;
        }
        
        quitacaoTextoCompleto += ')';
      }
    }
    
    quitacaoTextoCompleto += '.';
    
    // Quebrar o texto para caber na largura disponível
    const quitacaoAvailableWidth = pageWidth - 2 * margin;
    const quitacaoLines = doc.splitTextToSize(quitacaoTextoCompleto, quitacaoAvailableWidth);
    
    // Verificar se as linhas cabem no espaço disponível
    const lineHeight = 5;
    const totalTextHeight = quitacaoLines.length * lineHeight;
    
    if (currentY + totalTextHeight > maxYLimit - 35) {
      // Ajustar fonte para caber
      doc.setFontSize(8);
      const newLines = doc.splitTextToSize(quitacaoTextoCompleto, quitacaoAvailableWidth);
      newLines.forEach((line: string, index: number) => {
        doc.text(line, margin, currentY + (index * 4));
      });
      currentY += newLines.length * 4;
    } else {
      quitacaoLines.forEach((line: string, index: number) => {
        doc.text(line, margin, currentY + (index * lineHeight));
      });
      currentY += totalTextHeight;
    }
    
    doc.setFontSize(10); // Voltar ao tamanho normal
    currentY += 12;
    
    // Verificar espaço para cidade/data
    if (currentY + 25 > maxYForVia(startY)) {
      currentY = maxYForVia(startY) - 25;
    }
    
    // Cidade e data alinhados à direita
    const cidade = data.officeCity || "São Paulo";
    const dataFormatada = new Date(data.paymentDate).toLocaleDateString('pt-BR');
    const cidadeData = `${cidade}, ${dataFormatada}`;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(cidadeData, pageWidth - margin, currentY, { align: 'right' });
    
    currentY += 12;
    
    // Verificar espaço para assinatura
    if (currentY + 45 > maxYForVia(startY)) {
      currentY = maxYForVia(startY) - 45;
    }
    
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