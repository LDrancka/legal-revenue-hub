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
import { FileDown, FileSpreadsheet, BarChart3, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

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

  const loadReportData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Query base
      let query = supabase
        .from('transactions')
        .select(`
          *,
          accounts!account_id(name),
          cases!case_id(name),
          categories!category_id(name, color)
        `)
        .gte('due_date', filters.startDate)
        .lte('due_date', filters.endDate);

      if (filters.type !== 'all') {
        query = query.eq('type', filters.type as 'receita' | 'despesa');
      }

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status as 'pendente' | 'pago');
      }

      const { data, error } = await query.order('due_date', { ascending: false });

      if (error) throw error;

      // Preparar dados para export
      const exportTransactions: ExportTransaction[] = (data || []).map(t => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        type: t.type,
        status: t.status,
        due_date: t.due_date,
        payment_date: t.payment_date,
        account_name: t.accounts?.name,
        case_name: t.cases?.name,
        category_name: t.categories?.name,
        observations: t.observations,
        payment_observations: t.payment_observations
      }));

      setTransactions(exportTransactions);

      // Processar dados para gráficos
      const monthlyData: { [key: string]: { receitas: number; despesas: number } } = {};
      const categoryTotals: { [key: string]: { value: number; color: string } } = {};

      data?.forEach(transaction => {
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
        if (transaction.categories?.name) {
          const categoryName = transaction.categories.name;
          if (!categoryTotals[categoryName]) {
            categoryTotals[categoryName] = { value: 0, color: transaction.categories.color || '#6366f1' };
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                  <SelectItem value="pago">Pago</SelectItem>
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