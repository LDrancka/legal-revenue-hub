import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Repeat, Calendar, DollarSign, Pause, Play } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecurringTransaction {
  id: string;
  type: "receita" | "despesa";
  description: string;
  amount: number;
  is_recurring: boolean;
  recurrence_frequency: "mensal" | "bimestral" | "trimestral" | "semestral" | "anual";
  recurrence_count?: number;
  recurrence_end_date?: string;
  due_date: string;
  user_id: string;
  status: "pendente" | "quitado";
}

export default function RecurringTransactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecurringTransactions();
    }
  }, [user]);

  const fetchRecurringTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_recurring', true)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar transações recorrentes:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar transações recorrentes",
          variant: "destructive"
        });
        return;
      }

      setRecurringTransactions(data || []);
    } catch (error) {
      console.error('Erro ao buscar transações recorrentes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar transações recorrentes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRecurringStatus = async (transactionId: string, newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ is_recurring: newStatus })
        .eq('id', transactionId);

      if (error) {
        console.error('Erro ao atualizar status da recorrência:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar status da recorrência",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: newStatus ? "Recorrência ativada" : "Recorrência pausada"
      });

      fetchRecurringTransactions();
    } catch (error) {
      console.error('Erro ao atualizar status da recorrência:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da recorrência",
        variant: "destructive"
      });
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      mensal: "Mensal",
      bimestral: "Bimestral", 
      trimestral: "Trimestral",
      semestral: "Semestral",
      anual: "Anual"
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  const getNextDueDate = (transaction: RecurringTransaction) => {
    const today = new Date();
    const lastDue = new Date(transaction.due_date);
    
    // Calcular próxima data baseada na frequência
    const next = new Date(lastDue);
    switch (transaction.recurrence_frequency) {
      case 'mensal':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'bimestral':
        next.setMonth(next.getMonth() + 2);
        break;
      case 'trimestral':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'semestral':
        next.setMonth(next.getMonth() + 6);
        break;
      case 'anual':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    // Se a próxima data já passou, calcular a próxima válida
    while (next < today) {
      switch (transaction.recurrence_frequency) {
        case 'mensal':
          next.setMonth(next.getMonth() + 1);
          break;
        case 'bimestral':
          next.setMonth(next.getMonth() + 2);
          break;
        case 'trimestral':
          next.setMonth(next.getMonth() + 3);
          break;
        case 'semestral':
          next.setMonth(next.getMonth() + 6);
          break;
        case 'anual':
          next.setFullYear(next.getFullYear() + 1);
          break;
      }
    }

    return next;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Carregando transações recorrentes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Transações Recorrentes
          </CardTitle>
          <CardDescription>
            Gerencie suas recorrências automáticas. O sistema criará automaticamente novas transações baseadas na frequência configurada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recurringTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Repeat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma transação recorrente encontrada</p>
              <p className="text-sm text-muted-foreground mt-2">
                Crie lançamentos marcados como recorrentes na aba "Lançamentos"
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recurringTransactions.map((transaction) => (
                <Card key={transaction.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{transaction.description}</h3>
                          <Badge variant={transaction.type === "receita" ? "default" : "secondary"}>
                            {transaction.type === "receita" ? "Receita" : "Despesa"}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span className={transaction.type === "receita" ? "text-green-600" : "text-red-600"}>
                              {formatCurrency(transaction.amount)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{getFrequencyLabel(transaction.recurrence_frequency)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Próxima: {format(getNextDueDate(transaction), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          {transaction.is_recurring ? (
                            <Play className="h-4 w-4 text-green-600" />
                          ) : (
                            <Pause className="h-4 w-4 text-orange-600" />
                          )}
                          <Switch
                            checked={transaction.is_recurring}
                            onCheckedChange={(checked) => toggleRecurringStatus(transaction.id, checked)}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}