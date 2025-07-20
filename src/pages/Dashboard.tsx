import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  AlertTriangle,
  Eye,
  Plus
} from "lucide-react";

const Dashboard = () => {
  // Mock data - será substituído por dados reais
  const financialData = {
    today: {
      toReceive: 15000,
      toPay: 8500
    },
    thisMonth: {
      received: 125000,
      paid: 85000,
      provisioned: 45000
    },
    overdue: {
      amount: 23000,
      count: 8
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

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
                {formatCurrency(financialData.today.toReceive)}
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
                {formatCurrency(financialData.today.toPay)}
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
                {formatCurrency(financialData.thisMonth.received)}
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
                {formatCurrency(financialData.thisMonth.paid)}
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
                {formatCurrency(financialData.thisMonth.provisioned)}
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
                  {financialData.overdue.count} lançamentos em atraso
                </CardDescription>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                  {formatCurrency(financialData.overdue.amount)}
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