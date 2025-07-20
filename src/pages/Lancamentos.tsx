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

const mockContas = [
  "Conta Corrente Principal",
  "Conta Poupança",
  "Carteira Digital"
];

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
    observacoes: ""
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

    const newLancamento = {
      id: editingLancamento ? editingLancamento.id : lancamentos.length + 1,
      ...formData,
      valor: parseFloat(formData.valor),
      status: "pendente"
    };

    if (editingLancamento) {
      setLancamentos(lancamentos.map(l => l.id === editingLancamento.id ? newLancamento : l));
      toast({
        title: "Sucesso",
        description: "Lançamento atualizado com sucesso"
      });
    } else {
      setLancamentos([...lancamentos, newLancamento]);
      toast({
        title: "Sucesso",
        description: "Lançamento criado com sucesso"
      });
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
      observacoes: ""
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
      observacoes: lancamento.observacoes || ""
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
            observacoesPagamento: paymentObservations 
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
              <Button className="financial-gradient hover:opacity-90 transition-opacity">
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
                  <Button type="submit" className="financial-gradient">
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
                  className="financial-gradient"
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