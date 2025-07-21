import React, { useState, useEffect } from "react";
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
  Receipt,
  Tag
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import RecurringTransactions from "@/components/RecurringTransactions";
import { CategoriesDialog } from "@/components/CategoriesDialog";

interface Transaction {
  id: string;
  type: "receita" | "despesa";
  description: string;
  amount: number;
  account_id?: string;
  case_id?: string;
  client_id?: string;
  category_id?: string;
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
  splits?: Array<{ account_id: string; amount: number; percentage: number }>;
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

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function Lancamentos() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCategoriesDialogOpen, setIsCategoriesDialogOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTipo, setSelectedTipo] = useState<string>("todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
  const [clientSearch, setClientSearch] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [rateioAccountSearch, setRateioAccountSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [paymentTransaction, setPaymentTransaction] = useState<Transaction | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date>();
  const [paymentObservations, setPaymentObservations] = useState("");
  const [paymentAccount, setPaymentAccount] = useState("");
  
  // Estados para confirmação de desfazer quitação
  const [isUndoDialogOpen, setIsUndoDialogOpen] = useState(false);
  const [undoTransaction, setUndoTransaction] = useState<Transaction | null>(null);
  
  // Estados para quitação parcial
  const [isPartialPaymentDialogOpen, setIsPartialPaymentDialogOpen] = useState(false);
  const [partialTransaction, setPartialTransaction] = useState<Transaction | null>(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [partialPaymentDate, setPartialPaymentDate] = useState<Date>();
  const [partialPaymentAccount, setPartialPaymentAccount] = useState("");
  const [partialObservations, setPartialObservations] = useState("");
  const [newDueDate, setNewDueDate] = useState<Date>();
  const [partialSplitAmounts, setPartialSplitAmounts] = useState<{ [accountId: string]: string }>({});

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
    client_id: "",
    category_id: "",
    status: "pendente" as "pendente" | "pago" | "atrasado",
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
        fetchCases(),
        fetchClients(),
        fetchCategories()
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
      .select(`
        *,
        transaction_splits (
          account_id,
          amount,
          percentage
        )
      `)
      .eq('user_id', user?.id)
      .order('due_date', { ascending: false });

    if (error) {
      console.error('Erro ao buscar transações:', error);
      return;
    }

    // Processar os dados para incluir splits na transaction
    const processedTransactions = (data || []).map(transaction => ({
      ...transaction,
      splits: transaction.transaction_splits || []
    }));

    setTransactions(processedTransactions);
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

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user?.id);

    if (error) {
      console.error('Erro ao buscar contatos:', error);
      return;
    }

    setClients(data || []);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user?.id);

    if (error) {
      console.error('Erro ao buscar categorias:', error);
      return;
    }

    setCategories(data || []);
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = selectedTipo === "todos" || transaction.type === selectedTipo;
    const matchesStatus = selectedStatus === "todos" || transaction.status === selectedStatus;
    
    return matchesSearch && matchesTipo && matchesStatus;
  });

  const formatCurrency = (value: number, isExpense: boolean = false) => {
    const amount = isExpense ? Math.abs(value) : value;
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
    
    return isExpense ? `-${formatted}` : formatted;
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === "pago") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const getStatusDisplay = (transaction: Transaction) => {
    if (transaction.status === "pago") return { text: "Pago", variant: "default" as const, className: "text-green-700 bg-green-100" };
    if (isOverdue(transaction.due_date, transaction.status)) {
      return { text: "INADIMPLENTE", variant: "destructive" as const, className: "text-red-700 bg-red-100" };
    }
    return { text: "Pendente", variant: "outline" as const, className: "text-yellow-700 bg-yellow-100" };
  };

  const getAccountName = (accountId?: string, splits?: Array<{ account_id: string; amount: number; percentage: number }>) => {
    // Se tem splits (rateio), mostrar todas as contas
    if (splits && splits.length > 0) {
      const accountNames = splits.map(split => {
        const account = accounts.find(acc => acc.id === split.account_id);
        return `${account?.name || 'Conta não encontrada'} (${split.percentage}%)`;
      });
      return accountNames.join(', ');
    }
    
    // Se não tem splits, usar a conta padrão
    if (!accountId) return "Não informada";
    const account = accounts.find(acc => acc.id === accountId);
    return account?.name || "Conta não encontrada";
  };

  const getCaseName = (caseId?: string) => {
    if (!caseId) return "Não informado";
    const case_ = cases.find(c => c.id === caseId);
    return case_?.name || "Caso não encontrado";
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return "Não informado";
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Cliente não encontrado";
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

    // Debug para verificar os dados
    console.log('Dados do formulário:', formData);

    if (!formData.type || !formData.description || !formData.amount || !formData.client_id || (!formData.account_id && !formData.temRateio)) {
      const missingFields = [];
      if (!formData.type) missingFields.push('Tipo');
      if (!formData.description) missingFields.push('Descrição');
      if (!formData.amount) missingFields.push('Valor');
      if (!formData.client_id) missingFields.push('Contato');
      if (!formData.account_id && !formData.temRateio) missingFields.push('Conta ou Rateio');
      
      toast({
        title: "Erro",
        description: `Preencha os campos obrigatórios: ${missingFields.join(', ')}`,
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
      const totalAmount = formData.rateios.reduce((sum, r) => sum + (r.amount || 0), 0);
      const formAmount = parseFloat(formData.amount) || 0;
      
      // Validar se o total dos percentuais está próximo de 100% OU se o total dos valores está correto
      const percentageValid = Math.abs(totalPercentage - 100) <= 0.01;
      const amountValid = Math.abs(totalAmount - formAmount) <= 0.01;
      
      if (!percentageValid && !amountValid) {
        toast({
          title: "Erro",
          description: "O total dos rateios deve ser 100% ou os valores devem somar exatamente o valor total",
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
        client_id: formData.client_id || null,
        category_id: formData.category_id || null,
        due_date: formData.due_date.toISOString().split('T')[0],
        status: formData.status as "pendente" | "pago",
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

          const { data: insertedTransactions, error } = await supabase
            .from('transactions')
            .insert(transactions)
            .select('id, description');

          if (error) {
            console.error('Erro ao criar transações recorrentes:', error);
            toast({
              title: "Erro",
              description: "Erro ao criar lançamentos recorrentes",
              variant: "destructive"
            });
            return;
          }

          // Se tem rateio, criar os splits para cada transação recorrente
          if (formData.temRateio && formData.rateios.length > 0 && insertedTransactions) {
            for (const transaction of insertedTransactions) {
              const splitsToInsert = formData.rateios.map(rateio => ({
                transaction_id: transaction.id,
                account_id: rateio.account_id,
                amount: rateio.amount,
                percentage: rateio.percentage
              }));

              const { error: splitsError } = await supabase
                .from('transaction_splits')
                .insert(splitsToInsert);

              if (splitsError) {
                console.error('Erro ao criar splits para transação recorrente:', splitsError);
              }
            }

            // Se os lançamentos recorrentes foram criados como "pago", atualizar saldos das contas do rateio
            if (formData.status === "pago") {
              for (const rateio of formData.rateios) {
                const balanceChangePerTransaction = formData.type === "receita" 
                  ? rateio.amount 
                  : -rateio.amount;
                
                const totalBalanceChange = balanceChangePerTransaction * transactions.length;

                // Buscar saldo atual da conta
                const { data: accountData, error: accountFetchError } = await supabase
                  .from('accounts')
                  .select('balance')
                  .eq('id', rateio.account_id)
                  .single();

                if (!accountFetchError && accountData) {
                  const newBalance = Number(accountData.balance) + totalBalanceChange;

                  await supabase
                    .from('accounts')
                    .update({ balance: newBalance })
                    .eq('id', rateio.account_id);
                }
              }
            }
          } else if (formData.status === "pago" && formData.account_id && !formData.temRateio) {
            // Se não tem rateio, atualizar saldo da conta única
            const balanceChangePerTransaction = formData.type === "receita" 
              ? parseFloat(formData.amount) 
              : -parseFloat(formData.amount);
            
            const totalBalanceChange = balanceChangePerTransaction * transactions.length;

            // Buscar saldo atual da conta
            const { data: accountData, error: accountFetchError } = await supabase
              .from('accounts')
              .select('balance')
              .eq('id', formData.account_id)
              .single();

            if (!accountFetchError && accountData) {
              const newBalance = Number(accountData.balance) + totalBalanceChange;

              await supabase
                .from('accounts')
                .update({ balance: newBalance })
                .eq('id', formData.account_id);
            }
          }

          toast({
            title: "Sucesso",
            description: formData.status === "pago"
              ? `${transactions.length} lançamentos recorrentes criados e saldo da conta atualizado com sucesso`
              : `${transactions.length} lançamentos recorrentes criados com sucesso`
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

          // Se o lançamento foi criado como "pago", atualizar o saldo da conta
          if (formData.status === "pago" && formData.account_id && !formData.temRateio) {
            const balanceChange = formData.type === "receita" 
              ? parseFloat(formData.amount) 
              : -parseFloat(formData.amount);

            // Buscar saldo atual da conta
            const { data: accountData, error: accountFetchError } = await supabase
              .from('accounts')
              .select('balance')
              .eq('id', formData.account_id)
              .single();

            if (!accountFetchError && accountData) {
              const newBalance = Number(accountData.balance) + balanceChange;

              await supabase
                .from('accounts')
                .update({ balance: newBalance })
                .eq('id', formData.account_id);
            }
          }

          toast({
            title: "Sucesso",
            description: formData.status === "pago" 
              ? "Lançamento criado e saldo da conta atualizado com sucesso" 
              : "Lançamento criado com sucesso"
          });
        }

        // Se tem rateio, criar os splits
        if (formData.temRateio && formData.rateios.length > 0) {
          // Buscar o ID da transação criada
          const { data: transactionData, error: fetchError } = await supabase
            .from('transactions')
            .select('id')
            .eq('user_id', user.id)
            .eq('description', formData.description)
            .eq('amount', parseFloat(formData.amount))
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!fetchError && transactionData) {
            // Criar os splits
            const splitsToInsert = formData.rateios.map(rateio => ({
              transaction_id: transactionData.id,
              account_id: rateio.account_id,
              amount: rateio.amount,
              percentage: rateio.percentage
            }));

            const { error: splitsError } = await supabase
              .from('transaction_splits')
              .insert(splitsToInsert);

            if (splitsError) {
              console.error('Erro ao criar splits:', splitsError);
              toast({
                title: "Aviso",
                description: "Lançamento criado, mas houve erro ao salvar o rateio",
                variant: "destructive"
              });
            }

            // Se o lançamento foi criado como "pago", atualizar saldos das contas do rateio
            if (formData.status === "pago") {
              for (const rateio of formData.rateios) {
                const balanceChange = formData.type === "receita" 
                  ? rateio.amount 
                  : -rateio.amount;

                // Buscar saldo atual da conta
                const { data: accountData, error: accountFetchError } = await supabase
                  .from('accounts')
                  .select('balance')
                  .eq('id', rateio.account_id)
                  .single();

                if (!accountFetchError && accountData) {
                  const newBalance = Number(accountData.balance) + balanceChange;

                  await supabase
                    .from('accounts')
                    .update({ balance: newBalance })
                    .eq('id', rateio.account_id);
                }
              }
            }
          }
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
      client_id: transaction.client_id || "",
      category_id: transaction.category_id || "",
      status: transaction.status,
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

  // Estados para confirmação de exclusão
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTransaction, setDeleteTransaction] = useState<Transaction | null>(null);

  const handleDeleteClick = (transaction: Transaction) => {
    setDeleteTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTransaction) return;
    
    try {
      // Primeiro excluir os splits se existirem
      const { error: splitsError } = await supabase
        .from('transaction_splits')
        .delete()
        .eq('transaction_id', deleteTransaction.id);

      if (splitsError) {
        console.error('Erro ao excluir splits:', splitsError);
      }

      // Depois excluir a transação
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', deleteTransaction.id);

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

      // Recalcular saldos após exclusão
      await recalculateAccountBalances();
      fetchTransactions();
      setIsDeleteDialogOpen(false);
      setDeleteTransaction(null);
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir lançamento",
        variant: "destructive"
      });
    }
  };

  // Estados para exclusão em lote
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const handleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions(prev => 
      prev.includes(transactionId) 
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTransactions.length === filteredTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(filteredTransactions.map(t => t.id));
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedTransactions.length > 0) {
      setIsBulkDeleteDialogOpen(true);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedTransactions.length === 0) return;
    
    try {
      // Primeiro excluir todos os splits das transações selecionadas
      const { error: splitsError } = await supabase
        .from('transaction_splits')
        .delete()
        .in('transaction_id', selectedTransactions);

      if (splitsError) {
        console.error('Erro ao excluir splits:', splitsError);
      }

      // Depois excluir as transações
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', selectedTransactions);

      if (error) {
        console.error('Erro ao excluir transações:', error);
        toast({
          title: "Erro",
          description: "Erro ao excluir lançamentos",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: `${selectedTransactions.length} lançamento(s) excluído(s) com sucesso`
      });

      // Limpar seleção e recalcular saldos
      setSelectedTransactions([]);
      await recalculateAccountBalances();
      fetchTransactions();
      setIsBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error('Erro ao excluir transações:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir lançamentos",
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
      
      // Se tem splits (rateio), pré-preencher com a primeira conta do rateio
      if (transaction.splits && transaction.splits.length > 0) {
        setPaymentAccount(transaction.splits[0].account_id);
      } else {
        setPaymentAccount(transaction.account_id || "");
      }
      
      setIsPaymentDialogOpen(true);
    } else {
      // Abrir modal de confirmação para desfazer quitação
      setUndoTransaction(transaction);
      setIsUndoDialogOpen(true);
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
      // Atualizar o status da transação
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

      // Recalcular saldos automaticamente após qualquer mudança
      await recalculateAccountBalances();
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

    // Se tem rateio, não precisa de conta específica (será distribuído automaticamente)
    // Se não tem rateio, exige conta
    if (!paymentTransaction.splits || paymentTransaction.splits.length === 0) {
      if (!paymentAccount) {
        toast({
          title: "Erro",
          description: "Selecione a conta para pagamento/recebimento",
          variant: "destructive"
        });
        return;
      }
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

  const handleUndoPayment = () => {
    if (undoTransaction) {
      updateTransactionStatus(undoTransaction.id, "pendente", null, null, null);
    }
    setIsUndoDialogOpen(false);
    setUndoTransaction(null);
  };

  const openPartialPaymentDialog = (transaction: Transaction) => {
    setPartialTransaction(transaction);
    setPartialAmount("");
    setPartialPaymentDate(new Date());
    
    // Se tem splits (rateio), inicializar valores por conta
    if (transaction.splits && transaction.splits.length > 0) {
      const initialSplitAmounts: { [accountId: string]: string } = {};
      transaction.splits.forEach(split => {
        initialSplitAmounts[split.account_id] = "";
      });
      setPartialSplitAmounts(initialSplitAmounts);
      setPartialPaymentAccount(transaction.splits[0].account_id);
    } else {
      setPartialSplitAmounts({});
      setPartialPaymentAccount(transaction.account_id || "");
    }
    
    setPartialObservations("");
    setNewDueDate(new Date());
    setIsPartialPaymentDialogOpen(true);
  };

  const handlePartialPaymentSubmit = async () => {
    if (!partialTransaction || !partialPaymentDate || !newDueDate) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Se tem splits, validar e calcular com base nos valores por conta
    let partialValue = 0;
    let paidSplits: Array<{ account_id: string; amount: number }> = [];
    
    if (partialTransaction.splits && partialTransaction.splits.length > 0) {
      // Validar se pelo menos uma conta tem valor
      const hasAnyValue = Object.values(partialSplitAmounts).some(value => value && parseFloat(value) > 0);
      if (!hasAnyValue) {
        toast({
          title: "Erro",
          description: "Informe o valor a quitar para pelo menos uma conta",
          variant: "destructive"
        });
        return;
      }
      
      // Calcular total a ser quitado e criar lista de splits pagos
      for (const [accountId, amountStr] of Object.entries(partialSplitAmounts)) {
        if (amountStr && parseFloat(amountStr) > 0) {
          const amount = parseFloat(amountStr);
          const originalSplit = partialTransaction.splits.find(s => s.account_id === accountId);
          if (originalSplit && amount > originalSplit.amount) {
            toast({
              title: "Erro",
              description: `Valor para ${getAccountName(accountId)} não pode ser maior que ${formatCurrency(originalSplit.amount)}`,
              variant: "destructive"
            });
            return;
          }
          partialValue += amount;
          paidSplits.push({ account_id: accountId, amount });
        }
      }
    } else {
      // Transação sem splits - usar valor único
      if (!partialAmount || !partialPaymentAccount) {
        toast({
          title: "Erro",
          description: "Preencha o valor e a conta para quitação",
          variant: "destructive"
        });
        return;
      }
      
      partialValue = parseFloat(partialAmount);
      if (partialValue <= 0 || partialValue >= partialTransaction.amount) {
        toast({
          title: "Erro",
          description: "Valor parcial deve ser maior que zero e menor que o valor total",
          variant: "destructive"
        });
        return;
      }
    }

    const remainingValue = partialTransaction.amount - partialValue;

    if (partialValue <= 0 || partialValue >= partialTransaction.amount) {
      toast({
        title: "Erro",
        description: "Valor parcial deve ser maior que zero e menor que o valor total",
        variant: "destructive"
      });
      return;
    }

    try {
      // 1. Marcar a transação original como paga com valor parcial
      const paymentAccountId = partialTransaction.splits && partialTransaction.splits.length > 0 
        ? null // Para splits, não definir payment_account_id específico
        : partialPaymentAccount;
        
      await updateTransactionStatus(
        partialTransaction.id,
        "pago",
        partialPaymentDate.toISOString().split('T')[0],
        `Pagamento parcial: ${formatCurrency(partialValue)}. ${partialObservations}`,
        paymentAccountId
      );

      // 2. Se tem splits, atualizar os splits originais com os valores pagos
      if (partialTransaction.splits && partialTransaction.splits.length > 0) {
        // Atualizar splits originais para refletir os valores pagos
        for (const paidSplit of paidSplits) {
          const { error: updateSplitError } = await supabase
            .from('transaction_splits')
            .update({ amount: paidSplit.amount })
            .eq('transaction_id', partialTransaction.id)
            .eq('account_id', paidSplit.account_id);
            
          if (updateSplitError) {
            console.error('Erro ao atualizar split:', updateSplitError);
          }
        }
      }

      // 3. Atualizar o valor da transação original para o valor pago
      await supabase
        .from('transactions')
        .update({ amount: partialValue })
        .eq('id', partialTransaction.id);

      // 4. Criar nova transação com valor restante apenas se houver saldo restante
      if (remainingValue > 0) {
        const newTransaction = {
          type: partialTransaction.type,
          description: `${partialTransaction.description} - Saldo restante`,
          amount: remainingValue,
          account_id: partialTransaction.splits && partialTransaction.splits.length > 0 ? null : partialTransaction.account_id,
          case_id: partialTransaction.case_id,
          client_id: partialTransaction.client_id,
          category_id: partialTransaction.category_id,
          due_date: newDueDate.toISOString().split('T')[0],
          status: "pendente" as const,
          observations: `Valor restante de quitação parcial. Valor original: ${formatCurrency(partialTransaction.amount)}`,
          is_recurring: false,
          user_id: user?.id
        };

        const { data: newTransactionData, error: insertError } = await supabase
          .from('transactions')
          .insert(newTransaction)
          .select('id')
          .single();

        if (insertError) {
          throw insertError;
        }

        // 5. Se a transação original tem rateio, criar splits para o saldo restante
        if (partialTransaction.splits && partialTransaction.splits.length > 0 && newTransactionData) {
          const splitsToInsert = partialTransaction.splits
            .map(split => {
              const paidAmount = paidSplits.find(p => p.account_id === split.account_id)?.amount || 0;
              const remainingSplitAmount = split.amount - paidAmount;
              
              if (remainingSplitAmount > 0) {
                return {
                  transaction_id: newTransactionData.id,
                  account_id: split.account_id,
                  amount: remainingSplitAmount,
                  percentage: (remainingSplitAmount / remainingValue) * 100
                };
              }
              return null;
            })
            .filter(split => split !== null);

          if (splitsToInsert.length > 0) {
            const { error: splitsError } = await supabase
              .from('transaction_splits')
              .insert(splitsToInsert);

            if (splitsError) {
              console.error('Erro ao criar splits para nova transação:', splitsError);
              throw splitsError;
            }
          }
        }
      }

      toast({
        title: "Sucesso",
        description: `Quitação parcial registrada. Nova parcela criada para ${formatCurrency(remainingValue)}`
      });

      fetchTransactions();
      setIsPartialPaymentDialogOpen(false);
      setPartialTransaction(null);
    } catch (error) {
      console.error('Erro na quitação parcial:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar quitação parcial",
        variant: "destructive"
      });
    }
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

  // Função para recalcular saldos automaticamente
  const recalculateAccountBalances = async () => {
    try {
      console.log('🔄 Recalculando saldos das contas...');
      
      // Buscar todas as transações pagas
      const { data: paidTransactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'pago');

      if (error) {
        console.error('Erro ao buscar transações pagas:', error);
        return;
      }

      // Buscar todas as contas
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user?.id);

      if (accountsError) {
        console.error('Erro ao buscar contas:', accountsError);
        return;
      }

      // Calcular saldo correto para cada conta baseado apenas nas transações pagas
      const accountBalances = new Map();

      // Inicializar todas as contas com saldo 0
      for (const account of accountsData || []) {
        accountBalances.set(account.id, 0);
      }

      // Calcular saldo baseado nas transações pagas
      for (const transaction of paidTransactions || []) {
        // Verificar se a transação tem splits - se tiver, não contabilizar pela conta principal
        const { data: transactionSplits } = await supabase
          .from('transaction_splits')
          .select('id')
          .eq('transaction_id', transaction.id)
          .limit(1);

        // Se tem splits, pular (será contabilizado pelos splits individualmente)
        if (transactionSplits && transactionSplits.length > 0) {
          continue;
        }

        // Se não tem splits, contabilizar normalmente
        const accountId = transaction.payment_account_id || transaction.account_id;
        if (!accountId) continue;

        const currentBalance = accountBalances.get(accountId) || 0;
        const transactionAmount = transaction.type === 'receita' 
          ? Number(transaction.amount) 
          : -Number(transaction.amount);
        
        accountBalances.set(accountId, currentBalance + transactionAmount);
      }

      // Buscar splits (rateios) e aplicar - ESTAS são as únicas que contam para transações com rateio
      const { data: splits, error: splitsError } = await supabase
        .from('transaction_splits')
        .select(`
          *,
          transactions!inner (
            id,
            status,
            type,
            user_id
          )
        `)
        .eq('transactions.user_id', user?.id)
        .eq('transactions.status', 'pago');

      if (!splitsError && splits) {
        for (const split of splits) {
          const currentBalance = accountBalances.get(split.account_id) || 0;
          const splitAmount = split.transactions.type === 'receita' 
            ? Number(split.amount) 
            : -Number(split.amount);
          
          accountBalances.set(split.account_id, currentBalance + splitAmount);
        }
      }

      // Atualizar os saldos das contas no banco
      for (const [accountId, correctBalance] of accountBalances) {
        const { error: updateError } = await supabase
          .from('accounts')
          .update({ balance: correctBalance })
          .eq('id', accountId);

        if (updateError) {
          console.error(`Erro ao atualizar saldo da conta ${accountId}:`, updateError);
        } else {
          console.log(`✅ Conta ${accountId} atualizada para saldo: ${correctBalance}`);
        }
      }

      console.log('✅ Recálculo de saldos concluído');
      fetchAccounts();
    } catch (error) {
      console.error('Erro no recálculo de saldos:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "",
      description: "",
      amount: "",
      account_id: "",
      case_id: "",
      client_id: "",
      category_id: "",
      status: "pendente",
      due_date: new Date(),
      is_recurring: false,
      recurrence_frequency: "",
      recurrence_count: "",
      recurrence_end_date: undefined,
      observations: "",
      temRateio: false,
      rateios: [{ id: Date.now().toString(), account_id: "", amount: 0, percentage: 100 }]
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
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Pagamento de honorários"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                  <Label htmlFor="amount">Valor *</Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder={formData.type === 'despesa' ? '-0,00' : '0,00'}
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className={formData.type === 'despesa' ? 'text-red-500 font-semibold pl-8' : ''}
                    />
                    {formData.type === 'despesa' && (
                      <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                        <span className="text-red-500 font-semibold text-sm">-</span>
                      </div>
                    )}
                  </div>
                </div>
                
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
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select value={formData.status} onValueChange={(value: "pendente" | "pago" | "atrasado") => setFormData({...formData, status: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pendente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="atrasado">Atrasado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Data de Vencimento *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.due_date ? format(formData.due_date, "dd/MM/yyyy", { locale: ptBR }) : "dd/mm/aaaa"}
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
                    <Label htmlFor="client">Contato *</Label>
                    <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um contato" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input 
                            placeholder="Buscar por nome, email ou documento..."
                            className="h-8"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                        {clients
                          .filter((client) => {
                            if (!clientSearch || clientSearch.length < 3) return true;
                            const search = clientSearch.toLowerCase();
                            return (
                              client.name.toLowerCase().includes(search) ||
                              (client.email?.toLowerCase().includes(search)) ||
                              (client.document?.toLowerCase().includes(search)) ||
                              client.id.toLowerCase().includes(search)
                            );
                          })
                          .map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex flex-col">
                              <span>{client.name}</span>
                              {client.email && <span className="text-xs text-muted-foreground">{client.email}</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account">Conta</Label>
                    <Select 
                      value={formData.account_id} 
                      onValueChange={(value) => setFormData({...formData, account_id: value})}
                      disabled={formData.temRateio}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma conta" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="p-2">
                          <Input 
                            placeholder="Buscar conta..."
                            className="h-8"
                            value={accountSearch}
                            onChange={(e) => setAccountSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                        {accounts
                          .filter((account) => {
                            if (!accountSearch || accountSearch.length < 3) return true;
                            const search = accountSearch.toLowerCase();
                            return (
                              account.name.toLowerCase().includes(search) ||
                              account.type.toLowerCase().includes(search) ||
                              account.id.toLowerCase().includes(search)
                            );
                          })
                          .map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex flex-col">
                                <span>{account.name}</span>
                                <span className="text-xs text-muted-foreground">{account.type}</span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="case">Caso/Processo</Label>
                    <Select value={formData.case_id} onValueChange={(value) => setFormData({...formData, case_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um caso" />
                      </SelectTrigger>
                      <SelectContent>
                        {cases.map((case_) => (
                          <SelectItem key={case_.id} value={case_.id}>{case_.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="category">Categoria</Label>
                    <CategoriesDialog onCategoryChange={fetchCategories} />
                  </div>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({...formData, category_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recurring"
                    checked={formData.is_recurring}
                    onCheckedChange={(checked) => setFormData({...formData, is_recurring: checked as boolean})}
                  />
                  <Label htmlFor="recurring" className="text-sm">🔄 Transação Recorrente</Label>
                </div>

                {/* Opção de Rateio */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rateio"
                      checked={formData.temRateio}
                      onCheckedChange={(checked) => {
                        console.log('Rateio checkbox changed:', checked); // Debug
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
                    <Label htmlFor="rateio" className="text-sm font-medium">🔄 Dividir entre contas (Rateio)</Label>
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
                                <div className="p-2">
                                  <Input 
                                    placeholder="Buscar conta..."
                                    className="h-6 text-xs"
                                    value={rateioAccountSearch}
                                    onChange={(e) => setRateioAccountSearch(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                  />
                                </div>
                                {accounts
                                  .filter((account) => {
                                    if (!rateioAccountSearch || rateioAccountSearch.length < 3) return true;
                                    const search = rateioAccountSearch.toLowerCase();
                                    return (
                                      account.name.toLowerCase().includes(search) ||
                                      account.type.toLowerCase().includes(search)
                                    );
                                  })
                                  .map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                      <div className="flex flex-col">
                                        <span className="text-xs">{account.name}</span>
                                        <span className="text-xs text-muted-foreground">{account.type}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
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
                            
                            <div className="space-y-1">
                              <Label className="text-xs">Valor (R$)</Label>
                              <Input
                                type="number"
                                className="h-8"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                value={rateio.amount || ""}
                                onChange={(e) => {
                                  const amount = parseFloat(e.target.value) || 0;
                                  const percentage = formData.amount ? (amount * 100 / parseFloat(formData.amount)) : 0;
                                  const newRateios = [...formData.rateios];
                                  newRateios[index] = { ...rateio, amount, percentage };
                                  setFormData({...formData, rateios: newRateios});
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <div className={`text-xs ${formData.type === 'despesa' ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                              {formatCurrency(rateio.amount, formData.type === 'despesa')}
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
                         {(() => {
                           const totalPercentage = formData.rateios.reduce((sum, r) => sum + (r.percentage || 0), 0);
                           const totalAmount = formData.rateios.reduce((sum, r) => sum + (r.amount || 0), 0);
                           const formAmount = parseFloat(formData.amount) || 0;
                           const percentageValid = Math.abs(totalPercentage - 100) <= 0.01;
                           const amountValid = Math.abs(totalAmount - formAmount) <= 0.01;
                           
                           return !percentageValid && !amountValid && (
                             <span className="text-red-500 ml-2">
                               ⚠️ O total deve ser 100% ou os valores devem somar {formatCurrency(formAmount)}
                             </span>
                           );
                         })()}
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

        {/* Tabela de Lançamentos */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Lançamentos</h3>
              {selectedTransactions.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDeleteClick}
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir {selectedTransactions.length} selecionado(s)
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 px-6">
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
            ) : (
              <div className="overflow-x-auto">
                {/* Cabeçalho da Tabela */}
                <div className="bg-muted/30 border-b px-4 py-3 grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
                  <div className="col-span-1 flex items-center">
                    <Checkbox 
                      checked={selectedTransactions.length === filteredTransactions.length && filteredTransactions.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </div>
                  <div className="col-span-2">Descrição</div>
                  <div className="col-span-2 text-center">Status</div>
                  <div className="col-span-1 text-center">Tipo</div>
                  <div className="col-span-1 text-center">Vencimento</div>
                  <div className="col-span-2 text-center">Conta</div>
                  <div className="col-span-1 text-center">Caso/Cliente</div>
                  <div className="col-span-1 text-right">Valor</div>
                  <div className="col-span-1 text-center">Ações</div>
                </div>

                {/* Linhas da Tabela */}
                <div className="divide-y divide-border">
                  {filteredTransactions.map((transaction) => {
                    const statusInfo = getStatusDisplay(transaction);
                    return (
                      <div key={transaction.id} className="px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/30 transition-colors">
                        {/* Checkbox */}
                        <div className="col-span-1 flex items-center">
                          <Checkbox 
                            checked={selectedTransactions.includes(transaction.id)}
                            onCheckedChange={() => handleSelectTransaction(transaction.id)}
                          />
                        </div>
                        {/* Descrição */}
                        <div className="col-span-2 min-w-0">
                          <div className="flex items-center gap-2">
                            {transaction.type === "receita" ? (
                              <ArrowUpCircle className="h-4 w-4 text-green-600 shrink-0" />
                            ) : (
                              <ArrowDownCircle className="h-4 w-4 text-red-600 shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm break-words leading-tight">
                                {transaction.description}
                              </p>
                              {transaction.is_recurring && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Repeat className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Recorrente</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="col-span-2 text-center">
                          <Badge className={statusInfo.className} variant="outline">
                            <span className="text-xs whitespace-nowrap">
                              {statusInfo.text}
                            </span>
                          </Badge>
                        </div>

                        {/* Tipo */}
                        <div className="col-span-1 text-center">
                          <Badge 
                            variant={transaction.type === 'receita' ? 'default' : 'secondary'}
                            className={transaction.type === 'receita' 
                              ? 'bg-green-100 text-green-700 hover:bg-green-100 text-xs' 
                              : 'text-xs'
                            }
                          >
                            {transaction.type === 'receita' ? 'Receita' : 'Despesa'}
                          </Badge>
                        </div>

                        {/* Vencimento */}
                        <div className="col-span-1 text-center">
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(transaction.due_date), "dd/MM/yy", { locale: ptBR })}
                          </span>
                        </div>

                        {/* Conta */}
                        <div className="col-span-2 text-center min-w-0">
                          <span className="text-sm text-muted-foreground break-words">
                            {getAccountName(transaction.account_id, transaction.splits)}
                          </span>
                        </div>

                        {/* Caso/Cliente */}
                        <div className="col-span-1 text-center min-w-0">
                          <div className="flex flex-col gap-1">
                            {transaction.case_id && (
                              <Badge variant="outline" className="text-xs">
                                <Building className="h-3 w-3 mr-1" />
                                <span className="truncate max-w-[100px]">
                                  {getCaseName(transaction.case_id)}
                                </span>
                              </Badge>
                            )}
                            {transaction.client_id && (
                              <span className="text-xs text-muted-foreground">
                                {getClientName(transaction.client_id)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Valor */}
                        <div className="col-span-1 text-right">
                          <div className={`text-sm font-bold ${
                            transaction.type === 'receita' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(transaction.amount, transaction.type === 'despesa')}
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="col-span-1 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(transaction)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant={transaction.status === "pendente" ? "default" : "secondary"}
                              onClick={() => toggleStatus(transaction)}
                              className="h-7 w-7 p-0"
                              title={transaction.status === "pendente" ? "Quitar" : "Desfazer quitação"}
                            >
                              <DollarSign className="h-3 w-3" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {transaction.status === "pendente" && (
                                  <DropdownMenuItem 
                                    onClick={() => openPartialPaymentDialog(transaction)}
                                  >
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    Quitação Parcial
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteClick(transaction)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
                {paymentTransaction?.splits && paymentTransaction.splits.length > 0 ? (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                    <div className="text-sm text-green-700 dark:text-green-300 font-medium mb-2">
                      ✅ Quitação Total - Rateio Automático
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      O valor será distribuído automaticamente entre as contas conforme o rateio original:
                    </div>
                    <div className="space-y-1">
                      {paymentTransaction.splits.map((split, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>• {getAccountName(split.account_id)} ({split.percentage}%)</span>
                          <span className="font-medium">{formatCurrency(split.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
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
                )}
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

        {/* Dialog de Confirmação para Desfazer Quitação */}
        <AlertDialog open={isUndoDialogOpen} onOpenChange={setIsUndoDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Desfazer {undoTransaction?.type === "receita" ? "Recebimento" : "Pagamento"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá marcar o lançamento como pendente novamente e ajustar o saldo da conta. 
                <br /><br />
                <strong>Lançamento:</strong> {undoTransaction?.description}<br />
                <strong>Valor:</strong> {formatCurrency(undoTransaction?.amount || 0)}<br />
                <strong>Conta:</strong> {getAccountName(undoTransaction?.payment_account_id || undoTransaction?.account_id)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleUndoPayment}>
                Confirmar Desfazer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Quitação Parcial */}
        <Dialog open={isPartialPaymentDialogOpen} onOpenChange={setIsPartialPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Quitação Parcial - {partialTransaction?.type === "receita" ? "Recebimento" : "Pagamento"}
              </DialogTitle>
              <DialogDescription>
                Registre um pagamento parcial. O valor restante será criado como novo lançamento.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Lançamento Original</Label>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  <strong>{partialTransaction?.description}</strong><br />
                  Valor total: {formatCurrency(partialTransaction?.amount || 0)}<br />
                  Conta: {getAccountName(partialTransaction?.account_id)}
                </div>
              </div>

              {/* Se tem splits, mostrar inputs por conta */}
              {partialTransaction?.splits && partialTransaction.splits.length > 0 ? (
                <div className="space-y-4">
                  <Label>Valores a Quitar por Conta</Label>
                  {partialTransaction.splits.map((split, index) => (
                    <div key={index} className="space-y-2 p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <Label className="font-medium">{getAccountName(split.account_id)}</Label>
                        <span className="text-sm text-muted-foreground">
                          Total: {formatCurrency(split.amount)} ({split.percentage}%)
                        </span>
                      </div>
                      <Input
                        type="number"
                        placeholder="0,00"
                        value={partialSplitAmounts[split.account_id] || ""}
                        onChange={(e) => setPartialSplitAmounts(prev => ({
                          ...prev,
                          [split.account_id]: e.target.value
                        }))}
                        max={split.amount}
                      />
                      {partialSplitAmounts[split.account_id] && (
                        <div className="text-sm text-muted-foreground">
                          Restante: {formatCurrency(split.amount - parseFloat(partialSplitAmounts[split.account_id] || "0"))}
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Resumo do total */}
                  {(() => {
                    const totalParcial = Object.values(partialSplitAmounts)
                      .filter(value => value && parseFloat(value) > 0)
                      .reduce((sum, value) => sum + parseFloat(value), 0);
                    return totalParcial > 0 && (
                      <div className="p-3 bg-muted rounded">
                        <div className="flex justify-between">
                          <span>Total a quitar:</span>
                          <span className="font-medium">{formatCurrency(totalParcial)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Valor restante:</span>
                          <span className="font-medium">{formatCurrency((partialTransaction?.amount || 0) - totalParcial)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Valor a Quitar *</Label>
                  <Input
                    type="number"
                    placeholder="0,00"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                  />
                  {partialAmount && partialTransaction && (
                    <div className="text-sm text-muted-foreground">
                      Valor restante: {formatCurrency((partialTransaction.amount || 0) - parseFloat(partialAmount || "0"))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Data do {partialTransaction?.type === "receita" ? "Recebimento" : "Pagamento"} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {partialPaymentDate ? format(partialPaymentDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={partialPaymentDate}
                      onSelect={setPartialPaymentDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Mostrar seleção de conta apenas para transações sem splits */}
              {(!partialTransaction?.splits || partialTransaction.splits.length === 0) && (
                <div className="space-y-2">
                  <Label>Conta para {partialTransaction?.type === "receita" ? "Recebimento" : "Pagamento"} *</Label>
                  <Select value={partialPaymentAccount} onValueChange={setPartialPaymentAccount}>
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
              )}

              <div className="space-y-2">
                <Label>Nova Data de Vencimento para o Saldo Restante *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newDueDate ? format(newDueDate, "PPP", { locale: ptBR }) : "Selecione a nova data de vencimento"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newDueDate}
                      onSelect={setNewDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações sobre a quitação parcial..."
                  value={partialObservations}
                  onChange={(e) => setPartialObservations(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPartialPaymentDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handlePartialPaymentSubmit}>
                  Confirmar Quitação Parcial
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação para Exclusão */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
                <br /><br />
                <strong>Descrição:</strong> {deleteTransaction?.description}<br />
                <strong>Valor:</strong> {formatCurrency(deleteTransaction?.amount || 0)}<br />
                <strong>Data de Vencimento:</strong> {deleteTransaction?.due_date ? format(new Date(deleteTransaction.due_date), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}
                {deleteTransaction?.splits && deleteTransaction.splits.length > 0 && (
                  <>
                    <br />
                    <strong>Contas do Rateio:</strong><br />
                    {deleteTransaction.splits.map((split, index) => (
                      <span key={index}>
                        • {getAccountName(split.account_id)} ({split.percentage}%) - {formatCurrency(split.amount)}<br />
                      </span>
                    ))}
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                Confirmar Exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Confirmação para Exclusão em Lote */}
        <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão em Lote</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir {selectedTransactions.length} lançamento(s) selecionado(s)? Esta ação não pode ser desfeita.
                <br /><br />
                <strong>Lançamentos a serem excluídos:</strong><br />
                {filteredTransactions
                  .filter(t => selectedTransactions.includes(t.id))
                  .slice(0, 5)
                  .map((transaction) => (
                    <div key={transaction.id}>
                      • {transaction.description} - {formatCurrency(transaction.amount)}
                    </div>
                  ))
                }
                {selectedTransactions.length > 5 && (
                  <div>... e mais {selectedTransactions.length - 5} lançamento(s)</div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                Confirmar Exclusão em Lote
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}