import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Building
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

// Mock data
const mockLancamentos = [
  {
    id: 1,
    tipo: "receita",
    descricao: "Honorários - Caso Silva vs. Santos",
    valor: 5000.00,
    conta: "Conta Corrente Principal",
    caso: "Caso #001 - Silva vs. Santos",
    vencimento: new Date("2024-01-15"),
    status: "pendente",
    recorrente: false
  },
  {
    id: 2,
    tipo: "despesa",
    descricao: "Custas processuais",
    valor: 350.00,
    conta: "Conta Corrente Principal",
    caso: "Caso #002 - Oliveira & Cia",
    vencimento: new Date("2024-01-20"),
    status: "pago",
    recorrente: false
  },
  {
    id: 3,
    tipo: "receita",
    descricao: "Consultoria jurídica - Mensal",
    valor: 2500.00,
    conta: "Conta Corrente Principal",
    caso: "Caso #003 - Empresa XYZ",
    vencimento: new Date("2024-02-01"),
    status: "pendente",
    recorrente: true
  }
];

// Função para buscar contas do localStorage (integração com página Accounts)
const getAccountsFromStorage = () => {
  try {
    const accounts = localStorage.getItem('accounts');
    if (accounts) {
      const parsedAccounts = JSON.parse(accounts);
      return parsedAccounts.map((acc: any) => acc.name);
    }
  } catch (error) {
    console.log('Erro ao carregar contas do localStorage:', error);
  }
  return [
    "Conta Corrente Principal",
    "Conta Poupança", 
    "Carteira Digital"
  ];
};

const mockContas = getAccountsFromStorage();

const mockCasos = [
  "Caso #001 - Silva vs. Santos",
  "Caso #002 - Oliveira & Cia",
  "Caso #003 - Empresa XYZ",
  "Caso #004 - Consultoria Geral"
];

