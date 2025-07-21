import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Users, Edit, Trash2, Phone, Mail, MapPin, User, Search } from "lucide-react";

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string;
  address?: string;
  notes?: string;
  status: 'ativo' | 'inativo';
  created_at: string;
}

export default function Contatos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    document: "",
    address: "",
    notes: "",
    status: "ativo" as "ativo" | "inativo"
  });

  const loadClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setClients((data || []).map(client => ({
        ...client,
        status: client.status as 'ativo' | 'inativo'
      })));
    } catch (error: any) {
      console.error('Erro ao carregar contatos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar contatos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadClients();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      if (editingId) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update({
            ...formData,
            user_id: user.id
          })
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Contato atualizado!" });
      } else {
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert({
            ...formData,
            user_id: user.id
          });

        if (error) throw error;
        toast({ title: "Sucesso", description: "Contato criado!" });
      }

      resetForm();
      loadClients(); // Reload data
    } catch (error: any) {
      console.error('Erro ao salvar contato:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar contato",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client: Client) => {
    setFormData({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      document: client.document || "",
      address: client.address || "",
      notes: client.notes || "",
      status: client.status
    });
    setEditingId(client.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contato?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Contato excluído!" });
      loadClients(); // Reload data
    } catch (error: any) {
      console.error('Erro ao excluir contato:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir contato",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      document: "",
      address: "",
      notes: "",
      status: "ativo"
    });
    setEditingId(null);
    setDialogOpen(false);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm) ||
    client.document?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Contatos</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Contato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Contato" : "Novo Contato"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Atualize as informações do contato" : "Adicione um novo contato ao sistema"}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Nome do contato"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="document">CPF/CNPJ</Label>
                  <Input
                    id="document"
                    value={formData.document}
                    onChange={(e) => setFormData({...formData, document: e.target.value})}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="contato@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Endereço completo"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as "ativo" | "inativo"})}
                  className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Observações sobre o contato"
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : editingId ? "Atualizar" : "Criar"} Contato
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar contatos por nome, email, telefone ou documento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && clients.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>
        ) : filteredClients.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-6">
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-foreground">
                  {searchTerm ? "Nenhum contato encontrado" : "Nenhum contato cadastrado"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchTerm ? "Tente ajustar os termos de busca." : "Comece criando seu primeiro contato."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="financial-gradient p-2 rounded-lg">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <Badge variant={client.status === 'ativo' ? 'default' : 'secondary'}>
                        {client.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(client)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(client.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {client.email && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.document && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span className="font-mono">{client.document}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
                {client.notes && (
                  <div className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                    <p className="line-clamp-2">{client.notes}</p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Criado em {new Date(client.created_at).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}