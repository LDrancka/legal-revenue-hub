import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  isAdmin: () => boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, displayName?: string, inviteToken?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  checkInvitation: (token: string) => Promise<{ data: any; error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();

  // Função para buscar role do usuário
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Erro ao buscar role:', error);
        return null;
      }
      
      return data?.role || null;
    } catch (error) {
      console.error('Erro ao buscar role:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Buscar role do usuário após delay para evitar problemas de timing
          setTimeout(async () => {
            const role = await fetchUserRole(session.user.id);
            setUserRole(role);
          }, 100);
        } else {
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
        }, 100);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        let message = 'Erro ao fazer login';
        if (error.message.includes('Invalid login credentials')) {
          message = 'Email ou senha incorretos';
        } else if (error.message.includes('Email not confirmed')) {
          message = 'Email não confirmado. Verifique sua caixa de entrada';
        }
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: message,
        });
      } else {
        toast({
          title: "Login realizado",
          description: "Bem-vindo ao sistema!",
        });
      }
      
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, displayName?: string, inviteToken?: string) => {
    try {
      // Se há token de convite, verificar se é válido
      if (inviteToken) {
        const { data: invitation, error: inviteError } = await supabase
          .from('invitations')
          .select('*')
          .eq('token', inviteToken)
          .eq('email', email)
          .gt('expires_at', new Date().toISOString())
          .is('used_at', null)
          .single();

        if (inviteError || !invitation) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Convite inválido ou expirado",
          });
          return { error: { message: 'Convite inválido' } };
        }
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName,
          },
        },
      });
      
      if (error) {
        let message = 'Erro ao criar conta';
        if (error.message.includes('User already registered')) {
          message = 'Este email já está cadastrado. Tente fazer login';
        } else if (error.message.includes('Password should be at least')) {
          message = 'A senha deve ter pelo menos 6 caracteres';
        } else if (error.message.includes('Invalid email')) {
          message = 'Email inválido';
        } else if (error.message.includes('Usuário deve ter um convite válido')) {
          message = 'É necessário um convite válido para se cadastrar';
        }
        toast({
          variant: "destructive",
          title: "Erro no cadastro",
          description: message,
        });
      } else {
        toast({
          title: "Conta criada",
          description: "Verifique seu email para confirmar a conta.",
        });
      }
      
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    }
  };

  // Função para verificar se o usuário é admin
  const isAdmin = () => userRole === 'admin';

  // Função para verificar convite
  const checkInvitation = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .single();

      return { data, error };
    } catch (error: any) {
      return { data: null, error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        userRole,
        isAdmin,
        signIn,
        signUp,
        signOut,
        checkInvitation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};