import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { User, Mail, Lock, Save, UserCircle, Building } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface OfficeSettings {
  id: string;
  user_id: string;
  owner_name: string | null;
  owner_document: string | null;
  document_type: 'cpf' | 'cnpj' | null;
  city: string | null;
  created_at: string;
  updated_at: string;
}

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [officeSettings, setOfficeSettings] = useState<OfficeSettings | null>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [emailData, setEmailData] = useState({
    newEmail: user?.email || ""
  });
  const [profileData, setProfileData] = useState({
    displayName: "",
    avatarUrl: ""
  });
  const [officeData, setOfficeData] = useState({
    ownerName: "",
    ownerDocument: "",
    documentType: "cpf" as "cpf" | "cnpj",
    city: ""
  });

  // Buscar perfil do usuário
  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao carregar perfil do usuário"
        });
      } else if (data) {
        setProfile(data);
        setProfileData({
          displayName: data.display_name || "",
          avatarUrl: data.avatar_url || ""
        });
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Buscar configurações do escritório
  const fetchOfficeSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('office_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar configurações do escritório:', error);
      } else if (data) {
        setOfficeSettings(data as OfficeSettings);
        setOfficeData({
          ownerName: data.owner_name || "",
          ownerDocument: data.owner_document || "",
          documentType: (data.document_type as "cpf" | "cnpj") || "cpf",
          city: data.city || ""
        });
      }
    } catch (error) {
      console.error('Erro ao buscar configurações do escritório:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchOfficeSettings();
    }
  }, [user]);

  // Atualizar perfil
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profileData.displayName || null,
          avatar_url: profileData.avatarUrl || null,
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });

      fetchProfile();
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar perfil.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Atualizar dados do escritório
  const handleOfficeUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (officeSettings) {
        // Atualizar dados existentes
        const { error } = await supabase
          .from('office_settings')
          .update({
            owner_name: officeData.ownerName || null,
            owner_document: officeData.ownerDocument || null,
            document_type: officeData.documentType,
            city: officeData.city || null,
          })
          .eq('user_id', user?.id);

        if (error) throw error;
      } else {
        // Criar novos dados
        const { error } = await supabase
          .from('office_settings')
          .insert({
            user_id: user?.id || '',
            owner_name: officeData.ownerName || null,
            owner_document: officeData.ownerDocument || null,
            document_type: officeData.documentType,
            city: officeData.city || null,
          });

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Dados do escritório atualizados com sucesso!",
      });

      fetchOfficeSettings();
    } catch (error: any) {
      console.error('Erro ao atualizar dados do escritório:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar dados do escritório.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso!",
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar senha.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailData.newEmail) {
      toast({
        title: "Erro",
        description: "Por favor, insira um e-mail válido.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: emailData.newEmail
      });

      if (error) throw error;

      toast({
        title: "Confirmação necessária",
        description: "Verifique sua caixa de entrada e clique no link de confirmação para ativar o novo e-mail. Até lá, continue usando o e-mail atual para fazer login.",
      });
    } catch (error: any) {
      console.error("Erro ao alterar e-mail:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar e-mail.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingProfile) {
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e preferências da conta.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Perfil do Usuário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Perfil do Usuário
              </CardTitle>
              <CardDescription>
                Atualize suas informações de perfil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nome de exibição</Label>
                  <Input
                    id="displayName"
                    value={profileData.displayName}
                    onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                    placeholder="Seu nome de exibição"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatarUrl">URL do Avatar</Label>
                  <Input
                    id="avatarUrl"
                    value={profileData.avatarUrl}
                    onChange={(e) => setProfileData({ ...profileData, avatarUrl: e.target.value })}
                    placeholder="https://exemplo.com/avatar.jpg"
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {isLoading ? "Salvando..." : "Salvar Perfil"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Informações da Conta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações da Conta
              </CardTitle>
              <CardDescription>
                Suas informações básicas de conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>E-mail atual</Label>
                <Input value={user?.email || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Nome de exibição</Label>
                <Input value={profile?.display_name || "Não definido"} disabled />
              </div>
              <div className="space-y-2">
                <Label>Data de criação</Label>
                <Input 
                  value={profile?.created_at ? new Date(profile.created_at).toLocaleString('pt-BR') : "N/A"} 
                  disabled 
                />
              </div>
            </CardContent>
          </Card>

          {/* Alterar E-mail */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Alterar E-mail
              </CardTitle>
              <CardDescription>
                Altere o e-mail associado à sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newEmail">Novo e-mail</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={emailData.newEmail}
                    onChange={(e) => setEmailData({ newEmail: e.target.value })}
                    placeholder="seu@email.com"
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {isLoading ? "Alterando..." : "Alterar E-mail"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Alterar Senha */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Altere a senha da sua conta para manter sua segurança.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Digite sua nova senha"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirme sua nova senha"
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {isLoading ? "Alterando..." : "Alterar Senha"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Dados para Recibos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Dados para Recibos
              </CardTitle>
              <CardDescription>
                Configure as informações do escritório que aparecerão nos recibos gerados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOfficeUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Nome do Responsável/Razão Social</Label>
                  <Input
                    id="ownerName"
                    value={officeData.ownerName}
                    onChange={(e) => setOfficeData({ ...officeData, ownerName: e.target.value })}
                    placeholder="Nome completo ou razão social do escritório"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documentType">Tipo de Documento</Label>
                  <Select 
                    value={officeData.documentType} 
                    onValueChange={(value: "cpf" | "cnpj") => setOfficeData({ ...officeData, documentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de documento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                 <div className="space-y-2">
                   <Label htmlFor="ownerDocument">
                     {officeData.documentType === 'cpf' ? 'CPF' : 'CNPJ'}
                   </Label>
                   <Input
                     id="ownerDocument"
                     value={officeData.ownerDocument}
                     onChange={(e) => setOfficeData({ ...officeData, ownerDocument: e.target.value })}
                     placeholder={officeData.documentType === 'cpf' ? 'XXX.XXX.XXX-XX' : 'XX.XXX.XXX/XXXX-XX'}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="city">Cidade</Label>
                   <Input
                     id="city"
                     value={officeData.city}
                     onChange={(e) => setOfficeData({ ...officeData, city: e.target.value })}
                     placeholder="Digite a cidade do escritório"
                   />
                 </div>
                <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {isLoading ? "Salvando..." : "Salvar Dados do Escritório"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;