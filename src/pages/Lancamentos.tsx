import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Calendar as CalendarIcon,
  Edit,
  Trash2,
  Repeat,
  Building,
  MoreVertical,
  DollarSign,
  AlertTriangle,
  Receipt
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import RecurringTransactions from "@/components/RecurringTransactions";

interface Transaction {
  id: string;
  type: "receita" | "despesa";
  description: string;
  amount: number;
  account_id?: string;
  case_id?: string;
  due_date: string;
  status: "pendente" | "pago";
  payment_date?: string;
  payment_account_id?: string;
  payment_observations?: string;
  observations?: string;
  is_recurring: boolean;
  recurrence_frequency?: "mensal" | "bimestral" | "trimestral" | "semestral" | "anual";
  recurrence_count?: number;
  recurrence_end_date?: string;
  recurrence_original_id?: string;
  user_id: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface Case {
  id: string;
  name: string;
  status: string;
}

export default function Lancamentos() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTipo, setSelectedTipo] = useState<string>("todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [paymentTransaction, setPaymentTransaction] = useState<Transaction | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date>();
  const [paymentObservations, setPaymentObservations] = useState("");
  const [paymentAccount, setPaymentAccount] = useState("");

  // Estados para formulário de cobrança Asaas
  const [isAsaasDialogOpen, setIsAsaasDialogOpen] = useState(false);
  const [asaasLoading, setAsaasLoading] = useState(false);
  const [asaasResult, setAsaasResult] = useState<{
    sucesso: boolean;
    mensagem: string;
    linkPagamento?: string;
    cobrancaId?: string;
  } | null>(null);
  const [asaasFormData, setAsaasFormData] = useState({
    descricao: "",
    valor: "",
    vencimento: new Date(),
    contatoNome: "",
    contatoEmail: "",
    contatoCpfCnpj: ""
  });

  // Form state
  const [formData, setFormData] = useState({
    type: "" as "receita" | "despesa" | "",
    description: "",
    amount: "",
    account_id: "",
    case_id: "",
    due_date: new Date(),
    is_recurring: false,
    recurrence_frequency: "" as "mensal" | "bimestral" | "trimestral" | "semestral" | "anual" | "",
    recurrence_count: "",
    recurrence_end_date: undefined as Date | undefined,
    observations: "",
    temRateio: false,
    rateios: [] as Array<{id: string, account_id: string, amount: number, percentage: number}>
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchTransactions(),
        fetchAccounts(),
        fetchCases()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user?.id)
      .order('due_date', { ascending: false });

    if (error) {
      console.error('Erro ao buscar transações:', error);
      return;
    }

    setTransactions(data || []);
  };

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user?.id);

    if (error) {
      console.error('Erro ao buscar contas:', error);
      return;
    }

    setAccounts(data || []);
  };

  const fetchCases = async () => {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('user_id', user?.id);

    if (error) {
      console.error('Erro ao buscar casos:', error);
      return;
    }

    setCases(data || []);
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = selectedTipo === "todos" || transaction.type === selectedTipo;
    const matchesStatus = selectedStatus === "todos" || transaction.status === selectedStatus;
    
    return matchesSearch && matchesTipo && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getAccountName = (accountId?: string) => {
    if (!accountId) return "Não informada";
    const account = accounts.find(acc => acc.id === accountId);
    return account?.name || "Conta não encontrada";
  };

  const getCaseName = (caseId?: string) => {
    if (!caseId) return "Não informado";
    const case_ = cases.find(c => c.id === caseId);
    return case_?.name || "Caso não encontrado";
  };

  // Função para calcular data final baseada na frequência e repetições
  const calculateEndDate = (startDate: Date, frequency: string, repetitions: number) => {
    const date = new Date(startDate);
    
    switch (frequency) {
      case 'mensal':
        date.setMonth(date.getMonth() + repetitions);
        break;
      case 'bimestral':
        date.setMonth(date.getMonth() + (repetitions * 2));
        break;
      case 'trimestral':
        date.setMonth(date.getMonth() + (repetitions * 3));
        break;
      case 'semestral':
        date.setMonth(date.getMonth() + (repetitions * 6));
        break;
      case 'anual':
        date.setFullYear(date.getFullYear() + repetitions);
        break;
      default:
        return undefined;
    }
    
    return date;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    if (!formData.type || !formData.description || !formData.amount || (!formData.account_id && !formData.temRateio)) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios: Tipo, Descrição, Valor e Conta (ou configure rateio)",
        variant: "destructive"
      });
      return;
    }

    // Validar rateios se habilitado
    if (formData.temRateio) {
      if (formData.rateios.length === 0) {
        toast({
          title: "Erro",
          description: "Configure pelo menos um rateio",
          variant: "destructive"
        });
        return;
      }
      
      const totalPercentage = formData.rateios.reduce((sum, r) => sum + (r.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast({
          title: "Erro",
          description: "O total dos rateios deve ser 100%",
          variant: "destructive"
        });
        return;
      }
    }

    if (formData.is_recurring && (!formData.recurrence_frequency || !formData.recurrence_count)) {
      toast({
        title: "Erro",
        description: "Para lançamentos recorrentes, preencha a frequência e número de repetições",
        variant: "destructive"
      });
      return;
    }

    try {
      const transactionData = {
        type: formData.type,
        description: formData.description,
        amount: parseFloat(formData.amount),
        account_id: formData.temRateio ? null : formData.account_id || null,
        case_id: formData.case_id || null,
        due_date: formData.due_date.toISOString().split('T')[0],
        status: "pendente" as const,
        observations: formData.observations || null,
        is_recurring: formData.is_recurring,
        recurrence_frequency: formData.is_recurring && formData.recurrence_frequency ? formData.recurrence_frequency : null,
        recurrence_count: formData.is_recurring ? parseInt(formData.recurrence_count) : null,
        recurrence_end_date: formData.recurrence_end_date ? formData.recurrence_end_date.toISOString().split('T')[0] : null,
        user_id: user.id
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id);

        if (error) {
          console.error('Erro ao atualizar transação:', error);
          toast({
            title: "Erro",
            description: "Erro ao atualizar lançamento",
            variant: "destructive"
          });
          return;
        }

        toast({
          title: "Sucesso",
          description: "Lançamento atualizado com sucesso"
        });
      } else {
        if (formData.is_recurring) {
          // Criar múltiplas transações para recorrência
          const transactions = [];
          const repetitions = parseInt(formData.recurrence_count);
          
          for (let i = 0; i < repetitions; i++) {
            const dueDate = new Date(formData.due_date);
            
            switch (formData.recurrence_frequency) {
              case 'mensal':
                dueDate.setMonth(dueDate.getMonth() + i);
                break;
              case 'bimestral':
                dueDate.setMonth(dueDate.getMonth() + (i * 2));
                break;
              case 'trimestral':
                dueDate.setMonth(dueDate.getMonth() + (i * 3));
                break;
              case 'semestral':
                dueDate.setMonth(dueDate.getMonth() + (i * 6));
                break;
              case 'anual':
                dueDate.setFullYear(dueDate.getFullYear() + i);
                break;
            }
            
            transactions.push({
              ...transactionData,
              due_date: dueDate.toISOString().split('T')[0],
              description: `${formData.description} (${i + 1}/${repetitions})`
            });
          }

          const { error } = await supabase
            .from('transactions')
            .insert(transactions);

          if (error) {
            console.error('Erro ao criar transações recorrentes:', error);
            toast({
              title: "Erro",
              description: "Erro ao criar lançamentos recorrentes",
              variant: "destructive"
            });
            return;
          }

          toast({
            title: "Sucesso",
            description: `${transactions.length} lançamentos recorrentes criados com sucesso`
          });
        } else {
          const { error } = await supabase
            .from('transactions')
            .insert([transactionData]);

          if (error) {
            console.error('Erro ao criar transação:', error);
            toast({
              title: "Erro",
              description: "Erro ao criar lançamento",
              variant: "destructive"
            });
            return;
          }

          toast({
            title: "Sucesso",
            description: "Lançamento criado com sucesso"
          });
        }

        // Se tem rateio, criar os splits
        if (formData.temRateio && formData.rateios.length > 0) {
          // Implementar lógica de rateio aqui se necessário
          // Por enquanto vou deixar comentado pois precisa da tabela transaction_splits
        }
      }

      resetForm();
      fetchTransactions();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar lançamento",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      description: transaction.description,
      amount: transaction.amount.toString(),
      account_id: transaction.account_id || "",
      case_id: transaction.case_id || "",
      due_date: new Date(transaction.due_date),
      is_recurring: transaction.is_recurring,
      recurrence_frequency: transaction.recurrence_frequency || "",
      recurrence_count: transaction.recurrence_count?.toString() || "",
      recurrence_end_date: transaction.recurrence_end_date ? new Date(transaction.recurrence_end_date) : undefined,
      observations: transaction.observations || "",
      temRateio: false, // Por enquanto não implementado
      rateios: []
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir transação:', error);
        toast({
          title: "Erro",
          description: "Erro ao excluir lançamento",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Lançamento excluído com sucesso"
      });

      fetchTransactions();
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir lançamento",
        variant: "destructive"
      });
    }
  };

  const toggleStatus = (transaction: Transaction) => {
    if (transaction.status === "pendente") {
      // Abrir modal para registrar pagamento
      setPaymentTransaction(transaction);
      setPaymentDate(new Date());
      setPaymentObservations("");
      setPaymentAccount(transaction.account_id || "");
      setIsPaymentDialogOpen(true);
    } else {
      // Marcar como pendente novamente
      updateTransactionStatus(transaction.id, "pendente", null, null, null);
    }
  };

  const updateTransactionStatus = async (
    id: string, 
    status: "pendente" | "pago",
    paymentDate: string | null = null,
    paymentObservations: string | null = null,
    paymentAccountId: string | null = null
  ) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          status,
          payment_date: paymentDate,
          payment_observations: paymentObservations,
          payment_account_id: paymentAccountId
        })
        .eq('id', id);

      if (error) {
        console.error('Erro ao atualizar status:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar status",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Status atualizado",
        description: status === "pago" ? "Pagamento registrado com sucesso" : "Lançamento marcado como pendente"
      });

      fetchTransactions();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive"
      });
    }
  };

  const handlePaymentSubmit = () => {
    if (!paymentDate || !paymentTransaction) {
      toast({
        title: "Erro",
        description: "Selecione a data do pagamento/recebimento",
        variant: "destructive"
      });
      return;
    }

    updateTransactionStatus(
      paymentTransaction.id,
      "pago",
      paymentDate.toISOString().split('T')[0],
      paymentObservations,
      paymentAccount
    );

    setIsPaymentDialogOpen(false);
    setPaymentTransaction(null);
  };

  const handleAsaasSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!asaasFormData.descricao || !asaasFormData.valor || !asaasFormData.contatoNome) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios: Descrição, Valor e Nome do cliente",
        variant: "destructive"
      });
      return;
    }

    setAsaasLoading(true);
    setAsaasResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('criar-cobranca-asaas', {
        body: {
          descricao: asaasFormData.descricao,
          valor: parseFloat(asaasFormData.valor),
          vencimento: asaasFormData.vencimento.toISOString().split('T')[0],
          contatoNome: asaasFormData.contatoNome,
          contatoEmail: asaasFormData.contatoEmail || undefined,
          contatoCpfCnpj: asaasFormData.contatoCpfCnpj || undefined
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setAsaasResult(data);
      
      if (data.sucesso) {
        toast({
          title: "Sucesso",
          description: data.mensagem
        });
      } else {
        toast({
          title: "Erro",
          description: data.mensagem,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao criar cobrança:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar cobrança no Asaas",
        variant: "destructive"
      });
    } finally {
      setAsaasLoading(false);
    }
  };

  const resetAsaasForm = () => {
    setAsaasFormData({
      descricao: "",
      valor: "",
      vencimento: new Date(),
      contatoNome: "",
      contatoEmail: "",
      contatoCpfCnpj: ""
    });
    setAsaasResult(null);
    setIsAsaasDialogOpen(false);
  };

  const resetForm = () => {
    setFormData({
      type: "",
      description: "",
      amount: "",
      account_id: "",
      case_id: "",
      due_date: new Date(),
      is_recurring: false,
      recurrence_frequency: "",
      recurrence_count: "",
      recurrence_end_date: undefined,
      observations: "",
      temRateio: false,
      rateios: []
    });
    setEditingTransaction(null);
    setIsDialogOpen(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <p>Carregando lançamentos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Lançamentos</h1>
            <p className="text-muted-foreground">Gerencie receitas e despesas</p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isAsaasDialogOpen} onOpenChange={setIsAsaasDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Receipt className="h-4 w-4 mr-2" />
                  Criar Cobrança
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Cobrança no Asaas</DialogTitle>
                  <DialogDescription>
                    Preencha os dados para gerar uma cobrança via boleto
                  </DialogDescription>
                </DialogHeader>

                {asaasResult ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        {asaasResult.mensagem}
                      </p>
                      {asaasResult.sucesso && asaasResult.linkPagamento && (
                        <Button
                          onClick={() => window.open(asaasResult.linkPagamento, '_blank')}
                          className="w-full"
                        >
                          Ver Boleto
                        </Button>
                      )}
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={resetAsaasForm}>
                        Nova Cobrança
                      </Button>
                      <Button variant="default" onClick={resetAsaasForm}>
                        Fechar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleAsaasSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descrição *</Label>
                      <Input
                        id="descricao"
                        placeholder="Descrição da cobrança"
                        value={asaasFormData.descricao}
                        onChange={(e) => setAsaasFormData({...asaasFormData, descricao: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="valor">Valor *</Label>
                      <Input
                        id="valor"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={asaasFormData.valor}
                        onChange={(e) => setAsaasFormData({...asaasFormData, valor: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Vencimento *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {asaasFormData.vencimento ? format(asaasFormData.vencimento, "PPP", { locale: ptBR }) : "Selecione a data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={asaasFormData.vencimento}
                            onSelect={(date) => date && setAsaasFormData({...asaasFormData, vencimento: date})}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contatoNome">Nome do Cliente *</Label>
                      <Input
                        id="contatoNome"
                        placeholder="Nome completo do cliente"
                        value={asaasFormData.contatoNome}
                        onChange={(e) => setAsaasFormData({...asaasFormData, contatoNome: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contatoEmail">E-mail do Cliente</Label>
                      <Input
                        id="contatoEmail"
                        type="email"
                        placeholder="email@exemplo.com"
                        value={asaasFormData.contatoEmail}
                        onChange={(e) => setAsaasFormData({...asaasFormData, contatoEmail: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contatoCpfCnpj">CPF ou CNPJ do Cliente</Label>
                      <Input
                        id="contatoCpfCnpj"
                        placeholder="000.000.000-00 ou 00.000.000/0000-00"
                        value={asaasFormData.contatoCpfCnpj}
                        onChange={(e) => setAsaasFormData({...asaasFormData, contatoCpfCnpj: e.target.value})}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetAsaasForm}
                        disabled={asaasLoading}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={asaasLoading}>
                        {asaasLoading ? "Criando..." : "Criar Cobrança"}
                      </Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Lançamento
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTransaction ? "Editar Lançamento" : "Novo Lançamento"}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados do lançamento financeiro
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo *</Label>
                    <Select value={formData.type} onValueChange={(value: "receita" | "despesa") => setFormData({...formData, type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Input
                    id="description"
                    placeholder="Descrição do lançamento"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account">Conta *</Label>
                    <Select 
                      value={formData.account_id} 
                      onValueChange={(value) => setFormData({...formData, account_id: value})}
                      disabled={formData.temRateio}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="case">Caso/Centro de Custo</Label>
                    <Select value={formData.case_id} onValueChange={(value) => setFormData({...formData, case_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o caso" />
                      </SelectTrigger>
                      <SelectContent>
                        {cases.map((case_) => (
                          <SelectItem key={case_.id} value={case_.id}>{case_.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Opção de Rateio */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rateio"
                      checked={formData.temRateio}
                      onCheckedChange={(checked) => {
                        setFormData({
                          ...formData, 
                          temRateio: checked as boolean,
                          account_id: checked ? "" : formData.account_id,
                          rateios: checked ? [
                            { id: Date.now().toString(), account_id: "", amount: 0, percentage: 100 }
                          ] : []
                        });
                      }}
                    />
                    <Label htmlFor="rateio" className="text-sm">Dividir entre contas (Rateio)</Label>
                  </div>
                  
                  {formData.temRateio && (
                    <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm">Configurar Rateio</h4>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              rateios: [
                                ...formData.rateios,
                                { id: Date.now().toString(), account_id: "", amount: 0, percentage: 0 }
                              ]
                            });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar Conta
                        </Button>
                      </div>
                      
                      {formData.rateios.map((rateio, index) => (
                        <div key={rateio.id} className="grid grid-cols-3 gap-2 items-end">
                          <div className="space-y-1">
                            <Label className="text-xs">Conta</Label>
                            <Select 
                              value={rateio.account_id} 
                              onValueChange={(value) => {
                                const newRateios = [...formData.rateios];
                                newRateios[index].account_id = value;
                                setFormData({...formData, rateios: newRateios});
                              }}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts.map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    {account.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-xs">Percentual (%)</Label>
                            <Input
                              type="number"
                              className="h-8"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="0"
                              value={rateio.percentage || ""}
                              onChange={(e) => {
                                const percentage = parseFloat(e.target.value) || 0;
                                const amount = formData.amount ? (parseFloat(formData.amount) * percentage / 100) : 0;
                                const newRateios = [...formData.rateios];
                                newRateios[index] = { ...rateio, percentage, amount };
                                setFormData({...formData, rateios: newRateios});
                              }}
                            />
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(rateio.amount)}
                            </div>
                            {formData.rateios.length > 1 && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const newRateios = formData.rateios.filter((_, i) => i !== index);
                                  setFormData({...formData, rateios: newRateios});
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      <div className="text-xs text-muted-foreground">
                        Total: {formData.rateios.reduce((sum, r) => sum + (r.percentage || 0), 0).toFixed(2)}%
                        {Math.abs(formData.rateios.reduce((sum, r) => sum + (r.percentage || 0), 0) - 100) > 0.01 && (
                          <span className="text-red-500 ml-2">
                            ⚠️ O total deve ser 100%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Vencimento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.due_date ? format(formData.due_date, "PPP", { locale: ptBR }) : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.due_date}
                          onSelect={(date) => date && setFormData({...formData, due_date: date})}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Configurações</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="recurring"
                        checked={formData.is_recurring}
                        onCheckedChange={(checked) => setFormData({...formData, is_recurring: checked as boolean})}
                      />
                      <Label htmlFor="recurring" className="text-sm">Lançamento recorrente</Label>
                    </div>
                    
                    {/* Campos condicionais para lançamento recorrente */}
                    {formData.is_recurring && (
                      <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-3">
                        <h4 className="font-medium text-sm">Configurações de Recorrência</h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="frequency" className="text-xs">Frequência</Label>
                            <Select 
                              value={formData.recurrence_frequency} 
                              onValueChange={(value: "mensal" | "bimestral" | "trimestral" | "semestral" | "anual") => {
                                setFormData({...formData, recurrence_frequency: value});
                                // Auto-calcular data final se já tem repetições
                                if (formData.recurrence_count) {
                                  const endDate = calculateEndDate(formData.due_date, value, parseInt(formData.recurrence_count));
                                  setFormData(prev => ({...prev, recurrence_frequency: value, recurrence_end_date: endDate}));
                                }
                              }}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mensal">Mensal</SelectItem>
                                <SelectItem value="bimestral">Bimestral</SelectItem>
                                <SelectItem value="trimestral">Trimestral</SelectItem>
                                <SelectItem value="semestral">Semestral</SelectItem>
                                <SelectItem value="anual">Anual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-1">
                            <Label htmlFor="count" className="text-xs">Repetições</Label>
                            <Input
                              id="count"
                              type="number"
                              placeholder="Ex: 12"
                              className="h-8"
                              min="1"
                              value={formData.recurrence_count}
                              onChange={(e) => {
                                const repetitions = e.target.value;
                                setFormData({...formData, recurrence_count: repetitions});
                                // Auto-calcular data final se já tem frequência
                                if (formData.recurrence_frequency && repetitions) {
                                  const endDate = calculateEndDate(formData.due_date, formData.recurrence_frequency, parseInt(repetitions));
                                  setFormData(prev => ({...prev, recurrence_count: repetitions, recurrence_end_date: endDate}));
                                }
                              }}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="endDate" className="text-xs">Data final (calculada automaticamente)</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal h-8 text-xs"
                              >
                                <CalendarIcon className="mr-2 h-3 w-3" />
                                {formData.recurrence_end_date ? format(formData.recurrence_end_date, "PPP", { locale: ptBR }) : "Calculada automaticamente"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={formData.recurrence_end_date}
                                onSelect={(date) => setFormData({...formData, recurrence_end_date: date})}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea
                    id="observations"
                    placeholder="Observações adicionais..."
                    value={formData.observations}
                    onChange={(e) => setFormData({...formData, observations: e.target.value})}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="default">
                    {editingTransaction ? "Atualizar" : "Criar"} Lançamento
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <Tabs defaultValue="lancamentos" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
            <TabsTrigger value="recorrentes">Recorrentes</TabsTrigger>
          </TabsList>

          <TabsContent value="lancamentos" className="space-y-6">
            {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="receita">Receitas</SelectItem>
                  <SelectItem value="despesa">Despesas</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos status</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="pago">Pagos/Recebidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Lançamentos */}
        <div className="space-y-4">
          {filteredTransactions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Nenhum lançamento encontrado
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Comece criando seu primeiro lançamento financeiro
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Lançamento
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredTransactions.map((transaction) => (
              <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {transaction.type === "receita" ? (
                          <ArrowUpCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowDownCircle className="h-5 w-5 text-red-600" />
                        )}
                        {transaction.description}
                        {transaction.is_recurring && (
                          <Repeat className="h-4 w-4 ml-1 text-muted-foreground" />
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <Badge 
                          variant={transaction.status === "pago" ? "default" : "outline"}
                          className={transaction.status === "pago" ? "status-paid" : "status-pending"}
                        >
                          {transaction.status === "pago" ? "Pago" : "Pendente"}
                        </Badge>
                        <Badge variant={transaction.type === 'receita' ? 'default' : 'secondary'}>
                          {transaction.type === 'receita' ? 'Receita' : 'Despesa'}
                        </Badge>
                        {transaction.case_id && (
                          <Badge variant="outline">
                            <Building className="h-3 w-3 mr-1" />
                            {getCaseName(transaction.case_id)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        transaction.type === 'receita' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Vencimento:</span>
                      <div className="font-medium">
                        {format(new Date(transaction.due_date), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Conta:</span>
                      <div className="font-medium">{getAccountName(transaction.account_id)}</div>
                    </div>
                    {transaction.payment_date && (
                      <div>
                        <span className="text-muted-foreground">Data Pagamento:</span>
                        <div className="font-medium">
                          {format(new Date(transaction.payment_date), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {transaction.observations && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <span className="text-muted-foreground text-sm">Observações:</span>
                      <div className="text-sm mt-1">{transaction.observations}</div>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(transaction)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant={transaction.status === "pendente" ? "default" : "secondary"}
                      onClick={() => toggleStatus(transaction)}
                      className="flex items-center gap-1"
                    >
                      <DollarSign className="h-3 w-3" />
                      {transaction.status === "pendente" ? "Quitar" : "Pendente"}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => handleDelete(transaction.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
          </TabsContent>

          <TabsContent value="recorrentes">
            <RecurringTransactions />
          </TabsContent>
        </Tabs>

        {/* Dialog de Pagamento */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Registrar {paymentTransaction?.type === "receita" ? "Recebimento" : "Pagamento"}
              </DialogTitle>
              <DialogDescription>
                Confirme os dados do {paymentTransaction?.type === "receita" ? "recebimento" : "pagamento"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Lançamento</Label>
                <div className="text-sm text-muted-foreground">
                  {paymentTransaction?.description} - {formatCurrency(paymentTransaction?.amount || 0)}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data do {paymentTransaction?.type === "receita" ? "Recebimento" : "Pagamento"} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paymentDate ? format(paymentDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={paymentDate}
                      onSelect={setPaymentDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Conta para {paymentTransaction?.type === "receita" ? "Recebimento" : "Pagamento"} *</Label>
                <Select value={paymentAccount} onValueChange={setPaymentAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações sobre o pagamento..."
                  value={paymentObservations}
                  onChange={(e) => setPaymentObservations(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPaymentDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handlePaymentSubmit}>
                  Confirmar {paymentTransaction?.type === "receita" ? "Recebimento" : "Pagamento"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}