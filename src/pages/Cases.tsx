import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  FolderOpen, 
  Calendar,
  DollarSign,
  FileText
} from "lucide-react";

interface Case {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const Cases = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "ativo"
  });

  const statusOptions = [
    { value: "ativo", label: "Ativo", color: "bg-green-500" },
    { value: "concluido", label: "Concluído", color: "bg-blue-500" },
    { value: "suspenso", label: "Suspenso", color: "bg-yellow-500" },
    { value: "cancelado", label: "Cancelado", color: "bg-red-500" }
  ];

  const fetchCases = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('cases')
        .select('*')
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCases();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingCase) {
        const { error } = await supabase
          .from('cases')
          .update({
            name: formData.name,
            description: formData.description || null,
            status: formData.status
          })
          .eq('id', editingCase.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Caso atualizado com sucesso!"
        });
      } else {
        const { error } = await supabase
          .from('cases')
          .insert({
            user_id: user.id,
            name: formData.name,
            description: formData.description || null,
            status: formData.status
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Caso criado com sucesso!"
        });
      }

      setIsDialogOpen(false);
      setEditingCase(null);
      setFormData({ name: "", description: "", status: "ativo" });
      fetchCases();
    } catch (error: any) {
      console.error('Erro ao salvar caso:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao salvar caso"
      });
    }
  };

  const handleEdit = (caseItem: Case) => {
    setEditingCase(caseItem);
    setFormData({
      name: caseItem.name,
      description: caseItem.description || "",
      status: caseItem.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este caso? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Caso deletado com sucesso!"
      });
      fetchCases();
    } catch (error: any) {
      console.error('Erro ao deletar caso:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao deletar caso"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption || { value: status, label: status, color: "bg-gray-500" };
  };

  const filteredCases = cases.filter(caseItem => {
    const matchesSearch = caseItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (caseItem.description && caseItem.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || caseItem.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Casos</h1>
            <p className="text-muted-foreground">Gerencie seus casos e processos</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  setEditingCase(null);
                  setFormData({ name: "", description: "", status: "ativo" });
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Novo Caso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCase ? "Editar Caso" : "Novo Caso"}
                </DialogTitle>
                <DialogDescription>
                  {editingCase ? "Atualize as informações do caso" : "Crie um novo caso para organizar seus lançamentos"}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Caso *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Processo Trabalhista João Silva"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva detalhes sobre o caso..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button type="submit">
                    {editingCase ? "Atualizar" : "Criar"} Caso
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar casos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Casos */}
        <div className="grid gap-4">
          {filteredCases.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {searchTerm || statusFilter !== "all" ? "Nenhum caso encontrado" : "Nenhum caso cadastrado"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== "all" 
                      ? "Tente ajustar os filtros de busca"
                      : "Comece criando seu primeiro caso para organizar seus lançamentos"
                    }
                  </p>
                  {(!searchTerm && statusFilter === "all") && (
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Caso
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredCases.map((caseItem) => {
              const statusBadge = getStatusBadge(caseItem.status);
              return (
                <Card key={caseItem.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <FileText className="h-5 w-5" />
                          {caseItem.name}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge className={`${statusBadge.color} text-white`}>
                            {statusBadge.label}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(caseItem.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(caseItem)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(caseItem.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {caseItem.description && (
                    <CardContent>
                      <CardDescription className="text-sm">
                        {caseItem.description}
                      </CardDescription>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Cases;