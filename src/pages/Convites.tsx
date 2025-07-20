import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Copy, Mail, Calendar, User, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";

interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'user';
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  invited_by: string;
}

const Convites = () => {
  const { user, loading, isAdmin } = useAuth();
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(true);

  // Verificar se o usuário é admin
  if (!loading && (!user || !isAdmin())) {
    return <Navigate to="/" replace />;
  }

  // Buscar convites existentes
  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar convites:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar convites",
        });
      } else {
        setInvitations(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar convites:', error);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin()) {
      fetchInvitations();
    }
  }, [user, isAdmin]);

  // Criar novo convite
  const handleCreateInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const role = formData.get('role') as 'admin' | 'user';

    try {
      const { error } = await supabase
        .from('invitations')
        .insert({
          email,
          role,
          invited_by: user?.id || '',
        });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao criar convite",
          description: error.message,
        });
      } else {
        toast({
          title: "Convite criado",
          description: `Convite enviado para ${email}`,
        });
        // Limpar formulário
        (e.target as HTMLFormElement).reset();
        // Recarregar lista
        fetchInvitations();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro inesperado",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Copiar link do convite
  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado",
      description: "Link do convite copiado para a área de transferência",
    });
  };

  // Deletar convite
  const deleteInvitation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao deletar convite",
        });
      } else {
        toast({
          title: "Convite deletado",
          description: "Convite removido com sucesso",
        });
        fetchInvitations();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro inesperado",
      });
    }
  };

  // Formatação de data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  // Verificar se convite expirou
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading || loadingInvites) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Convites</h1>
          <p className="text-muted-foreground">
            Convide novos usuários para acessar o sistema
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Formulário de Novo Convite */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Novo Convite
              </CardTitle>
              <CardDescription>
                Envie um convite para um novo usuário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Tipo de Usuário</Label>
                  <Select name="role" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Criando..." : "Criar Convite"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lista de Convites */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Convites Enviados
              </CardTitle>
              <CardDescription>
                Gerencie os convites existentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum convite encontrado
                </p>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{invitation.email}</span>
                          <Badge variant={invitation.role === 'admin' ? 'default' : 'secondary'}>
                            {invitation.role === 'admin' ? 'Admin' : 'Usuário'}
                          </Badge>
                          {invitation.used_at && (
                            <Badge variant="outline" className="text-green-600">
                              Usado
                            </Badge>
                          )}
                          {!invitation.used_at && isExpired(invitation.expires_at) && (
                            <Badge variant="destructive">
                              Expirado
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Criado: {formatDate(invitation.created_at)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expira: {formatDate(invitation.expires_at)}
                          </div>
                          {invitation.used_at && (
                            <div className="flex items-center gap-1 text-green-600">
                              <User className="h-3 w-3" />
                              Usado: {formatDate(invitation.used_at)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!invitation.used_at && !isExpired(invitation.expires_at) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyInviteLink(invitation.token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteInvitation(invitation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Convites;