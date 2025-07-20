import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecurringTransaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: string;
  account_id: string;
  case_id?: string;
  category_id?: string;
  due_date: string;
  recurrence_frequency: string;
  recurrence_end_date?: string;
  recurrence_count?: number;
  status: string;
  observations?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    console.log(`Processing recurring transactions for ${todayString}`);

    // Buscar transações recorrentes que devem ser processadas hoje
    const { data: recurringTransactions, error: fetchError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('is_recurring', true)
      .lte('due_date', todayString)
      .or(`recurrence_end_date.is.null,recurrence_end_date.gte.${todayString}`);

    if (fetchError) {
      console.error('Error fetching recurring transactions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${recurringTransactions?.length || 0} recurring transactions to process`);

    const processedTransactions = [];

    for (const transaction of recurringTransactions || []) {
      try {
        const originalDueDate = new Date(transaction.due_date);
        let nextDueDate = new Date(originalDueDate);

        // Calcular próxima data baseada na frequência
        switch (transaction.recurrence_frequency) {
          case 'daily':
            nextDueDate.setDate(nextDueDate.getDate() + 1);
            break;
          case 'weekly':
            nextDueDate.setDate(nextDueDate.getDate() + 7);
            break;
          case 'monthly':
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            break;
          case 'yearly':
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            break;
          default:
            console.log(`Unknown frequency: ${transaction.recurrence_frequency}`);
            continue;
        }

        // Verificar se ainda deve gerar (por data fim ou contagem)
        if (transaction.recurrence_end_date && nextDueDate > new Date(transaction.recurrence_end_date)) {
          console.log(`Recurring transaction ${transaction.id} has reached end date`);
          
          // Marcar como não recorrente se chegou ao fim
          await supabaseClient
            .from('transactions')
            .update({ is_recurring: false })
            .eq('id', transaction.id);
          
          continue;
        }

        if (transaction.recurrence_count && transaction.recurrence_count <= 1) {
          console.log(`Recurring transaction ${transaction.id} has reached max count`);
          
          // Marcar como não recorrente se chegou ao fim
          await supabaseClient
            .from('transactions')
            .update({ is_recurring: false })
            .eq('id', transaction.id);
          
          continue;
        }

        // Criar nova transação
        const newTransaction = {
          user_id: transaction.user_id,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          account_id: transaction.account_id,
          case_id: transaction.case_id,
          category_id: transaction.category_id,
          due_date: nextDueDate.toISOString().split('T')[0],
          status: 'pendente',
          observations: transaction.observations,
          is_recurring: transaction.is_recurring,
          recurrence_frequency: transaction.recurrence_frequency,
          recurrence_end_date: transaction.recurrence_end_date,
          recurrence_count: transaction.recurrence_count ? transaction.recurrence_count - 1 : null,
          recurrence_original_id: transaction.recurrence_original_id || transaction.id
        };

        const { data: newTransactionData, error: insertError } = await supabaseClient
          .from('transactions')
          .insert([newTransaction])
          .select()
          .single();

        if (insertError) {
          console.error(`Error creating recurring transaction for ${transaction.id}:`, insertError);
          continue;
        }

        // Atualizar a transação original para a próxima ocorrência
        await supabaseClient
          .from('transactions')
          .update({ 
            due_date: nextDueDate.toISOString().split('T')[0],
            recurrence_count: transaction.recurrence_count ? transaction.recurrence_count - 1 : null
          })
          .eq('id', transaction.id);

        processedTransactions.push(newTransactionData);
        console.log(`Created recurring transaction ${newTransactionData.id} from ${transaction.id}`);

      } catch (error) {
        console.error(`Error processing recurring transaction ${transaction.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${processedTransactions.length} recurring transactions`,
        transactions: processedTransactions
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error) {
    console.error("Error in process-recurring-transactions function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);