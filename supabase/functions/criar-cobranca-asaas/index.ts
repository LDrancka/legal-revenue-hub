import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const ASAAS_API_KEY = "$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjlmNzc4YWMyLWE3MmQtNGQyMy1iODNhLTIwMDA4ZWM4ZDI0Nzo6JGFhY2hfN2EyZDAxM2QtNmE5ZS00OTA0LTlhNGMtN2RjZDNkNDQxMWQx";
const ASAAS_BASE_URL = "https://sandbox.asaas.com/api/v3";

interface CreateChargeRequest {
  descricao: string;
  valor: number;
  vencimento: string;
  contatoNome: string;
  contatoEmail?: string;
  contatoCpfCnpj?: string;
}

interface AsaasCustomer {
  id: string;
  name: string;
  email?: string;
  cpfCnpj?: string;
}

interface AsaasPayment {
  id: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  status: string;
}

const headers = {
  "Content-Type": "application/json",
  "access_token": ASAAS_API_KEY,
};

async function criarOuObterCliente(
  nome: string,
  email?: string,
  cpfCnpj?: string
): Promise<AsaasCustomer> {
  try {
    // Primeiro, tenta buscar cliente existente por email ou CPF/CNPJ
    if (email || cpfCnpj) {
      const searchParams = new URLSearchParams();
      if (email) searchParams.append("email", email);
      if (cpfCnpj) searchParams.append("cpfCnpj", cpfCnpj);

      const searchResponse = await fetch(
        `${ASAAS_BASE_URL}/customers?${searchParams.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.data && searchData.data.length > 0) {
          return searchData.data[0];
        }
      }
    }

    // Se não encontrou, cria um novo cliente
    const customerData: any = {
      name: nome,
    };

    if (email) customerData.email = email;
    if (cpfCnpj) customerData.cpfCnpj = cpfCnpj;

    const createResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: "POST",
      headers,
      body: JSON.stringify(customerData),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(`Erro ao criar cliente: ${JSON.stringify(errorData)}`);
    }

    return await createResponse.json();
  } catch (error) {
    console.error("Erro ao criar/obter cliente:", error);
    throw error;
  }
}

async function criarCobranca(
  customerId: string,
  descricao: string,
  valor: number,
  vencimento: string
): Promise<AsaasPayment> {
  try {
    const paymentData = {
      customer: customerId,
      billingType: "BOLETO",
      description: descricao,
      value: valor,
      dueDate: vencimento,
    };

    const response = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao criar cobrança: ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao criar cobrança:", error);
    throw error;
  }
}

export async function criarCobrancaAsaas({
  descricao,
  valor,
  vencimento,
  contatoNome,
  contatoEmail,
  contatoCpfCnpj,
}: CreateChargeRequest) {
  try {
    // 1. Criar ou obter cliente
    const cliente = await criarOuObterCliente(
      contatoNome,
      contatoEmail,
      contatoCpfCnpj
    );

    // 2. Criar cobrança
    const cobranca = await criarCobranca(
      cliente.id,
      descricao,
      valor,
      vencimento
    );

    // 3. Retornar informações
    const linkPagamento = cobranca.invoiceUrl || cobranca.bankSlipUrl || "";

    return {
      sucesso: true,
      mensagem: `Cobrança criada com sucesso para ${contatoNome}`,
      cobrancaId: cobranca.id,
      linkPagamento,
      clienteId: cliente.id,
    };
  } catch (error) {
    console.error("Erro geral na criação da cobrança:", error);
    return {
      sucesso: false,
      mensagem: `Erro ao criar cobrança: ${error.message}`,
      cobrancaId: null,
      linkPagamento: null,
    };
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { 
          status: 405,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const body = await req.json();
    const resultado = await criarCobrancaAsaas(body);

    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Erro na edge function:", error);
    return new Response(
      JSON.stringify({ 
        sucesso: false,
        mensagem: `Erro interno: ${error.message}` 
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});