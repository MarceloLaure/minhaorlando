const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const SYSTEM_PROMPT_BASE = `Você é a Pixie, guia pessoal inteligente da viagem em família para Orlando.

Personalidade:
- Brasileira, calorosa, prática e DIRETA. Pessoa real falando com amigo na fila do parque.
- Use 0-2 emojis quando combinar.
- Português brasileiro por padrão.
- Se o usuário pedir em inglês, responda em inglês natural.

Missão:
- Aja como guia LOCAL de Orlando: conhece parques, filas, restaurantes, shows, eventos, compras, praias e deslocamentos.
- Monte decisões por fluxo: onde a família está agora, pra onde vale ir depois, quando comer, o que fica perto, o que evitar.
- Considere altura/restrições dos membros, clima, horário atual, itinerário, filas reais e locais salvos no app.

Como responder:
- Perguntas simples: 3-6 linhas. Curto.
- Roteiros de parque: blocos curtos por horário (ex: "11:30 / Atração X / fila 25min").
- Restaurante: área/local, tipo, por que encaixa, se é bom pra criança, dica prática.
- Endereço/mapa: pode citar "Abrir no Maps: https://www.google.com/maps/search/?api=1&query=..."

REGRAS DE CITAÇÃO (importante):
- Você é a CURADORA, não uma máquina de citação. Sintetize e dá a resposta sua.
- Se usar busca web pra puxar dado fresco, NÃO cite os links no corpo da resposta.
  Sem "(tripadvisor.com)", sem "[fonte]", sem "segundo X".
- O usuário tá no parque, lendo rápido. Quer a resposta, não as fontes.
- Exceção: se o usuário PEDIR EXPLICITAMENTE "me dá a fonte" ou "qual o link", aí dá.

Segurança:
- Não invente preço, horário, show, endereço específico ou item de cardápio como se fosse atual sem contexto.
- Se o contexto do app tiver dados reais, priorize o contexto.
- Se algo for dúvida, fala "verifica no app oficial" em vez de inventar.`;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function cleanMessages(messages: ChatMessage[]) {
  return messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant" || m.role === "system") && typeof m.content === "string")
    .slice(-24)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }));
}

function extractOutputText(data: any) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const chunks: string[] = [];
  for (const item of data?.output || []) {
    if (item?.type !== "message") continue;
    for (const part of item?.content || []) {
      if (typeof part?.text === "string") chunks.push(part.text);
    }
  }
  return chunks.join("\n").trim();
}

function extractSources(data: any) {
  const seen = new Set<string>();
  const sources: Array<{ title?: string; url: string }> = [];
  const scan = (value: any) => {
    if (!value) return;
    if (Array.isArray(value)) return value.forEach(scan);
    if (typeof value !== "object") return;
    if (value.type === "url_citation" && value.url && !seen.has(value.url)) {
      seen.add(value.url);
      sources.push({ title: value.title, url: value.url });
    }
    for (const key of Object.keys(value)) scan(value[key]);
  };
  scan(data?.output);
  scan(data?.sources);
  return sources.slice(0, 8);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json(500, { error: "OPENAI_API_KEY not configured" });

  let body: { messages?: ChatMessage[]; context?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return json(400, { error: "messages required" });
  }

  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4.1";
  const context = typeof body.context === "string" ? body.context.slice(0, 40000) : "";
  const messages = cleanMessages(body.messages);
  const input = [
    {
      role: "system",
      content: context ? `CONTEXTO ATUAL DO APP:\n${context}` : "Sem contexto adicional do app.",
    },
    ...messages,
  ];

  const payload = {
    model,
    instructions: SYSTEM_PROMPT_BASE,
    input,
    tools: [
      {
        type: "web_search",
        user_location: {
          type: "approximate",
          country: "US",
          city: "Orlando",
          region: "Florida",
          timezone: "America/New_York",
        },
      },
    ],
    tool_choice: "auto",
    max_output_tokens: 900,
    include: ["web_search_call.action.sources"],
  };

  let openaiRes = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!openaiRes.ok) {
    // Fallback: se a conta/modelo ainda não tiver web_search, mantém a Pixie funcionando sem busca.
    const firstError = await openaiRes.text();
    const fallbackPayload = { ...payload, tools: undefined, tool_choice: undefined, include: undefined };
    openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fallbackPayload),
    });
    if (!openaiRes.ok) {
      const secondError = await openaiRes.text();
      return json(502, {
        error: "OpenAI error",
        status: openaiRes.status,
        detail: secondError.slice(0, 500),
        first_error: firstError.slice(0, 300),
      });
    }
  }

  const data = await openaiRes.json();
  const message = extractOutputText(data);
  if (!message) return json(502, { error: "Empty response", raw: data });

  return json(200, {
    message,
    sources: extractSources(data),
    model,
    usage: data.usage,
  });
});
