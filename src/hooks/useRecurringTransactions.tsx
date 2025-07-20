import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useRecurringTransactions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const processRecurringTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-recurring-transactions');
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: `${data.transactions?.length || 0} transações recorrentes processadas`,
      });
      
      return data;
    } catch (error: any) {
      console.error('Erro ao processar transações recorrentes:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar transações recorrentes",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Auto-executar uma vez por dia se necessário
  useEffect(() => {
    const lastProcessed = localStorage.getItem('lastRecurringProcessed');
    const today = new Date().toDateString();
    
    if (lastProcessed !== today) {
      // Processar automaticamente se não foi processado hoje
      processRecurringTransactions().then(() => {
        localStorage.setItem('lastRecurringProcessed', today);
      }).catch(() => {
        // Ignorar erro automático
      });
    }
  }, []);

  return {
    processRecurringTransactions,
    loading
  };
};