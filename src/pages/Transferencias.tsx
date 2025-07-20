import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowRightLeft, Edit, Trash2, DollarSign } from "lucide-react";

interface Account {
  id: string;
  name: string;
  balance: number;
  type: string;
}

interface Transfer {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string;
  created_at: string;
  from_account?: { name: string; balance: number; type: string };
  to_account?: { name: string; balance: number; type: string };
}

export default function Transferencias() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    from_account_id: "",
    to_account_id: "",
    amount: "",
    description: ""
  });

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    }
  };

  const loadTransfers = async () => {
    setLoading(true);
    try {
      // Como não temos tabela de transferências, vamos simular com transações
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts!account_id(name, balance, type),
          payment_accounts:accounts!payment_account_id(name, balance, type)
        `)
        .not('payment_account_id', 'is', null)
        .neq('account_id', 'payment_account_id')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transformar em formato de transferência
      const transfersData = (data || []).map(t => ({
        id: t.id,
        from_account_id: t.payment_account_id!,
        to_account_id: t.account_id!,
        amount: t.amount,
        description: t.description,
        created_at: t.created_at,
        from_account: t.payment_accounts,
        to_account: t.accounts
      }));

      setTransfers(transfersData);
    } catch (error: any) {
      console.error('Erro ao carregar transferências:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar transferências",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAccounts();
      loadTransfers();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const amount = parseFloat(formData.amount);
      
      if (amount <= 0) {
        throw new Error('Valor deve ser maior que zero');
      }

      if (formData.from_account_id === formData.to_account_id) {
        throw new Error('Conta de origem deve ser diferente da conta de destino');
      }

      // Verificar saldo da conta de origem
      const fromAccount = accounts.find(a => a.id === formData.from_account_id);
      if (!fromAccount || fromAccount.balance < amount) {
        throw new Error('Saldo insuficiente na conta de origem');
      }

      // Criar transação como transferência
      const { error } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          description: `Transferência: ${formData.description}`,
          amount: amount,
          type: 'despesa', // Saída da conta origem
          status: 'pago',
          due_date: new Date().toISOString().split('T')[0],
          payment_date: new Date().toISOString().split('T')[0],
          account_id: formData.to_account_id, // Conta destino
          payment_account_id: formData.from_account_id, // Conta origem
          observations: 'Transferência entre contas'
        }]);

      if (error) throw error;

      // Atualizar saldos das contas
      await Promise.all([
        // Debitar da conta origem
        supabase
          .from('accounts')
          .update({ balance: fromAccount.balance - amount })
          .eq('id', formData.from_account_id),
        // Creditar na conta destino (update manual)
        supabase
          .from('accounts')
          .select('balance')
          .eq('id', formData.to_account_id)
          .single()
          .then(({ data }) => {
            if (data) {
              supabase
                .from('accounts')
                .update({ balance: data.balance + amount })
                .eq('id', formData.to_account_id);
            }
          })
      ]);

      toast({
        title: "Sucesso",
        description: "Transferência realizada com sucesso!",
      });

      setFormData({
        from_account_id: "",
        to_account_id: "",
        amount: "",
        description: ""
      });
      setDialogOpen(false);
      loadTransfers();
      loadAccounts();

    } catch (error: any) {
      console.error('Erro ao criar transferência:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao realizar transferência",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Transferências</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Transferência
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Transferência</DialogTitle>
              <DialogDescription>
                Transfira dinheiro entre suas contas
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from_account">Conta Origem *</Label>
                  <Select 
                    value={formData.from_account_id} 
                    onValueChange={(value) => setFormData({...formData, from_account_id: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta origem" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} - R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="to_account">Conta Destino *</Label>
                  <Select 
                    value={formData.to_account_id} 
                    onValueChange={(value) => setFormData({...formData, to_account_id: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} - R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="amount">Valor *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0,00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Motivo da transferência"
                  rows={3}
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Processando..." : "Realizar Transferência"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de transferências */}
      <div className="space-y-4">
        {loading && transfers.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <ArrowRightLeft className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-foreground">Nenhuma transferência</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Comece criando sua primeira transferência.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          transfers.map((transfer) => (
            <Card key={transfer.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="financial-gradient p-2 rounded-lg">
                      <ArrowRightLeft className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{transfer.description}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{transfer.from_account?.name}</span>
                        <ArrowRightLeft className="h-3 w-3" />
                        <span>{transfer.to_account?.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transfer.created_at).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(transfer.created_at).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      R$ {transfer.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <Badge variant="secondary">Concluída</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}