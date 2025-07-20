import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  Calendar as CalendarIcon,
  DollarSign,
  FileText,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  X
} from "lucide-react";

interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  status: 'pendente' | 'pago' | 'vencido';
  due_date: string;
  payment_date: string | null;
  account_id: string | null;
  payment_account_id: string | null;
  case_id: string | null;
  observations: string | null;
  payment_observations: string | null;
  is_recurring: boolean;
  recurrence_frequency: string | null;
  recurrence_end_date: string | null;
  recurrence_count: number | null;
  recurrence_original_id: string | null;
  created_at: string;
  updated_at: string;
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

const LancamentosFiltered = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [caseFilter, setCaseFilter] = useState<string>("all");
  const [dateFromFilter, setDateFromFilter] = useState<Date | undefined>();
  const [dateToFilter, setDateToFilter] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    type: "receita" as 'receita' | 'despesa',
    status: "pendente" as 'pendente' | 'pago' | 'vencido',
    due_date: "",
    payment_date: "",
    account_id: "",
    payment_account_id: "",
    case_id: "",
    observations: "",
    payment_observations: "",
    is_recurring: false,
    recurrence_frequency: "",
    recurrence_end_date: "",
    recurrence_count: ""
  });

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar lançamentos:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar lançamentos"
        });
      } else {
        setTransactions(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar lançamentos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccounts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar contas:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar contas"
        });
      } else {
        setAccounts(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
    }
  };

  const fetchCases = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('cases')
        .select('id, name, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar casos:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar casos"
        });
      } else {
        setCases(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar casos:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchAccounts();
      fetchCases();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingTransaction) {
        // Lógica para atualizar um lançamento existente
      } else {
        // Lógica para criar um novo lançamento
      }

      setIsDialogOpen(false);
      setEditingTransaction(null);
      setFormData({
        description: "",
        amount: "",
        type: "receita",
        status: "pendente",
        due_date: "",
        payment_date: "",
        account_id: "",
        payment_account_id: "",
        case_id: "",
        observations: "",
        payment_observations: "",
        is_recurring: false,
        recurrence_frequency: "",
        recurrence_end_date: "",
        recurrence_count: ""
      });
      fetchTransactions();
    } catch (error: any) {
      console.error('Erro ao salvar lançamento:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao salvar lançamento"
      });
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      description: transaction.description,
      amount: String(transaction.amount),
      type: transaction.type,
      status: transaction.status,
      due_date: transaction.due_date,
      payment_date: transaction.payment_date || "",
      account_id: transaction.account_id || "",
      payment_account_id: transaction.payment_account_id || "",
      case_id: transaction.case_id || "",
      observations: transaction.observations || "",
      payment_observations: transaction.payment_observations || "",
      is_recurring: transaction.is_recurring,
      recurrence_frequency: transaction.recurrence_frequency || "",
      recurrence_end_date: transaction.recurrence_end_date || "",
      recurrence_count: String(transaction.recurrence_count || "")
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este lançamento? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Lançamento deletado com sucesso!"
      });
      fetchTransactions();
    } catch (error: any) {
      console.error('Erro ao deletar lançamento:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao deletar lançamento"
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return { label: 'Pago', variant: 'default' as const, icon: CheckCircle };
      case 'pendente':
        return { label: 'Pendente', variant: 'secondary' as const, icon: Clock };
      case 'vencido':
        return { label: 'Vencido', variant: 'destructive' as const, icon: AlertCircle };
      default:
        return { label: status, variant: 'outline' as const, icon: FileText };
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    // Filtro de busca
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.observations && transaction.observations.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filtro de tipo
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    
    // Filtro de status
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    
    // Filtro de caso
    const matchesCase = caseFilter === "all" || 
                       (caseFilter === "no-case" && !transaction.case_id) ||
                       (transaction.case_id === caseFilter);
    
    // Filtro de data
    const transactionDate = new Date(transaction.due_date);
    const matchesDateFrom = !dateFromFilter || transactionDate >= dateFromFilter;
    const matchesDateTo = !dateToFilter || transactionDate <= dateToFilter;
    
    return matchesSearch && matchesType && matchesStatus && matchesCase && matchesDateFrom && matchesDateTo;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setStatusFilter("all");
    setCaseFilter("all");
    setDateFromFilter(undefined);
    setDateToFilter(undefined);
  };

  const hasActiveFilters = searchTerm || typeFilter !== "all" || statusFilter !== "all" || 
                          caseFilter !== "all" || dateFromFilter || dateToFilter;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header com filtros avançados */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Lançamentos</h1>
            <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo Lançamento
              </Button>
            </DialogTrigger>
            {/* Dialog content would go here - keeping existing form */}
          </Dialog>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4">
              {/* Linha superior com busca e toggle de filtros */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar lançamentos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Filtros
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                        !
                      </Badge>
                    )}
                  </Button>
                  
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Limpar
                    </Button>
                  )}
                </div>
              </div>

              {/* Filtros expandidos */}
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Caso</Label>
                    <Select value={caseFilter} onValueChange={setCaseFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="no-case">Sem caso</SelectItem>
                        {cases.map(caseItem => (
                          <SelectItem key={caseItem.id} value={caseItem.id}>
                            {caseItem.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data de</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateFromFilter && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFromFilter ? format(dateFromFilter, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFromFilter}
                          onSelect={setDateFromFilter}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Data até</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateToFilter && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateToFilter ? format(dateToFilter, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateToFilter}
                          onSelect={setDateToFilter}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <div className="space-y-4">
          {filteredTransactions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {hasActiveFilters ? "Nenhum lançamento encontrado com os filtros aplicados" : "Nenhum lançamento encontrado"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {hasActiveFilters 
                      ? "Tente ajustar os filtros de busca" 
                      : "Comece criando seu primeiro lançamento financeiro"
                    }
                  </p>
                  {!hasActiveFilters && (
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Lançamento
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Resumo dos filtros */}
              {hasActiveFilters && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {filteredTransactions.length} de {transactions.length} lançamentos
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {filteredTransactions.map((transaction) => {
                const statusBadge = getStatusBadge(transaction.status);
                const StatusIcon = statusBadge.icon;
                const caseInfo = cases.find(c => c.id === transaction.case_id);
                const accountInfo = accounts.find(a => a.id === transaction.account_id);

                return (
                  <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <DollarSign className={`h-5 w-5 ${
                              transaction.type === 'receita' ? 'text-green-600' : 'text-red-600'
                            }`} />
                            {transaction.description}
                          </CardTitle>
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <Badge 
                              variant={statusBadge.variant}
                              className="flex items-center gap-1"
                            >
                              <StatusIcon className="h-3 w-3" />
                              {statusBadge.label}
                            </Badge>
                            <Badge variant={transaction.type === 'receita' ? 'default' : 'secondary'}>
                              {transaction.type === 'receita' ? 'Receita' : 'Despesa'}
                            </Badge>
                            {caseInfo && (
                              <Badge variant="outline">
                                📁 {caseInfo.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${
                            transaction.type === 'receita' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(Number(transaction.amount))}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Vencimento:</span>
                          <div className="font-medium">
                            {new Date(transaction.due_date).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        {accountInfo && (
                          <div>
                            <span className="text-muted-foreground">Conta:</span>
                            <div className="font-medium">{accountInfo.name}</div>
                          </div>
                        )}
                      </div>
                      
                      {transaction.observations && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <span className="text-muted-foreground text-sm">Observações:</span>
                          <div className="text-sm mt-1">{transaction.observations}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default LancamentosFiltered;
