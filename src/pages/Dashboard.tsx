import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  AlertTriangle,
  Eye,
  Plus
} from "lucide-react";

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
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    today: { toReceive: 0, toPay: 0 },
    thisMonth: { received: 0, paid: 0, provisioned: 0 },
    overdue: { amount: 0, count: 0 }
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

      // Buscar transações
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao buscar transações:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar dados do dashboard"
        });
        return;
      }

      // Calcular dados do dashboard
      const data: DashboardData = {
        today: { toReceive: 0, toPay: 0 },
        thisMonth: { received: 0, paid: 0, provisioned: 0 },
        overdue: { amount: 0, count: 0 }
      };

      transactions?.forEach(transaction => {
        const dueDate = new Date(transaction.due_date);
        const amount = Number(transaction.amount);
        const isPaid = transaction.status === 'pago';
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
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Relatórios
            </Button>
            <Button size="sm" className="financial-gradient">
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
                <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50">
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-20 flex-col space-y-2">
            <Plus className="h-5 w-5" />
            <span className="text-sm">Nova Conta</span>
          </Button>
          
          <Button variant="outline" className="h-20 flex-col space-y-2">
            <Calendar className="h-5 w-5" />
            <span className="text-sm">Fluxo de Caixa</span>
          </Button>
          
          <Button variant="outline" className="h-20 flex-col space-y-2">
            <DollarSign className="h-5 w-5" />
            <span className="text-sm">Transferência</span>
          </Button>
          
          <Button variant="outline" className="h-20 flex-col space-y-2">
            <Eye className="h-5 w-5" />
            <span className="text-sm">Relatórios</span>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;