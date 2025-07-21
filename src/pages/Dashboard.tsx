import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  AlertTriangle,
  Eye,
  Plus,
  BarChart3
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface DashboardData {
  today: {
    toReceive: number;
    toPay: number;
  };
  thisMonth: {
    received: number;
    paid: number;
    provisioned: number;
  };
  overdue: {
    amount: number;
    count: number;
  };
  chartData: {
    monthlyFlow: Array<{
      month: string;
      receitas: number;
      despesas: number;
    }>;
    statusDistribution: Array<{
      name: string;
      value: number;
      color: string;
    }>;
    accountsBalance: Array<{
      name: string;
      balance: number;
    }>;
  };
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    today: { toReceive: 0, toPay: 0 },
    thisMonth: { received: 0, paid: 0, provisioned: 0 },
    overdue: { amount: 0, count: 0 },
    chartData: {
      monthlyFlow: [],
      statusDistribution: [],
      accountsBalance: []
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Data de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      
      // Início e fim do mês atual
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      // Buscar transações e contas
      const [transactionsResult, accountsResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id)
      ]);

      if (transactionsResult.error) {
        console.error('Erro ao buscar transações:', transactionsResult.error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar dados do dashboard"
        });
        return;
      }

      if (accountsResult.error) {
        console.error('Erro ao buscar contas:', accountsResult.error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar contas do dashboard"
        });
      }

      const transactions = transactionsResult.data || [];
      const accounts = accountsResult.data || [];
      
      console.log('Contas encontradas no dashboard:', accounts);

      // Calcular dados do dashboard
      const data: DashboardData = {
        today: { toReceive: 0, toPay: 0 },
        thisMonth: { received: 0, paid: 0, provisioned: 0 },
        overdue: { amount: 0, count: 0 },
        chartData: {
          monthlyFlow: [],
          statusDistribution: [],
          accountsBalance: []
        }
      };

      transactions?.forEach(transaction => {
        const dueDate = new Date(transaction.due_date);
        const amount = Number(transaction.amount);
        const isPaid = transaction.status === 'quitado';
        const isReceivable = transaction.type === 'receita';
        const isPayable = transaction.type === 'despesa';

        // Dados de hoje
        if (dueDate >= today && dueDate <= todayEnd) {
          if (isReceivable && !isPaid) {
            data.today.toReceive += amount;
          }
          if (isPayable && !isPaid) {
            data.today.toPay += amount;
          }
        }

        // Dados do mês
        if (dueDate >= startOfMonth && dueDate <= endOfMonth) {
          if (isReceivable) {
            if (isPaid) {
              data.thisMonth.received += amount;
            } else {
              data.thisMonth.provisioned += amount;
            }
          }
          if (isPayable && isPaid) {
            data.thisMonth.paid += amount;
          }
        }

        // Dados em atraso (vencimento anterior a hoje e não pago)
        if (dueDate < today && !isPaid) {
          data.overdue.amount += amount;
          data.overdue.count += 1;
        }
      });

      // Gerar dados dos gráficos
      // 1. Fluxo mensal (últimos 6 meses)
      const monthlyFlow = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        let receitas = 0;
        let despesas = 0;
        
        transactions?.forEach(transaction => {
          const transactionDate = new Date(transaction.due_date);
          if (transactionDate >= monthStart && transactionDate <= monthEnd) {
            const amount = Number(transaction.amount);
            if (transaction.type === 'receita') {
              receitas += amount;
            } else {
              despesas += amount;
            }
          }
        });
        
        monthlyFlow.push({
          month: date.toLocaleDateString('pt-BR', { month: 'short' }),
          receitas,
          despesas
        });
      }

      // 2. Distribuição por status (incluindo inadimplentes)
      const statusCounts = { pendente: 0, quitado: 0, inadimplente: 0 };
      transactions?.forEach(transaction => {
        const dueDate = new Date(transaction.due_date);
        const isPaid = transaction.status === 'quitado';
        
        if (isPaid) {
          statusCounts.quitado++;
        } else if (dueDate < today) {
          statusCounts.inadimplente++;
        } else {
          statusCounts.pendente++;
        }
      });

      const statusDistribution = [
        { name: 'Pendente', value: statusCounts.pendente, color: '#f59e0b' },
        { name: 'Quitado', value: statusCounts.quitado, color: '#0ea5e9' },
        { name: 'Inadimplente', value: statusCounts.inadimplente, color: '#ef4444' }
      ].filter(item => item.value > 0);

      // 3. Saldo das contas
      const accountsBalance = accounts.map(account => ({
        name: account.name,
        balance: Number(account.balance)
      }));
      
      console.log('Dados do gráfico de saldo:', accountsBalance);

      data.chartData = {
        monthlyFlow,
        statusDistribution,
        accountsBalance
      };

      setDashboardData(data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro inesperado ao carregar dashboard"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewOverdue = () => {
    navigate('/lancamentos?status=inadimplente');
  };

  const handleNewTransaction = () => {
    navigate('/lancamentos');
  };

  const handleReports = () => {
    navigate('/reports');
  };

  const handleNewAccount = () => {
    navigate('/accounts');
  };

  const handleTransfer = () => {
    navigate('/transferencias');
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral das finanças do escritório</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={handleReports}>
              <Eye className="h-4 w-4 mr-2" />
              Relatórios
            </Button>
            <Button size="sm" className="financial-gradient" onClick={handleNewTransaction}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Lançamento
            </Button>
          </div>
        </div>
        {/* KPIs Cards Row 1 - Hoje */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="financial-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Para Receber Hoje
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(dashboardData.today.toReceive)}
              </div>
              <p className="text-xs text-muted-foreground">
                Valores com vencimento hoje
              </p>
            </CardContent>
          </Card>

          <Card className="financial-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Para Pagar Hoje
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(dashboardData.today.toPay)}
              </div>
              <p className="text-xs text-muted-foreground">
                Valores com vencimento hoje
              </p>
            </CardContent>
          </Card>
        </div>

        {/* KPIs Cards Row 2 - Mês Corrente */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="financial-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recebido no Mês
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(dashboardData.thisMonth.received)}
              </div>
              <Badge className="status-badge status-paid mt-2">
                Realizado
              </Badge>
            </CardContent>
          </Card>

          <Card className="financial-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pago no Mês
              </CardTitle>
              <Calendar className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(dashboardData.thisMonth.paid)}
              </div>
              <Badge className="status-badge status-paid mt-2">
                Realizado
              </Badge>
            </CardContent>
          </Card>

          <Card className="financial-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Provisionado no Mês
              </CardTitle>
              <Calendar className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(dashboardData.thisMonth.provisioned)}
              </div>
              <Badge className="status-badge status-pending mt-2">
                A Receber
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Inadimplência Card */}
        <div className="grid grid-cols-1">
          <Card className="financial-card border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg font-bold text-red-700 dark:text-red-400">
                  Inadimplência
                </CardTitle>
                <CardDescription className="text-red-600 dark:text-red-300">
                  {dashboardData.overdue.count} lançamentos em atraso
                </CardDescription>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                  {formatCurrency(dashboardData.overdue.amount)}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={handleViewOverdue}
                >
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fluxo de Caixa Mensal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Fluxo de Caixa (Últimos 6 Meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.chartData.monthlyFlow}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis 
                    tickFormatter={(value) => 
                      new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0
                      }).format(value)
                    }
                  />
                  <Tooltip 
                    formatter={(value: number) => [
                      new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(value),
                      value
                    ]}
                  />
                  <Bar dataKey="receitas" fill="#10b981" name="Receitas" />
                  <Bar dataKey="despesas" fill="#ef4444" name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribuição por Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Status dos Lançamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData.chartData.statusDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {dashboardData.chartData.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Saldo das Contas */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Saldo por Conta
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.chartData.accountsBalance.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart 
                    data={dashboardData.chartData.accountsBalance}
                    layout="horizontal"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      type="number"
                      tickFormatter={(value) => 
                        new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0
                        }).format(value)
                      }
                    />
                    <YAxis type="category" dataKey="name" />
                    <Tooltip 
                      formatter={(value: number) => [
                        new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(value),
                        'Saldo'
                      ]}
                    />
                    <Bar dataKey="balance" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-center mb-2">Nenhuma conta encontrada</p>
                  <p className="text-sm text-center">
                    Cadastre suas contas para visualizar o saldo
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={handleNewAccount}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Conta
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-20 flex-col space-y-2" onClick={handleNewAccount}>
            <Plus className="h-5 w-5" />
            <span className="text-sm">Nova Conta</span>
          </Button>
          
          <Button variant="outline" className="h-20 flex-col space-y-2" onClick={handleNewTransaction}>
            <Calendar className="h-5 w-5" />
            <span className="text-sm">Novo Lançamento</span>
          </Button>
          
          <Button variant="outline" className="h-20 flex-col space-y-2" onClick={handleTransfer}>
            <DollarSign className="h-5 w-5" />
            <span className="text-sm">Transferência</span>
          </Button>
          
          <Button variant="outline" className="h-20 flex-col space-y-2" onClick={handleReports}>
            <Eye className="h-5 w-5" />
            <span className="text-sm">Relatórios</span>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;