export default function Lancamentos() {
  const [lancamentos, setLancamentos] = useState(mockLancamentos);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTipo, setSelectedTipo] = useState<string>("todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState<any>(null);
  const [paymentLancamento, setPaymentLancamento] = useState<any>(null);
  const [paymentDate, setPaymentDate] = useState<Date>();
  const [paymentObservations, setPaymentObservations] = useState("");
  const [paymentAccount, setPaymentAccount] = useState("");
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    tipo: "",
    descricao: "",
    valor: "",
    conta: "",
    caso: "",
    vencimento: new Date(),
    recorrente: false,
    frequencia: "",
    repeticoes: "",
    dataFinal: undefined as Date | undefined,
    observacoes: "",
    rateios: [] as Array<{id: string, descricao: string, percentual: number}>
  });

  const filteredLancamentos = lancamentos.filter((lancamento) => {
    const matchesSearch = lancamento.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lancamento.caso.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = selectedTipo === "todos" || lancamento.tipo === selectedTipo;
    const matchesStatus = selectedStatus === "todos" || lancamento.status === selectedStatus;
    
    return matchesSearch && matchesTipo && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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

  // Função para gerar lançamentos recorrentes
  const generateRecurringLancamentos = (baseData: any) => {
    const generatedLancamentos = [];
    const startDate = new Date(baseData.vencimento);
    const repetitions = parseInt(baseData.repeticoes) || 1;
    
    for (let i = 0; i < repetitions; i++) {
      const lancamentoDate = new Date(startDate);
      
      switch (baseData.frequencia) {
        case 'mensal':
          lancamentoDate.setMonth(startDate.getMonth() + i);
          break;
        case 'bimestral':
          lancamentoDate.setMonth(startDate.getMonth() + (i * 2));
          break;
        case 'trimestral':
          lancamentoDate.setMonth(startDate.getMonth() + (i * 3));
          break;
        case 'semestral':
          lancamentoDate.setMonth(startDate.getMonth() + (i * 6));
          break;
        case 'anual':
          lancamentoDate.setFullYear(startDate.getFullYear() + i);
          break;
      }
      
      generatedLancamentos.push({
        id: lancamentos.length + generatedLancamentos.length + 1,
        ...baseData,
        vencimento: lancamentoDate,
        descricao: `${baseData.descricao} (${i + 1}/${repetitions})`,
        status: "pendente",
        recorrente: true,
        recorrenciaOriginal: i === 0 // Marca o primeiro como original
      });
    }
    
    return generatedLancamentos;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tipo || !formData.descricao || !formData.valor || !formData.conta) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios: Tipo, Descrição, Valor e Conta",
        variant: "destructive"
      });
      return;
    }

    if (formData.recorrente && (!formData.frequencia || !formData.repeticoes)) {
      toast({
        title: "Erro",
        description: "Para lançamentos recorrentes, preencha a frequência e número de repetições",
        variant: "destructive"
      });
      return;
    }

    if (editingLancamento) {
      const updatedLancamento = {
        ...editingLancamento,
        ...formData,
        valor: parseFloat(formData.valor)
      };
      setLancamentos(lancamentos.map(l => l.id === editingLancamento.id ? updatedLancamento : l));
      toast({
        title: "Sucesso",
        description: "Lançamento atualizado com sucesso"
      });
    } else {
      if (formData.recorrente) {
        // Gerar múltiplos lançamentos para recorrência
        const newLancamentos = generateRecurringLancamentos({
          ...formData,
          valor: parseFloat(formData.valor)
        });
        setLancamentos([...lancamentos, ...newLancamentos]);
        toast({
          title: "Sucesso",
          description: `${newLancamentos.length} lançamentos recorrentes criados com sucesso`
        });
      } else {
        // Lançamento único
        const newLancamento = {
          id: lancamentos.length + 1,
          ...formData,
          valor: parseFloat(formData.valor),
          status: "pendente",
          recorrente: false
        };
        setLancamentos([...lancamentos, newLancamento]);
        toast({
          title: "Sucesso",
          description: "Lançamento criado com sucesso"
        });
      }
    }

    // Reset form
    setFormData({
      tipo: "",
      descricao: "",
      valor: "",
      conta: "",
      caso: "",
      vencimento: new Date(),
      recorrente: false,
      frequencia: "",
      repeticoes: "",
      dataFinal: undefined,
      observacoes: "",
      rateios: []
    });
    setEditingLancamento(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (lancamento: any) => {
    setEditingLancamento(lancamento);
    setFormData({
      tipo: lancamento.tipo,
      descricao: lancamento.descricao,
      valor: lancamento.valor.toString(),
      conta: lancamento.conta,
      caso: lancamento.caso,
      vencimento: lancamento.vencimento,
      recorrente: lancamento.recorrente,
      frequencia: lancamento.frequencia || "",
      repeticoes: lancamento.repeticoes || "",
      dataFinal: lancamento.dataFinal,
      observacoes: lancamento.observacoes || "",
      rateios: lancamento.rateios || []
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setLancamentos(lancamentos.filter(l => l.id !== id));
    toast({
      title: "Sucesso",
      description: "Lançamento excluído com sucesso"
    });
  };

  const toggleStatus = (lancamento: any) => {
    if (lancamento.status === "pendente") {
      // Abrir modal para registrar pagamento
      setPaymentLancamento(lancamento);
      setPaymentDate(new Date());
      setPaymentObservations("");
      setPaymentAccount(lancamento.conta); // Pre-selecionar a conta original
      setIsPaymentDialogOpen(true);
    } else {
      // Marcar como pendente novamente
      setLancamentos(lancamentos.map(l => 
        l.id === lancamento.id 
          ? { ...l, status: "pendente", dataPagamento: undefined, observacoesPagamento: undefined }
          : l
      ));
      toast({
        title: "Status atualizado",
        description: "Lançamento marcado como pendente"
      });
    }
  };

  const handlePaymentSubmit = () => {
    if (!paymentDate) {
      toast({
        title: "Erro",
        description: "Selecione a data do pagamento/recebimento",
        variant: "destructive"
      });
      return;
    }

    setLancamentos(lancamentos.map(l => 
      l.id === paymentLancamento.id 
        ? { 
            ...l, 
            status: "pago", 
            dataPagamento: paymentDate,
            observacoesPagamento: paymentObservations,
            contaPagamento: paymentAccount 
          }
        : l
    ));

    toast({
      title: "Sucesso",
      description: `${paymentLancamento.tipo === "receita" ? "Recebimento" : "Pagamento"} registrado com sucesso`
    });

    setIsPaymentDialogOpen(false);
    setPaymentLancamento(null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Lançamentos</h1>
            <p className="text-muted-foreground">Gerencie receitas e despesas</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingLancamento ? "Editar Lançamento" : "Novo Lançamento"}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados do lançamento financeiro
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo *</Label>
                    <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
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
                    <Label htmlFor="valor">Valor *</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.valor}
                      onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Input
                    id="descricao"
                    placeholder="Descrição do lançamento"
                    value={formData.descricao}
                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="conta">Conta *</Label>
                    <Select value={formData.conta} onValueChange={(value) => setFormData({...formData, conta: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockContas.map((conta) => (
                          <SelectItem key={conta} value={conta}>{conta}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="caso">Caso/Centro de Custo</Label>
                    <Select value={formData.caso} onValueChange={(value) => setFormData({...formData, caso: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o caso" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockCasos.map((caso) => (
                          <SelectItem key={caso} value={caso}>{caso}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                          {formData.vencimento ? format(formData.vencimento, "PPP", { locale: ptBR }) : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.vencimento}
                          onSelect={(date) => date && setFormData({...formData, vencimento: date})}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Configurações</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="recorrente"
                        checked={formData.recorrente}
                        onCheckedChange={(checked) => setFormData({...formData, recorrente: checked as boolean})}
                      />
                      <Label htmlFor="recorrente" className="text-sm">Lançamento recorrente</Label>
                    </div>
                    
                    {/* Campos condicionais para lançamento recorrente */}
                    {formData.recorrente && (
                      <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-3">
                        <h4 className="font-medium text-sm">Configurações de Recorrência</h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="frequencia" className="text-xs">Frequência</Label>
                            <Select 
                              value={formData.frequencia} 
                              onValueChange={(value) => {
                                setFormData({...formData, frequencia: value});
                                // Auto-calcular data final se já tem repetições
                                if (formData.repeticoes) {
                                  const endDate = calculateEndDate(formData.vencimento, value, parseInt(formData.repeticoes));
                                  setFormData(prev => ({...prev, frequencia: value, dataFinal: endDate}));
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
                            <Label htmlFor="repeticoes" className="text-xs">Repetições</Label>
                            <Input
                              id="repeticoes"
                              type="number"
                              placeholder="Ex: 12"
                              className="h-8"
                              min="1"
                              value={formData.repeticoes}
                              onChange={(e) => {
                                const repetitions = e.target.value;
                                setFormData({...formData, repeticoes: repetitions});
                                // Auto-calcular data final se já tem frequência
                                if (formData.frequencia && repetitions) {
                                  const endDate = calculateEndDate(formData.vencimento, formData.frequencia, parseInt(repetitions));
                                  setFormData(prev => ({...prev, repeticoes: repetitions, dataFinal: endDate}));
                                }
                              }}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="dataFim" className="text-xs">Data final (calculada automaticamente)</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal h-8 text-xs"
                              >
                                <CalendarIcon className="mr-2 h-3 w-3" />
                                {formData.dataFinal ? format(formData.dataFinal, "PPP", { locale: ptBR }) : "Calculada automaticamente"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={formData.dataFinal}
                                onSelect={(date) => setFormData({...formData, dataFinal: date})}
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
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Observações adicionais..."
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingLancamento(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {editingLancamento ? "Atualizar" : "Criar"} Lançamento
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
                    placeholder="Buscar por descrição ou caso..."
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

        {/* Sistema de Rateios */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sistema de Rateios</CardTitle>
            <CardDescription>Configure rateios padrão para novos lançamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Rateios (opcional)</Label>
              <div className="border rounded-lg p-3 bg-muted/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground">Distribua o valor entre diferentes centros de custo</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newRateio = {
                        id: Math.random().toString(36).substr(2, 9),
                        descricao: "",
                        percentual: 0
                      };
                      setFormData({...formData, rateios: [...formData.rateios, newRateio]});
                    }}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar Rateio
                  </Button>
                </div>
                
                {formData.rateios.map((rateio, index) => (
                  <div key={rateio.id} className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-6">
                      <Input
                        placeholder="Descrição do rateio"
                        value={rateio.descricao}
                        onChange={(e) => {
                          const newRateios = [...formData.rateios];
                          newRateios[index].descricao = e.target.value;
                          setFormData({...formData, rateios: newRateios});
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="number"
                        placeholder="% (0-100)"
                        value={rateio.percentual || ""}
                        onChange={(e) => {
                          const newRateios = [...formData.rateios];
                          newRateios[index].percentual = parseFloat(e.target.value) || 0;
                          setFormData({...formData, rateios: newRateios});
                        }}
                        className="h-8 text-xs"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newRateios = formData.rateios.filter(r => r.id !== rateio.id);
                          setFormData({...formData, rateios: newRateios});
                        }}
                        className="h-8 w-full p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {formData.rateios.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Total: {formData.rateios.reduce((sum, r) => sum + (r.percentual || 0), 0).toFixed(2)}%
                    {formData.rateios.reduce((sum, r) => sum + (r.percentual || 0), 0) !== 100 && (
                      <span className="text-orange-600 ml-2">⚠️ Total deve ser 100%</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Lançamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lançamentos Registrados</CardTitle>
            <CardDescription>
              {filteredLancamentos.length} lançamento(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Caso</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLancamentos.map((lancamento) => (
                  <TableRow key={lancamento.id}>
                    <TableCell>
                      <div className="flex items-center">
                        {lancamento.tipo === "receita" ? (
                          <ArrowUpCircle className="h-4 w-4 mr-2 text-green-500" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 mr-2 text-red-500" />
                        )}
                        <span className="capitalize">{lancamento.tipo}</span>
                        {lancamento.recorrente && (
                          <Repeat className="h-3 w-3 ml-1 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{lancamento.descricao}</div>
                        <div className="text-sm text-muted-foreground">{lancamento.conta}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(lancamento.valor)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Building className="h-3 w-3 mr-1 text-muted-foreground" />
                        <span className="text-sm">{lancamento.caso}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(lancamento.vencimento, "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={lancamento.status === "pendente" ? "secondary" : "default"}
                          className={lancamento.status === "pago" ? "bg-green-100 text-green-800" : ""}
                        >
                          {lancamento.status === "pendente" ? "Pendente" : "Pago/Recebido"}
                        </Badge>
                        {lancamento.status === "pendente" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleStatus(lancamento)}
                            className="text-xs px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                          >
                            {lancamento.tipo === "receita" ? "Registrar Recebimento" : "Registrar Pagamento"}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleStatus(lancamento)}
                            className="text-xs px-2 py-1"
                          >
                            Marcar como Pendente
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(lancamento)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(lancamento.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredLancamentos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum lançamento encontrado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Registrar Pagamento/Recebimento */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {paymentLancamento?.tipo === "receita" ? "Registrar Recebimento" : "Registrar Pagamento"}
              </DialogTitle>
              <DialogDescription>
                Registre a data e observações do {paymentLancamento?.tipo === "receita" ? "recebimento" : "pagamento"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{paymentLancamento?.descricao}</p>
                <p className="text-sm text-muted-foreground">
                  Valor: {paymentLancamento && formatCurrency(paymentLancamento.valor)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Conta original: {paymentLancamento?.conta}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Conta para {paymentLancamento?.tipo === "receita" ? "Recebimento" : "Pagamento"} *</Label>
                <Select value={paymentAccount} onValueChange={setPaymentAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockContas.map((conta) => (
                      <SelectItem key={conta} value={conta}>{conta}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data do {paymentLancamento?.tipo === "receita" ? "Recebimento" : "Pagamento"} *</Label>
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
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-obs">Observações</Label>
                <Textarea
                  id="payment-obs"
                  placeholder="Observações sobre o pagamento/recebimento..."
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
                <Button 
                  onClick={handlePaymentSubmit}
                  variant="default" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Confirmar {paymentLancamento?.tipo === "receita" ? "Recebimento" : "Pagamento"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}