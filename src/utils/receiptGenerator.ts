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
    
    // Montar o texto completo do recibo
    const clientNameUpper = data.clientName?.toUpperCase() || "CLIENTE";
    const valorExtenso = numberToWords(data.amount);
    
    // Texto base
    let textoCompleto = `Recebi(emos) de `;
    doc.text(textoCompleto, margin, currentY);
    
    // Nome do cliente em negrito
    let textWidth = doc.getTextWidth(textoCompleto);
    doc.setFont("helvetica", "bold");
    doc.text(clientNameUpper, margin + textWidth, currentY);
    
    // CPF se existir e vírgula
    textWidth += doc.getTextWidth(clientNameUpper);
    doc.setFont("helvetica", "normal");
    let cpfText = "";
    if (data.clientCpf) {
      cpfText = `, CPF ${data.clientCpf}`;
      doc.text(cpfText, margin + textWidth, currentY);
      textWidth += doc.getTextWidth(cpfText);
    }
    
    // Continuação do texto
    const continuacao = `, a importância de `;
    doc.text(continuacao, margin + textWidth, currentY);
    textWidth += doc.getTextWidth(continuacao);
    
    // Verificar se o valor por extenso cabe na mesma linha
    const maxWidth = pageWidth - margin - 10;
    if (textWidth + doc.getTextWidth(valorExtenso) <= maxWidth) {
      // Valor por extenso em negrito na mesma linha
      doc.setFont("helvetica", "bold");
      doc.text(valorExtenso, margin + textWidth, currentY);
      textWidth += doc.getTextWidth(valorExtenso);
      
      // Finalização
      doc.setFont("helvetica", "normal");
      const finalizacao = `, referente à `;
      if (textWidth + doc.getTextWidth(finalizacao) <= maxWidth) {
        doc.text(finalizacao, margin + textWidth, currentY);
        textWidth += doc.getTextWidth(finalizacao);
        
        // Descrição em negrito
        if (textWidth + doc.getTextWidth(data.description) <= maxWidth) {
          doc.setFont("helvetica", "bold");
          doc.text(data.description, margin + textWidth, currentY);
          textWidth += doc.getTextWidth(data.description);
          
          doc.setFont("helvetica", "normal");
          doc.text(".", margin + textWidth, currentY);
        } else {
          // Descrição na próxima linha
          currentY += 7;
          doc.setFont("helvetica", "bold");
          doc.text(data.description, margin, currentY);
          
          const descWidth = doc.getTextWidth(data.description);
          doc.setFont("helvetica", "normal");
          doc.text(".", margin + descWidth, currentY);
        }
      } else {
        // Referente à na próxima linha
        currentY += 7;
        doc.text(finalizacao, margin, currentY);
        const refWidth = doc.getTextWidth(finalizacao);
        
        doc.setFont("helvetica", "bold");
        doc.text(data.description, margin + refWidth, currentY);
        
        const descWidth = doc.getTextWidth(data.description);
        doc.setFont("helvetica", "normal");
        doc.text(".", margin + refWidth + descWidth, currentY);
      }
    } else {
      // Valor por extenso na próxima linha
      currentY += 7;
      doc.setFont("helvetica", "bold");
      doc.text(valorExtenso, margin, currentY);
      
      const valorWidth = doc.getTextWidth(valorExtenso);
      doc.setFont("helvetica", "normal");
      const finalizacao = `, referente à `;
      
      if (valorWidth + doc.getTextWidth(finalizacao) <= maxWidth) {
        doc.text(finalizacao, margin + valorWidth, currentY);
        const refWidth = doc.getTextWidth(finalizacao);
        
        if (valorWidth + refWidth + doc.getTextWidth(data.description) <= maxWidth) {
          doc.setFont("helvetica", "bold");
          doc.text(data.description, margin + valorWidth + refWidth, currentY);
          
          const descWidth = doc.getTextWidth(data.description);
          doc.setFont("helvetica", "normal");
          doc.text(".", margin + valorWidth + refWidth + descWidth, currentY);
        } else {
          // Descrição na próxima linha
          currentY += 7;
          doc.setFont("helvetica", "bold");
          doc.text(data.description, margin, currentY);
          
          const descWidth = doc.getTextWidth(data.description);
          doc.setFont("helvetica", "normal");
          doc.text(".", margin + descWidth, currentY);
        }
      } else {
        // Referente à na próxima linha
        currentY += 7;
        doc.text(finalizacao, margin, currentY);
        const refWidth = doc.getTextWidth(finalizacao);
        
        doc.setFont("helvetica", "bold");
        doc.text(data.description, margin + refWidth, currentY);
        
        const descWidth = doc.getTextWidth(data.description);
        doc.setFont("helvetica", "normal");
        doc.text(".", margin + refWidth + descWidth, currentY);
      }
    }
    
    currentY += 15;
    
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