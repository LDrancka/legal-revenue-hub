import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportToExcel, exportToCSV, ExportTransaction } from "@/utils/exportUtils";
import { FileDown, FileSpreadsheet, BarChart3, TrendingUp, TrendingDown, Calendar, FileText, AlertTriangle, Banknote } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  period: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<ExportTransaction[]>([]);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: 'all',
    status: 'all',
    reportType: 'monthly'
  });
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState('general');
  const [reportFilters, setReportFilters] = useState({
    accountId: 'all',
    reportSubtype: 'all' // 'defaulters', 'account-movement', etc.
  });

  const loadReportData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Carregar contas
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .order('name');
      
      setAccounts(accountsData || []);

      // Query base para transações
      let query = supabase
        .from('transactions')
        .select(`
          *,
          accounts!account_id(name),
          payment_accounts:accounts!payment_account_id(name),
          cases!case_id(name),
          categories!category_id(name, color),
          clients!client_id(name),
          transaction_splits(
            id,
            account_id,
            amount,
            percentage,
            accounts!account_id(name)
          )
        `)
        .gte('due_date', filters.startDate)
        .lte('due_date', filters.endDate);

      if (filters.type !== 'all') {
        query = query.eq('type', filters.type as 'receita' | 'despesa');
      }

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status as 'pendente' | 'quitado');
      }

      const { data, error } = await query.order('due_date', { ascending: false });

      if (error) throw error;

      console.log('Dados carregados do banco:', data);

      // Processar transações considerando rateios
      const processedTransactions: ExportTransaction[] = [];
      
      (data || []).forEach(t => {
        if (t.transaction_splits && t.transaction_splits.length > 0) {
          // Transação com rateio - criar uma entrada para cada split
          t.transaction_splits.forEach((split: any) => {
            processedTransactions.push({
              id: `${t.id}-split-${split.id}`,
              description: `${t.description} (Rateio)`,
              amount: split.amount,
              type: t.type,
              status: t.status,
              due_date: t.due_date,
              payment_date: t.payment_date,
              account_name: split.accounts?.name,
              account_id: split.account_id,
              payment_account_id: t.payment_account_id,
              case_name: t.cases?.name,
              category_name: t.categories?.name,
              client_name: t.clients?.name,
              observations: t.observations,
              payment_observations: t.payment_observations,
              is_split: true,
              original_transaction_id: t.id
            });
          });
        } else {
          // Transação normal - sem rateio
          processedTransactions.push({
            id: t.id,
            description: t.description,
            amount: t.amount,
            type: t.type,
            status: t.status,
            due_date: t.due_date,
            payment_date: t.payment_date,
            account_name: t.accounts?.name,
            account_id: t.account_id,
            payment_account_id: t.payment_account_id,
            case_name: t.cases?.name,
            category_name: t.categories?.name,
            client_name: t.clients?.name,
            observations: t.observations,
            payment_observations: t.payment_observations,
            is_split: false
          });
        }
      });

      setTransactions(processedTransactions);

      const monthlyData: { [key: string]: { receitas: number; despesas: number } } = {};
      const categoryTotals: { [key: string]: { value: number; color: string } } = {};

      processedTransactions.forEach(transaction => {
        const date = new Date(transaction.due_date);
        const monthKey = filters.reportType === 'monthly' 
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          : date.toISOString().split('T')[0];

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { receitas: 0, despesas: 0 };
        }

        if (transaction.type === 'receita') {
          monthlyData[monthKey].receitas += transaction.amount;
        } else {
          monthlyData[monthKey].despesas += transaction.amount;
        }

        // Dados por categoria
        if (transaction.category_name) {
          const categoryName = transaction.category_name;
          if (!categoryTotals[categoryName]) {
            categoryTotals[categoryName] = { value: 0, color: '#6366f1' };
          }
          categoryTotals[categoryName].value += transaction.amount;
        }
      });

      // Converter para arrays
      const reportArray: ReportData[] = Object.entries(monthlyData).map(([period, data]) => ({
        period,
        receitas: data.receitas,
        despesas: data.despesas,
        saldo: data.receitas - data.despesas
      })).sort((a, b) => a.period.localeCompare(b.period));

      const categoryArray: CategoryData[] = Object.entries(categoryTotals).map(([name, data]) => ({
        name,
        value: data.value,
        color: data.color
      })).sort((a, b) => b.value - a.value).slice(0, 10); // Top 10

      setReportData(reportArray);
      setCategoryData(categoryArray);

    } catch (error: any) {
      console.error('Erro ao carregar relatórios:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do relatório",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [user, filters]);

  const handleExportExcel = () => {
    const filename = `relatorio_${filters.startDate}_${filters.endDate}`;
    exportToExcel(transactions, filename);
    toast({
      title: "Sucesso",
      description: "Relatório exportado para Excel!",
    });
  };

  const handleExportCSV = () => {
    const filename = `relatorio_${filters.startDate}_${filters.endDate}`;
    exportToCSV(transactions, filename);
    toast({
      title: "Sucesso", 
      description: "Relatório exportado para CSV!",
    });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text('Relatório Financeiro', 20, 20);
    
    // Informações do período
    doc.setFontSize(10);
    doc.text(`Período: ${filters.startDate} até ${filters.endDate}`, 20, 30);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 35);
    
    // Resumo
    doc.setFontSize(12);
    doc.text('Resumo:', 20, 50);
    doc.setFontSize(10);
    doc.text(`Total Receitas: R$ ${totals.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 60);
    doc.text(`Total Despesas: R$ ${totals.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 65);
    doc.text(`Saldo: R$ ${saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 70);
    
    // Tabela de transações
    const tableData = transactions.map(t => [
      t.description,
      t.type === 'receita' ? 'Receita' : 'Despesa',
      `R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      t.status === 'quitado' ? 'Quitado' : 'Pendente',
      new Date(t.due_date).toLocaleDateString('pt-BR'),
      t.account_name || '-'
    ]);
    
    autoTable(doc, {
      head: [['Descrição', 'Tipo', 'Valor', 'Status', 'Vencimento', 'Conta']],
      body: tableData,
      startY: 80,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] }
    });
    
    doc.save(`relatorio_${filters.startDate}_${filters.endDate}.pdf`);
    toast({
      title: "Sucesso",
      description: "Relatório exportado para PDF!",
    });
  };

  const getDefaultersReport = () => {
    const today = new Date();
    return transactions.filter(t => 
      t.status === 'pendente' && 
      new Date(t.due_date) < today
    );
  };

  const getAccountMovementReport = (accountId: string) => {
    if (accountId === 'all') return transactions;
    
    const filteredTransactions = transactions.filter(t => 
      t.account_id === accountId || t.payment_account_id === accountId
    );
    console.log(`Transações para conta ${accountId}:`, filteredTransactions);
    console.log(`Total de transações carregadas:`, transactions.length);
    return filteredTransactions;
  };

  const handleGenerateDefaultersReport = () => {
    const defaulters = getDefaultersReport();
    
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Inadimplentes', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Período: ${filters.startDate} até ${filters.endDate}`, 20, 30);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 35);
    doc.text(`Total de inadimplentes: ${defaulters.length}`, 20, 40);
    
    const totalInadimplencia = defaulters.reduce((sum, t) => sum + t.amount, 0);
    doc.text(`Valor total em atraso: R$ ${totalInadimplencia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 45);
    
    const tableData = defaulters.map(t => [
      t.description,
      t.client_name || '-',
      `R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      new Date(t.due_date).toLocaleDateString('pt-BR'),
      Math.floor((Date.now() - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24)) + ' dias'
    ]);
    
    autoTable(doc, {
      head: [['Descrição', 'Cliente', 'Valor', 'Vencimento', 'Dias em Atraso']],
      body: tableData,
      startY: 55,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [239, 68, 68] }
    });
    
    doc.save(`inadimplentes_${filters.startDate}_${filters.endDate}.pdf`);
    toast({
      title: "Sucesso",
      description: "Relatório de inadimplentes gerado!",
    });
  };

  const handleGenerateAccountReport = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    
    const accountTransactions = getAccountMovementReport(accountId);
    
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Relatório de Movimentação - ${account.name}`, 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Período: ${filters.startDate} até ${filters.endDate}`, 20, 30);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 35);
    doc.text(`Total de movimentações: ${accountTransactions.length}`, 20, 40);
    
    const receitas = accountTransactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + t.amount, 0);
    const despesas = accountTransactions.filter(t => t.type === 'despesa').reduce((sum, t) => sum + t.amount, 0);
    
    doc.text(`Receitas: R$ ${receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 45);
    doc.text(`Despesas: R$ ${despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 50);
    doc.text(`Saldo: R$ ${(receitas - despesas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, 55);
    
    const tableData = accountTransactions.map(t => [
      t.description,
      t.type === 'receita' ? 'Receita' : 'Despesa',
      `R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      t.status === 'quitado' ? 'Quitado' : 'Pendente',
      new Date(t.due_date).toLocaleDateString('pt-BR')
    ]);
    
    autoTable(doc, {
      head: [['Descrição', 'Tipo', 'Valor', 'Status', 'Vencimento']],
      body: tableData,
      startY: 65,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] }
    });
    
    doc.save(`movimentacao_${account.name}_${filters.startDate}_${filters.endDate}.pdf`);
    toast({
      title: "Sucesso",
      description: `Relatório de movimentação da conta ${account.name} gerado!`,
    });
  };

  const handleGenerateCustomReport = () => {
    if (reportFilters.reportSubtype === 'defaulters') {
      handleGenerateDefaultersReport();
    } else if (reportFilters.reportSubtype === 'account-movement' && reportFilters.accountId !== 'all') {
      handleGenerateAccountReport(reportFilters.accountId);
    } else if (reportFilters.reportSubtype === 'account-movement' && reportFilters.accountId === 'all') {
      // Relatório geral de todas as contas
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Relatório de Movimentação - Todas as Contas', 20, 20);
      
      doc.setFontSize(10);
      doc.text(`Período: ${filters.startDate} até ${filters.endDate}`, 20, 30);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 35);
      
      const tableData = transactions.map(t => [
        t.description,
        t.account_name || 'N/A',
        t.type === 'receita' ? 'Receita' : 'Despesa',
        `R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        t.status === 'quitado' ? 'Quitado' : 'Pendente',
        new Date(t.due_date).toLocaleDateString('pt-BR')
      ]);
      
      autoTable(doc, {
        head: [['Descrição', 'Conta', 'Tipo', 'Valor', 'Status', 'Vencimento']],
        body: tableData,
        startY: 45,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [99, 102, 241] }
      });
      
      doc.save(`movimentacao_todas_contas_${filters.startDate}_${filters.endDate}.pdf`);
      toast({
        title: "Sucesso",
        description: "Relatório de movimentação de todas as contas gerado!",
      });
    }
  };

  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'receita') {
      acc.receitas += t.amount;
    } else {
      acc.despesas += t.amount;
    }
    return acc;
  }, { receitas: 0, despesas: 0 });

  const saldoTotal = totals.receitas - totals.despesas;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} disabled={loading || transactions.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={handleExportCSV} disabled={loading || transactions.length === 0}>
            <FileDown className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button onClick={handleExportPDF} disabled={loading || transactions.length === 0}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="startDate">Data Início</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="receita">Receitas</SelectItem>
                  <SelectItem value="despesa">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="quitado">Quitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Agrupamento</Label>
              <Select value={filters.reportType} onValueChange={(value) => setFilters({ ...filters, reportType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="daily">Diário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Relatório</Label>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral</SelectItem>
                  <SelectItem value="defaulters">Inadimplentes</SelectItem>
                  <SelectItem value="account">Por Conta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relatórios Personalizados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatórios Personalizados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Tipo de Relatório</Label>
              <Select value={reportFilters.reportSubtype} onValueChange={(value) => setReportFilters({ ...reportFilters, reportSubtype: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Selecione um tipo</SelectItem>
                  <SelectItem value="defaulters">Inadimplentes</SelectItem>
                  <SelectItem value="account-movement">Movimentação por Conta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {reportFilters.reportSubtype === 'account-movement' && (
              <div>
                <Label>Conta</Label>
                <Select value={reportFilters.accountId} onValueChange={(value) => setReportFilters({ ...reportFilters, accountId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Contas</SelectItem>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex items-end">
              <Button 
                onClick={handleGenerateCustomReport}
                disabled={loading || reportFilters.reportSubtype === 'all'}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Gerar Relatório
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {reportFilters.reportSubtype === 'defaulters' && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Total de inadimplentes: {getDefaultersReport().length}
              </div>
            )}
            {reportFilters.reportSubtype === 'account-movement' && reportFilters.accountId !== 'all' && reportFilters.accountId !== '' && (
              <div className="flex items-center gap-2 text-blue-600">
                <Banknote className="h-4 w-4" />
                Movimentações da conta: {getAccountMovementReport(reportFilters.accountId).length}
              </div>
            )}
            {reportFilters.reportSubtype === 'account-movement' && reportFilters.accountId === 'all' && (
              <div className="flex items-center gap-2 text-green-600">
                <Banknote className="h-4 w-4" />
                Total de movimentações: {transactions.length}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Receitas</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {totals.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Despesas</p>
                <p className="text-2xl font-bold text-red-600">
                  R$ {totals.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saldo</p>
                <p className={`text-2xl font-bold ${saldoTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <BarChart3 className={`h-8 w-8 ${saldoTotal >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Lançamentos</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
              <FileDown className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fluxo de Caixa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                />
                <Bar dataKey="receitas" fill="#10b981" name="Receitas" />
                <Bar dataKey="despesas" fill="#ef4444" name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saldo por Período</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Saldo']}
                />
                <Line type="monotone" dataKey="saldo" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {categoryData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Gastos por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}