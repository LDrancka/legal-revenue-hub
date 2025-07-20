import { useState, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Mail, Lock, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const { user, loading, signIn, signUp, checkInvitation } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [inviteData, setInviteData] = useState<any>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const { toast } = useToast();

  // Verificar se há um token de convite na URL
  useEffect(() => {
    const token = searchParams.get('invite');
    if (token) {
      setInviteLoading(true);
      checkInvitation(token).then(({ data, error }) => {
        if (data && !error) {
          setInviteData(data);
          toast({
            title: "Convite válido",
            description: `Você foi convidado para se cadastrar como ${data.role}`,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Convite inválido",
            description: "Este convite é inválido ou expirou",
          });
        }
        setInviteLoading(false);
      });
    }
  }, [searchParams, checkInvitation, toast]);

  // Redirect if already authenticated
  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    const { error } = await signIn(email, password);
    
    // Se falhar e for o email admin, tentar criar via edge function
    if (error && email === 'admin@jusfinance.com') {
      try {
        const response = await fetch('/api/create-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
          toast({
            title: "Admin criado com sucesso",
            description: "Tente fazer login novamente",
          });
          // Tentar login novamente
          await signIn(email, password);
        }
      } catch (createError) {
        console.error('Erro ao criar admin:', createError);
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: "Verifique suas credenciais e tente novamente",
        });
      }
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const displayName = formData.get('displayName') as string;
    
    // Usar email do convite se disponível
    const finalEmail = inviteData?.email || email;
    const inviteToken = inviteData?.token;
    
    await signUp(finalEmail, password, displayName, inviteToken);
    setIsLoading(false);
  };

  if (loading || inviteLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full financial-gradient">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">JusFinance</h1>
          <p className="text-muted-foreground mt-2">
            Sistema de gestão financeira para escritórios de advocacia
          </p>
          {inviteData && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-green-800 dark:text-green-200 text-sm">
                Você foi convidado por <strong>{inviteData.invited_by}</strong> para se cadastrar como <strong>{inviteData.role}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Auth Card */}
        <Card className="financial-card">
          <Tabs defaultValue={inviteData ? "signup" : "signin"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup" disabled={!inviteData}>
                {inviteData ? "Aceitar Convite" : "Cadastro por Convite"}
              </TabsTrigger>
            </TabsList>

            {/* Sign In Tab */}
            <TabsContent value="signin">
              <CardHeader>
                <CardTitle className="text-xl">Fazer Login</CardTitle>
                <CardDescription>
                  Entre com suas credenciais para acessar o sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-black hover:bg-black/90 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                  
                  <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-orange-800 dark:text-orange-200 text-sm mb-2">
                      <strong>Problema temporário:</strong> O CAPTCHA está ativo e impedindo logins.
                    </p>
                    <p className="text-orange-700 dark:text-orange-300 text-xs">
                      Para resolver: Acesse <a href="https://supabase.com/dashboard/project/wwqnpmkrudfxfbpvsmzr/auth/providers" target="_blank" className="underline">configurações do Supabase</a> e desabilite "Enable CAPTCHA protection" na seção "Security and protection".
                    </p>
                  </div>
                </form>
              </CardContent>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup">
              <CardHeader>
                <CardTitle className="text-xl">
                  {inviteData ? "Aceitar Convite" : "Cadastro Restrito"}
                </CardTitle>
                <CardDescription>
                  {inviteData 
                    ? "Complete seus dados para aceitar o convite"
                    : "O cadastro é feito apenas por convite"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {inviteData ? (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          name="displayName"
                          type="text"
                          placeholder="Seu nome completo"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          name="email"
                          type="email"
                          value={inviteData.email}
                          className="pl-10"
                          disabled
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          minLength={6}
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        A senha deve ter pelo menos 6 caracteres
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-black hover:bg-black/90 text-white"
                      disabled={isLoading}
                    >
                      {isLoading ? "Criando conta..." : "Aceitar Convite"}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      O cadastro no sistema é restrito e feito apenas por convite.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Entre em contato com um administrador para solicitar acesso.
                    </p>
                  </div>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>© 2024 JusFinance. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;