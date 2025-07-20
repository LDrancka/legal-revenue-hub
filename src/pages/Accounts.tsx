import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2, Wallet, CreditCard, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Account {
  id: string;
  name: string;
  type: "bank" | "cash" | "investment";
  balance: number;
  description?: string;
}

const Accounts = () => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>(() => {
    // Carregar contas do localStorage
    try {
      const savedAccounts = localStorage.getItem('accounts');
      if (savedAccounts) {
        return JSON.parse(savedAccounts);
      }
    } catch (error) {
      console.log('Erro ao carregar contas:', error);
    }
    
    // Contas padrão se não houver no localStorage
    return [
      {
        id: "1",
        name: "Conta Corrente Principal",
        type: "bank",
        balance: 125000.00,
        description: "Conta corrente para movimentação diária"
      },
      {
        id: "2",
        name: "Caixa Escritório",
        type: "cash",
        balance: 2500.00,
        description: "Dinheiro em espécie no escritório"
      },
      {
        id: "3",
        name: "Conta Poupança",
        type: "investment",
        balance: 50000.00,
        description: "Reserva de emergência"
      }
    ];
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "bank" as Account["type"],
    balance: "",
    description: ""
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getAccountIcon = (type: Account["type"]) => {
    switch (type) {
      case "bank":
        return <Building2 className="h-5 w-5" />;
      case "cash":
        return <Wallet className="h-5 w-5" />;
      case "investment":
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getAccountTypeLabel = (type: Account["type"]) => {
    switch (type) {
      case "bank":
        return "Conta Bancária";
      case "cash":
        return "Dinheiro";
      case "investment":
        return "Investimento";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const accountData = {
      ...formData,
      balance: parseFloat(formData.balance) || 0,
      id: editingAccount?.id || Math.random().toString(36).substr(2, 9)
    };

    if (editingAccount) {
      const updatedAccounts = accounts.map(acc => 
        acc.id === editingAccount.id ? accountData : acc
      );
      setAccounts(updatedAccounts);
      localStorage.setItem('accounts', JSON.stringify(updatedAccounts));
      toast({
        title: "Conta atualizada",
        description: "A conta foi atualizada com sucesso."
      });
    } else {
      const newAccounts = [...accounts, accountData];
      setAccounts(newAccounts);
      localStorage.setItem('accounts', JSON.stringify(newAccounts));
      toast({
        title: "Conta criada",
        description: "Nova conta foi criada com sucesso."
      });
    }

    resetForm();
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance.toString(),
      description: account.description || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (accountId: string) => {
    const updatedAccounts = accounts.filter(acc => acc.id !== accountId);
    setAccounts(updatedAccounts);
    localStorage.setItem('accounts', JSON.stringify(updatedAccounts));
    toast({
      title: "Conta excluída",
      description: "A conta foi excluída com sucesso."
    });
  };

  const resetForm = () => {
    setFormData({ name: "", type: "bank", balance: "", description: "" });
    setEditingAccount(null);
    setIsDialogOpen(false);
  };

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contas e Caixas</h1>
            <p className="text-muted-foreground">Gerencie suas contas bancárias e caixas</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? "Editar Conta" : "Nova Conta"}
                </DialogTitle>
                <DialogDescription>
                  {editingAccount ? "Edite os dados da conta" : "Adicione uma nova conta ou caixa"}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Conta</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Conta Corrente Principal"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={formData.type} onValueChange={(value: Account["type"]) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Conta Bancária</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="investment">Investimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="balance">Saldo Inicial</Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição da conta"
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingAccount ? "Atualizar" : "Criar"} Conta
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Resumo Total */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Total Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-financial-green">
              {formatCurrency(totalBalance)}
            </div>
          </CardContent>
        </Card>

        {/* Lista de Contas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className="financial-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getAccountIcon(account.type)}
                    <CardTitle className="text-lg">{account.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(account)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(account.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Badge variant="secondary">
                  {getAccountTypeLabel(account.type)}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-financial-green">
                    {formatCurrency(account.balance)}
                  </div>
                  {account.description && (
                    <p className="text-sm text-muted-foreground">
                      {account.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {accounts.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Nenhuma conta cadastrada. Clique em "Nova Conta" para começar.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Accounts;